// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./interfaces/IDigitalaxRewards.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "hardhat/console.sol";
import "./interfaces/UniswapV2Library.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IWETH9.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";


/**
 * @title Digitalax Staking
 * @dev Stake MONA tokens, earn MONA on the Digitalax platform
 * @author DIGITALAX CORE TEAM
 */


contract DigitalaxMonaStaking is Initializable, BaseRelayRecipient  {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public monaToken; // MONA ERC20s
    address public lpToken; // LP ERC20s
    address public usdtToken; // USDT ERC20 in pair

    uint256 constant SECONDS_IN_A_DAY = 86400;
    DigitalaxAccessControls public accessControls;
    IDigitalaxRewards public rewardsContract;

    /**
    @notice Struct to track what user is staking which tokens
    @dev balance is the current ether balance of the staker
    @dev lastRewardPoints is the amount of rewards (revenue) that were accumulated at the last checkpoint
    @dev rewardsReleased is how much reward has been paid to the staker - revenue sharing
    @dev isEarlyRewardsStaker is whether this staker qualifies as an early bird for extra bonus
    @dev earlyRewardsEarned the amount of early rewards earned so far by staker
    @dev earlyRewardsReleased is the amount of early rewards that have been released to the staker
    @dev monaMintingRewardsEarned the amount of mona minted rewards earned so far by staker
    @dev earlyRewardsReleased is the amount of mona minted rewardsthat have been released to the staker
    @dev ethDepositRewardsEarned the amount of ETH rewards earned so far by staker
    @dev ethDepositRewardsReleased is the amount of ETH rewards that have been released to the staker
    */
    struct Staker {
        uint256 balance;
        uint256 lpBalance;
        uint256 lastRewardPoints;
        uint256 lastBonusRewardPoints;
        mapping (address => uint256) lastTokenRewardPoints;

        uint256 lastRewardUpdateTime;

        uint256 monaRevenueRewardsPending;
        uint256 bonusMonaRevenueRewardsPending;
        mapping (address => uint256) tokenRevenueRewardsPending;

        uint256 monaRevenueRewardsReleased;
        uint256 bonusMonaRevenueRewardsReleased;
        mapping (address => uint256) tokenRevenueRewardsReleased;

        bool isEarlyRewardsStaker;
    }

    mapping (address => Staker) public stakers;

    uint256 public stakedMonaTotalForPool;
    uint256 public stakedLPTotalForPool;

    uint256 public earlyStakedMonaTotalForPool;
    uint256 public earlyStakedLPTotalForPool;

    uint256 public lastUpdateTime;
    uint256 public rewardsPerTokenPoints;
    uint256 public bonusRewardsPerTokenPoints;
    mapping (address => uint256) public tokenRewardsPerTokenPoints;

    uint256 public currentNumberOfStakersInPool;
    uint256 public maximumNumberOfStakersInPool;

    uint256 public maximumNumberOfEarlyRewardsUsers;
    uint256 public currentNumberOfEarlyRewardsUsers;

    uint256 constant pointMultiplier = 10e32;

    /*
     * @notice sets the token to be claimable or not, cannot claim if it set to false
     */
    bool public tokensClaimable;

    /* ========== Events ========== */
    event UpdateAccessControls(
        address indexed accessControls
    );
    /*
     * @notice event emitted when a pool is initialized
     */
    event PoolInitialized(
        uint256 _maximumNumberOfStakersInPool,
        uint256 _maximumNumberOfEarlyRewardsUsers);

    /*
     * @notice event emitted when a user has staked a token
     */
    event Staked(address indexed owner, uint256 amount);
    /*
     * @notice event emitted when a user has staked a token
     */
    event StakedLP(address indexed owner, uint256 amount);

    /*
     * @notice event emitted when a user has unstaked a token
     */
    event Unstaked(address indexed owner, uint256 amount);
    /*
     * @notice event emitted when a user has unstaked a token
     */
    event UnstakedLP(address indexed owner, uint256 amount);

    /*
     * @notice event emitted when a user claims reward
     */
    event MonaRevenueRewardPaid(address indexed user, uint256 reward);
    event TokenRevenueRewardPaid(address indexed token, address indexed user, uint256 reward);

    event ClaimableStatusUpdated(bool status);
    event EmergencyUnstake(address indexed user, uint256 amount);
    event EmergencyUnstakeLP(address indexed user, uint256 amount);
    event MonaTokenUpdated(address indexed oldMonaToken, address newMonaToken);
    event UsdtTokenUpdated(address indexed oldUsdtToken, address newUsdtToken);
    event LPTokenUpdated(address indexed oldLPToken, address newLPToken);
    event RewardsTokenUpdated(address indexed oldRewardsToken, address newRewardsToken );

    event ReclaimedERC20(address indexed token, uint256 amount);

    function initialize(address _monaToken, address _lpToken, address _usdtToken, DigitalaxAccessControls _accessControls, address _trustedForwarder)  public initializer {
        require(_monaToken != address(0), "DigitalaxMonaStaking: Invalid Mona Token");
        require(address(_accessControls) != address(0), "DigitalaxMonaStaking: Invalid Access Controls");
        monaToken = _monaToken;
        lpToken = _lpToken;
        usdtToken = _usdtToken;
        accessControls = _accessControls;
        trustedForwarder = _trustedForwarder;
        tokensClaimable = true;
    }

    receive() external payable {
        require(
            _msgSender() == address(rewardsContract),
            "DigitalaxMonaStaking.receive: Sender must be rewards contract"
        );
    }


    function setTrustedForwarder(address _trustedForwarder) external  {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.setTrustedForwarder: Sender must be admin"
            );
        trustedForwarder = _trustedForwarder;
    }

    // This is to support Native meta transactions
    // never use msg.sender directly, use _msgSender() instead
    function _msgSender()
    internal
    view
    returns (address payable sender)
    {
        return BaseRelayRecipient.msgSender();
    }

    /**
       * Override this function.
       * This version is to keep track of BaseRelayRecipient you are using
       * in your contract.
       */
    function versionRecipient() external view override returns (string memory) {
        return "1";
    }


    /*
     * @notice Lets admin set the Rewards Token
     */
    function setRewardsContract(
        address _addr
    )
    external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.setRewardsContract: Sender must be admin"
        );
        require(_addr != address(0));
        address oldAddr = address(rewardsContract);
        rewardsContract = IDigitalaxRewards(_addr);
        emit RewardsTokenUpdated(oldAddr, _addr);
    }

     /**
     * @dev Single gateway to intialize the staking contract pools after deploying
     * @dev Sets the contract with the MONA token
     */
    function initMonaStakingPool(
        uint256 _maximumNumberOfStakersInPool,
        uint256 _maximumNumberOfEarlyRewardsUsers)
        external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.initMonaStakingPool: Sender must be admin"
        );

        currentNumberOfStakersInPool = 0;
        currentNumberOfEarlyRewardsUsers = 0;
        maximumNumberOfStakersInPool = _maximumNumberOfStakersInPool;
        maximumNumberOfEarlyRewardsUsers = _maximumNumberOfEarlyRewardsUsers;
        lastUpdateTime = _getNow();

        // Emit event with this pools id index, and increment the number of staking pools that exist
        emit PoolInitialized(_maximumNumberOfStakersInPool, _maximumNumberOfEarlyRewardsUsers);

    }

    /*
     * @notice Lets admin set the Mona Token
     */
    function setMonaToken(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.setMonaToken: Sender must be admin"
        );
        require(_addr != address(0), "DigitalaxMonaStaking.setMonaToken: Invalid Mona Token");
        address oldAddr = monaToken;
        monaToken = _addr;
        emit MonaTokenUpdated(oldAddr, _addr);
    }

    /*
     * @notice Lets admin set the Mona Token
     */
    function setUsdtToken(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.setMonaToken: Sender must be admin"
        );
        require(_addr != address(0), "DigitalaxMonaStaking.setMonaToken: Invalid Mona Token");
        address oldAddr = usdtToken;
        usdtToken = _addr;
        emit UsdtTokenUpdated(oldAddr, _addr);
    }
    /*
     * @notice Lets admin set the Mona Token
     */
    function setLPToken(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.setMonaToken: Sender must be admin"
        );
        require(_addr != address(0), "DigitalaxMonaStaking.setMonaToken: Invalid Mona Token");
        address oldAddr = lpToken;
        lpToken = _addr;
        emit LPTokenUpdated(oldAddr, _addr);
    }

    /*
     * @notice Lets admin set when tokens are claimable
     */
    function setTokensClaimable(
        bool _enabled
    )
        external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.setTokensClaimable: Sender must be admin"
        );
        tokensClaimable = _enabled;
        emit ClaimableStatusUpdated(_enabled);
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "DigitalaxMonaStaking.updateAccessControls: Zero Address");
        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }

    /* @notice Getter functions for Staking contract
    *  @dev Get the tokens staked by a user
    */
    // TODO ORACLE
    function getStakedUserValue(
        address _user
        )
        public
        view
        returns (uint256 balance)
        {
         return stakers[_user].balance.add(monaValue(stakers[_user].lpBalance));
    }

    /* @notice Getter functions for Staking contract
     *  @dev Get the tokens staked by a user
     */
    function getStakedBalance(
        address _user
    )
        external
        view
        returns (uint256 balance)
    {
        return stakers[_user].balance;
    }

    /* @notice Getter functions for Staking contract
     *  @dev Get the tokens staked by a user
     */
    function getStakedLPBalance(
        address _user
    )
        external
        view
        returns (uint256 balance)
    {
        return stakers[_user].lpBalance;
    }

    /* @notice Getter functions for Staking contract
     *  @dev Get the tokens staked by a user
     */
    function getStaker(
        address _user
    )
        external
        view
        returns (uint256 balance, uint256 lpBalance, uint256 lastRewardPoints, uint256 lastBonusRewardPoints, uint256 lastRewardUpdateTime, uint256 monaRevenueRewardsPending,uint256 bonusMonaRevenueRewardsPending, uint256 monaRevenueRewardsReleased, bool isEarlyRewardsStaker)
    {
        Staker storage staker = stakers[_user];
        return (staker.balance,
            staker.lpBalance,
            staker.lastRewardPoints,
            staker.lastBonusRewardPoints,
            staker.lastRewardUpdateTime,
            staker.monaRevenueRewardsPending,
            staker.bonusMonaRevenueRewardsPending,
            staker.monaRevenueRewardsReleased,
            staker.isEarlyRewardsStaker);
    }

    /* @notice Getter functions for Staking contract
     *  @dev Get the tokens staked by a user
     */
    function getTokenRewardsPerTokenPoints(
        address _token
    )
        external
        view
        returns (uint256 _tokenRewardsPerTokenPoints)
    {
        return tokenRewardsPerTokenPoints[_token];
    }

    /* @notice Getter functions for Staking contract
     *  @dev Get the tokens staked by a user
     */
    function getLastTokenRewardsPoints(
        address _user,
        address _token
    )
        external
        view
        returns (uint256 _lastTokenRewardsPoints
        )
    {
        Staker storage staker = stakers[_user];
        return staker.lastTokenRewardPoints[_token];
    }

    /*
     * @dev Get the total Value staked
     */
    function stakedValueTotalForPool()
        external
        view
        returns (uint256)
    {
        return _stakedValueTotalForPool();
    }

    /*
     * @dev Get the total early value staked
     */
    function earlyStakedValueTotalForPool()
        external
        view
        returns (uint256)
    {
        return _earlyStakedValueTotalForPool();
    }
    /*
    //TODO ORACLE
     * @dev Get the total ETH staked
     */
    function _stakedValueTotalForPool()
        internal
        view
        returns (uint256)
    {
        return stakedMonaTotalForPool.add(monaValue(stakedLPTotalForPool));
    }

    /*
     * @dev Get the total value staked
     //TODO ORACLE
     */
    function _earlyStakedValueTotalForPool()
        internal
        view
        returns (uint256)
    {
        return earlyStakedMonaTotalForPool.add(monaValue(earlyStakedLPTotalForPool));
    }


    /*
     * @notice Stake MONA Tokens and earn rewards.
     */
    function stake(
        uint256 _amount
    )
        external
    {
        _stake(_msgSender(), _amount, false);
    }

    /*
     * @notice Stake MONA Tokens and earn rewards.
     */
    function stakeLP(
        uint256 _amount
    )
        external
    {
        _stake(_msgSender(), _amount, true);
    }

    /*
     * @notice Stake All MONA Tokens in your wallet and earn rewards.
     */
    function stakeAll()
        external
    {
        uint256 balance = IERC20(monaToken).balanceOf(_msgSender());
        _stake(_msgSender(), balance, false);
    }

    /*
     * @notice Stake All MONA Tokens in your wallet and earn rewards.
     */
    function stakeAllLP()
        external
    {
        uint256 balance = IERC20(lpToken).balanceOf(_msgSender());
        _stake(_msgSender(), balance, true);
    }

    /**
     * @dev All the staking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they stake the nfts based on ether price
    */
    function _stake(
        address _user,
        uint256 _amount,
        bool _isLPToken
    )
        internal
    {
    // TODO Add lp token here
        require(
            _amount > 0 ,
            "DigitalaxMonaStaking._stake: Staked amount must be greater than 0"
        );

        Staker storage staker = stakers[_user];

        // Check if a new user
        if(staker.lastRewardUpdateTime == 0 && staker.balance == 0 && staker.lpBalance == 0) {
            require(
                currentNumberOfStakersInPool < maximumNumberOfStakersInPool,
                "DigitalaxMonaStaking._stake: This pool is already full"
            );
            currentNumberOfStakersInPool = currentNumberOfStakersInPool.add(1);

            // Check if an early staker
            if(currentNumberOfEarlyRewardsUsers < maximumNumberOfEarlyRewardsUsers){
                currentNumberOfEarlyRewardsUsers = currentNumberOfEarlyRewardsUsers.add(1);
                staker.isEarlyRewardsStaker = true;
            } else {
                staker.isEarlyRewardsStaker = false;
            }
        }

        if(staker.balance == 0 && staker.lpBalance == 0) {
            if (staker.lastRewardPoints == 0 ) {
              staker.lastRewardPoints = rewardsPerTokenPoints;
            }
            if(staker.isEarlyRewardsStaker && (staker.lastBonusRewardPoints == 0)){
              staker.lastBonusRewardPoints = bonusRewardsPerTokenPoints;
            }
        }

        updateReward(_user);
        if(!_isLPToken){
            staker.balance = staker.balance.add(_amount);
            stakedMonaTotalForPool = stakedMonaTotalForPool.add(_amount);

            if(staker.isEarlyRewardsStaker){
                earlyStakedMonaTotalForPool = earlyStakedMonaTotalForPool.add(_amount);
            }

             require(IERC20(monaToken).allowance(_user, address(this)) >= _amount, "ERC20 allowance not approved");

            IERC20(monaToken).safeTransferFrom(
                address(_user),
                address(this),
                _amount
                );
            emit Staked(_user, _amount);
        } else {
            staker.lpBalance = staker.lpBalance.add(_amount);
            stakedLPTotalForPool = stakedLPTotalForPool.add(_amount);

            if(staker.isEarlyRewardsStaker){
                earlyStakedLPTotalForPool = earlyStakedLPTotalForPool.add(_amount);
            }

             require(IERC20(lpToken).allowance(_user, address(this)) >= _amount, "ERC20 allowance not approved");

            IERC20(lpToken).safeTransferFrom(
                address(_user),
                address(this),
                _amount
                );
            emit StakedLP(_user, _amount);
        }
    }

    /*
     * @notice Unstake MONA Tokens.
     */
    function unstake(
        uint256 _amount
    )
        external
    {

        _claimReward(_msgSender());
        _unstake(_msgSender(), _amount, false);
    }

    /*
     * @notice Unstake LP Tokens.
     */
    function unstakeLP(
        uint256 _amount,
        bool _isLPToken
    )
        external
    {

        _claimReward(_msgSender());
        _unstake(_msgSender(), _amount, true);
    }

     /**
     * @dev All the unstaking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they unstake the nfts based on ether price
    */
    function _unstake(
        address _user,
        uint256 _amount,
        bool _isLPToken
    )
        internal
    {
    // TODO Set up lp logics
        Staker storage staker = stakers[_user];
        if(!_isLPToken){
            require(
                staker.balance >= _amount,
                "DigitalaxMonaStaking._unstake: Sender must have staked tokens"
            );

            staker.balance = staker.balance.sub(_amount);
            stakedMonaTotalForPool = stakedMonaTotalForPool.sub(_amount);

            if(staker.isEarlyRewardsStaker && _amount <= earlyStakedMonaTotalForPool){
                earlyStakedMonaTotalForPool = earlyStakedMonaTotalForPool.sub(_amount);
            }

            uint256 tokenBal = IERC20(monaToken).balanceOf(address(this));
            if (_amount > tokenBal) {
                IERC20(monaToken).safeTransfer(address(_user), tokenBal);
            } else {
                IERC20(monaToken).safeTransfer(address(_user), _amount);
            }
            emit Unstaked(_user, _amount);

        } else {
            require(
                staker.lpBalance >= _amount,
                "DigitalaxMonaStaking._unstake: Sender must have staked tokens"
            );

            staker.lpBalance = staker.lpBalance.sub(_amount);
            stakedLPTotalForPool = stakedMonaTotalForPool.sub(_amount);

            if(staker.isEarlyRewardsStaker && _amount <= earlyStakedLPTotalForPool){
                earlyStakedLPTotalForPool = earlyStakedLPTotalForPool.sub(_amount);
            }


            uint256 tokenBal = IERC20(lpToken).balanceOf(address(this));
            if (_amount > tokenBal) {
                IERC20(lpToken).safeTransfer(address(_user), tokenBal);
            } else {
                IERC20(lpToken).safeTransfer(address(_user), _amount);
            }
            emit UnstakedLP(_user, _amount);
        }

        if (staker.balance == 0 && staker.lpBalance == 0) {
            delete stakers[_user]; // TODO check this closely
        }
    }

    /*
     * @notice Unstake ALL without caring about rewards. EMERGENCY ONLY.
     */
    function emergencyUnstake()
        external
    {
        uint256 amount = stakers[_msgSender()].balance;
        _unstake(_msgSender(), amount, false);
        emit EmergencyUnstake(_msgSender(), amount);
    }
    /*
     * @notice Unstake ALL LP without caring about rewards. EMERGENCY ONLY.
     */
    function emergencyUnstakeLP()
        external
    {
        uint256 amount = stakers[_msgSender()].lpBalance;
        _unstake(_msgSender(), amount, true);
        emit EmergencyUnstakeLP(_msgSender(), amount);
    }


    /*
     * @dev Updates the amount of rewards owed for each user before any tokens are moved
     */
    function updateReward(
        address _user
    )
        public
    {

        // 1 Updates the amount of rewards, transfer MONA to this contract so there is some balance
        rewardsContract.updateRewards();

        // 2 Calculates the overall amount of mona revenue that has increased since the last time someone called this method
        uint256 monaRewards = rewardsContract.MonaRevenueRewards(lastUpdateTime,
                                                        _getNow());

        // Continue if there is mona in this pool
        if (_stakedValueTotalForPool() > 0) {
            // 3 Update the overall rewards per token points with the new mona rewards
            rewardsPerTokenPoints = rewardsPerTokenPoints.add(monaRewards
                                                        .mul(1e18)
                                                        .mul(pointMultiplier)
                                                        .div(_stakedValueTotalForPool()));
        }

        // 2 Calculates the bonus overall amount of mona revenue that has increased since the last time someone called this method
        uint256 bonusMonaRewards = rewardsContract.BonusMonaRevenueRewards(lastUpdateTime, _getNow());


        // Continue if there is mona in this pool
        if (_earlyStakedValueTotalForPool() > 0) {
            // 3 Update the overall rewards per token points with the new mona rewards
            bonusRewardsPerTokenPoints = bonusRewardsPerTokenPoints.add(bonusMonaRewards
                                                        .mul(1e18)
                                                        .mul(pointMultiplier)
                                                        .div(_earlyStakedValueTotalForPool()));
        }

        address[] memory _tokens = rewardsContract.getExtraRewardTokens();
        // Continue if there is mona value in this pool

        if (_stakedValueTotalForPool() > 0) {
        for (uint i=0; i< _tokens.length; i++) {
            // 2 Calculates the overall amount of mona revenue that has increased since the last time someone called this method
            uint256 thisTokenRewards = rewardsContract.TokenRevenueRewards(_tokens[i], lastUpdateTime,
                                                _getNow());

            // 3 Update the overall rewards per token points with the new mona rewards
            tokenRewardsPerTokenPoints[_tokens[i]] = tokenRewardsPerTokenPoints[_tokens[i]].add(thisTokenRewards
                .mul(1e18)
                .mul(pointMultiplier)
                .div(_stakedValueTotalForPool()));

            }

        }

        // 4 Update the last update time for this pool, calculating overall rewards
        lastUpdateTime = _getNow();

        // 5 Calculate the rewards owing overall for this user
        uint256 rewards = rewardsOwing(_user);

        // There are 2 states.
        Staker storage staker = stakers[_user];

        uint256 bonusRewards = 0;
        if(staker.isEarlyRewardsStaker){
            bonusRewards = bonusRewardsOwing(_user);
        }

        if (_user != address(0)) {
                staker.monaRevenueRewardsPending = staker.monaRevenueRewardsPending.add(rewards);
                staker.lastRewardPoints = rewardsPerTokenPoints;

                if(staker.isEarlyRewardsStaker){
                    staker.bonusMonaRevenueRewardsPending = staker.bonusMonaRevenueRewardsPending.add(bonusRewards);
                    staker.lastBonusRewardPoints = bonusRewardsPerTokenPoints;
                }
                for (uint i=0; i< _tokens.length; i++) {
                    uint256 specificTokenRewards = tokenRewardsOwing(_user, _tokens[i]);
                    staker.tokenRevenueRewardsPending[_tokens[i]] = staker.tokenRevenueRewardsPending[_tokens[i]].add(specificTokenRewards);
                    staker.lastTokenRewardPoints[_tokens[i]] = tokenRewardsPerTokenPoints[_tokens[i]];
                  }

                staker.lastRewardUpdateTime = _getNow();
        }
    }

    /*
     * @dev The rewards are dynamic and normalised from the other pools
     * @dev This gets the rewards from each of the periods as one multiplier
     */
    function rewardsOwing(
        address _user
    )
        public
        view
        returns(uint256)
    {
        uint256 newRewardPerToken = rewardsPerTokenPoints.sub(stakers[_user].lastRewardPoints);
        uint256 rewards = getStakedUserValue(_user).mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);


        return rewards;
    }

    /*
     * @dev The rewards are dynamic and normalised from the other pools
     * @dev This gets the rewards from each of the periods as one multiplier
     */
    function extraTokenRewardsOwing(
        address _user,
        address _token
    )
        public
        view
        returns(uint256)
    {
        uint256 newRewardPerToken = tokenRewardsPerTokenPoints[_token].sub(stakers[_user].lastTokenRewardPoints[_token]);
        uint256 rewards = getStakedUserValue(_user).mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);


        return rewards;
    }

    /*
     * @dev The bonus rewards are dynamic and normalised from the other pools
     * @dev This gets the rewards from each of the periods as one multiplier
     */
    function bonusRewardsOwing(
        address _user
    )
        public
        view
        returns(uint256)
    {
        uint256 newRewardPerToken = bonusRewardsPerTokenPoints.sub(stakers[_user].lastBonusRewardPoints);
        uint256 bonusRewards = getStakedUserValue(_user).mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);


        return bonusRewards;
    }

    function tokenRewardsOwing(
        address _user,
        address _token
    )
        public
        view
        returns(uint256)
    {
        uint256 newRewardPerToken = tokenRewardsPerTokenPoints[_token].sub(stakers[_user].lastTokenRewardPoints[_token]);
        uint256 rewards = getStakedUserValue(_user).mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);


        return rewards;
    }



     /*
      * @notice Returns the about of rewards yet to be claimed (this currently includes pending and awarded together
      * @param _user the user we are interested in
      * @dev returns the claimable rewards and pending rewards
      */
    function unclaimedRewards(
        address _user
    )
        public
        view
        returns(uint256 claimableRewards, uint256 pendingRewards)
    {
        if (_stakedValueTotalForPool() == 0) {
            return (0,0);
        }

        Staker storage staker = stakers[_user];

        uint256 monaRewards = rewardsContract.MonaRevenueRewards(lastUpdateTime,
                                                        _getNow());

        uint256 newRewardPerToken = rewardsPerTokenPoints.add(monaRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(_stakedValueTotalForPool()))
                                                         .sub(staker.lastRewardPoints);

        uint256 newRewards = getStakedUserValue(_user).mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);

        claimableRewards = staker.monaRevenueRewardsPending.add(newRewards).sub(staker.monaRevenueRewardsReleased);

        pendingRewards = newRewards.add(staker.monaRevenueRewardsPending);
    }




     /*
      * @notice Returns the about of rewards yet to be claimed (this currently includes pending and awarded together
      * @param _user the user we are interested in
      * @dev returns the claimable rewards and pending rewards
      */
    function unclaimedExtraRewards(
        address _user,
        address _token
    )
        public
        view
        returns(uint256 claimableRewards, uint256 pendingRewards)
    {
        if (_stakedValueTotalForPool() == 0) {
            return (0,0);
        }

        Staker storage staker = stakers[_user];

        uint256 tokenRewards = rewardsContract.TokenRevenueRewards(_token, lastUpdateTime,
                                                        _getNow());

        uint256 newRewardPerToken = tokenRewardsPerTokenPoints[_token].add(tokenRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(_stakedValueTotalForPool()))
                                                         .sub(staker.lastTokenRewardPoints[_token]);

        uint256 newRewards = getStakedUserValue(_user).mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);

        claimableRewards = staker.tokenRevenueRewardsPending[_token].add(newRewards).sub(staker.tokenRevenueRewardsReleased[_token]);

        pendingRewards = newRewards.add(staker.tokenRevenueRewardsPending[_token]);
    }

     /*
      * @notice Returns the about of rewards yet to be claimed for bonuses (this currently includes pending and awarded together)
      * @param _user the user we are interested in
      * @dev returns the claimable rewards and pending rewards
      */
    function unclaimedBonusRewards(
        address _user
    )
        public
        view
        returns(uint256 claimableRewards, uint256 pendingRewards)
    {
        Staker storage staker = stakers[_user];
        if (_stakedValueTotalForPool() == 0 || !staker.isEarlyRewardsStaker) {
            return (0,0);
        }

        uint256 monaBonusRewards = rewardsContract.BonusMonaRevenueRewards(lastUpdateTime, _getNow());

        uint256 newBonusRewardPerToken = bonusRewardsPerTokenPoints;
        newBonusRewardPerToken = newBonusRewardPerToken.add(monaBonusRewards.mul(1e18).mul(pointMultiplier).div(_earlyStakedValueTotalForPool()));
        newBonusRewardPerToken = newBonusRewardPerToken.sub(staker.lastBonusRewardPoints);

        uint256 newBonusRewards = getStakedUserValue(_user).mul(newBonusRewardPerToken);
        newBonusRewards = newBonusRewards.div(1e18);
        newBonusRewards = newBonusRewards.div(pointMultiplier);

        claimableRewards = staker.bonusMonaRevenueRewardsPending.add(newBonusRewards).sub(staker.bonusMonaRevenueRewardsReleased);
        pendingRewards = newBonusRewards.add(staker.bonusMonaRevenueRewardsPending);
    }


    /*
     * @notice Lets a user with rewards owing to claim tokens
     */
    function claimReward() external {
        _claimReward(_msgSender());
    }

    /**
     @notice Internal method for claimReward.
     */
    function _claimReward(
        address _user
    ) internal {
        require(
            tokensClaimable == true,
            "Tokens cannnot be claimed yet"
        );
        updateReward(_user);

        Staker storage staker = stakers[_user];

        uint256 payableAmount = 0;
        if(staker.monaRevenueRewardsPending >= staker.monaRevenueRewardsReleased) {
            payableAmount = staker.monaRevenueRewardsPending.sub(staker.monaRevenueRewardsReleased);
            staker.monaRevenueRewardsReleased = staker.monaRevenueRewardsPending;
            if(staker.bonusMonaRevenueRewardsPending >= staker.bonusMonaRevenueRewardsReleased) {
                uint256 payableBonusAmount = staker.bonusMonaRevenueRewardsPending.sub(staker.bonusMonaRevenueRewardsReleased);
                payableAmount = payableAmount.add(payableBonusAmount);
                staker.bonusMonaRevenueRewardsReleased = staker.bonusMonaRevenueRewardsPending;
            }
        }

        if(payableAmount > 0){
            /// @dev accounts for dust
            uint256 rewardBal = IERC20(monaToken).balanceOf(address(this));
            if (payableAmount > rewardBal) {
                payableAmount = rewardBal;
            }

            IERC20(monaToken).transfer(_user, payableAmount);
            emit MonaRevenueRewardPaid(_user, payableAmount);
        }

        // Extra tokens
        address[] memory _tokens = rewardsContract.getExtraRewardTokens();
        // Continue if there is mona value in this pool
        for (uint i=0; i< _tokens.length; i++) {
            uint256 rewardPayableAmount = 0;
            if(staker.tokenRevenueRewardsPending[_tokens[i]] >= staker.tokenRevenueRewardsReleased[_tokens[i]]) {
                rewardPayableAmount = staker.tokenRevenueRewardsPending[_tokens[i]].sub(staker.tokenRevenueRewardsReleased[_tokens[i]]);
                staker.tokenRevenueRewardsReleased[_tokens[i]] = staker.tokenRevenueRewardsPending[_tokens[i]];
            }
            if(rewardPayableAmount > 0){
                /// @dev accounts for dust
                uint256 tokenRewardBal = IERC20(_tokens[i]).balanceOf(address(this));
                if (rewardPayableAmount > tokenRewardBal) {
                    rewardPayableAmount = tokenRewardBal;
                }

                IERC20(_tokens[i]).transfer(_user, rewardPayableAmount);
                emit TokenRevenueRewardPaid(_tokens[i], _user, rewardPayableAmount);
            }


        }
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256 c) {
        c = a <= b ? a : b;
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    /* ========== Recover ERC20 ========== */

    /*
     * @notice allows for the recovery of incorrect ERC20 tokens sent to contract
     */
    function reclaimERC20(
        address _tokenAddress,
        uint256 _tokenAmount
    )
    external
    {
        // Cannot recover the staking token or the rewards token
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.reclaimERC20: Sender must be admin"
        );
        require(
            _tokenAddress != address(monaToken),
            "DigitalaxMonaStaking.reclaimERC20: Cannot withdraw the rewards token"
        );
        IERC20(_tokenAddress).transfer(_msgSender(), _tokenAmount);
        emit ReclaimedERC20(_tokenAddress, _tokenAmount);
    }

    /**
    * @notice EMERGENCY Recovers ETH, drains all ETH sitting on the smart contract
    * @dev Only access controls admin can access
    */
    function reclaimETH(uint256 _amount) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaStaking.reclaimETH: Sender must be admin"
        );
        _msgSender().transfer(address(this).balance);
    }

    function getLPTokenPerMonaUnit(uint monaAmt) public view  returns (uint liquidity){
        (uint256 reserveUsdt, uint256 reserveTokens) = getPairReserves();
        uint256 outTokens = UniswapV2Library.getAmountOut(monaAmt.div(2), reserveTokens, reserveUsdt).mul(1e10);
        uint _totalSupply =  IUniswapV2Pair(lpToken).totalSupply();

        (address token0, ) = UniswapV2Library.sortTokens(address(usdtToken), address(monaToken));
        (uint256 amount0, uint256 amount1) = token0 == address(monaToken) ? ( monaAmt.div(2), outTokens) : (outTokens, monaAmt.div(2));
        (uint256 _reserve0, uint256 _reserve1) = token0 == address(monaToken) ? (reserveUsdt, reserveTokens) : (reserveTokens, reserveUsdt);
        liquidity = min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
    }

    function getPairReserves() internal view returns (uint256 usdtReserves, uint256 tokenReserves) {
        (address token0,) = UniswapV2Library.sortTokens(address(usdtToken), address(monaToken));
        (uint256 reserve0, uint reserve1,) = IUniswapV2Pair(lpToken).getReserves();
        (usdtReserves, tokenReserves) = token0 == address(monaToken) ? (reserve1, reserve0) : (reserve0, reserve1);
    }

    /// @dev Use quickswap to get the conversion to monaValue
    function monaValue(uint256 lpQuantity)
        internal
        virtual
        view
        returns (uint256)
    {

        uint256 lpPerMona = getLPTokenPerMonaUnit(1e18);
        return lpQuantity.mul(1e18).div(lpPerMona);
    }
}
