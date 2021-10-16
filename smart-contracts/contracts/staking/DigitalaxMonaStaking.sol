// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./interfaces/IDigitalaxRewards.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "hardhat/console.sol";


/**
 * @title Digitalax Staking
 * @dev Stake MONA tokens, earn MONA on the Digitalax platform
 * @author DIGITALAX CORE TEAM
 * @author Based on original staking contract by Adrian Guerrera (deepyr)
 */


contract DigitalaxMonaStaking is BaseRelayRecipient, ReentrancyGuard  {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public monaToken; // MONA ERC20s

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

    /**
    @notice Struct to track the active pools
    @dev stakers is a mapping of existing stakers in the pool
    @dev lastUpdateTime last time the pool was updated with rewards per token points
    @dev rewardsPerTokenPoints amount of rewards overall for that pool (revenue sharing)
    @dev maximumNumberOfStakersInPool maximum total number of stakers that can get into this pool
    @dev maximumNumberOfEarlyRewardsUsers number of people that receive early rewards for staking early
    @dev currentNumberOfEarlyRewardsUsers number of people that have staked early
    */
    struct StakingPool {
        mapping (address => Staker) stakers;
        uint256 stakedMonaTotalForPool;
        uint256 earlyStakedMonaTotalForPool;

        uint256 lastUpdateTime;
        uint256 rewardsPerTokenPoints;
        uint256 bonusRewardsPerTokenPoints;
        mapping (address => uint256) tokenRewardsPerTokenPoints;

        uint256 currentNumberOfStakersInPool;
        uint256 maximumNumberOfStakersInPool;

        uint256 maximumNumberOfEarlyRewardsUsers;
        uint256 currentNumberOfEarlyRewardsUsers;
    }

    /*
     * @notice mapping of Pool Id's to pools
     */
    StakingPool public pool;

    /*
     * @notice the total mona staked over all pools
     */
    uint256 public stakedMonaTotal;
    uint256 public earlyStakedMonaTotal;

    uint256 constant pointMultiplier = 10e32;

    /*
     * @notice sets the token to be claimable or not, cannot claim if it set to false
     */
    bool public tokensClaimable = true;

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
     * @notice event emitted when a user has unstaked a token
     */
    event Unstaked(address indexed owner, uint256 amount);

    /*
     * @notice event emitted when a user claims reward
     */
    event MonaRevenueRewardPaid(address indexed user, uint256 reward);
    event TokenRevenueRewardPaid(address indexed token, address indexed user, uint256 reward);

    event ClaimableStatusUpdated(bool status);
    event EmergencyUnstake(address indexed user, uint256 amount);
    event MonaTokenUpdated(address indexed oldMonaToken, address newMonaToken);
    event RewardsTokenUpdated(address indexed oldRewardsToken, address newRewardsToken );

    event ReclaimedERC20(address indexed token, uint256 amount);

    constructor(address _monaToken, DigitalaxAccessControls _accessControls, address _trustedForwarder) public {
        require(_monaToken != address(0), "DigitalaxMonaStaking: Invalid Mona Token");
        require(address(_accessControls) != address(0), "DigitalaxMonaStaking: Invalid Access Controls");
        monaToken = _monaToken;
        accessControls = _accessControls;
        trustedForwarder = _trustedForwarder;
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

        pool.currentNumberOfStakersInPool = 0;
        pool.currentNumberOfEarlyRewardsUsers = 0;
        pool.maximumNumberOfStakersInPool = _maximumNumberOfStakersInPool;
        pool.maximumNumberOfEarlyRewardsUsers = _maximumNumberOfEarlyRewardsUsers;
        pool.lastUpdateTime = _getNow();

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
    function getStakedBalance(
        address _user
    )
        external
        view
        returns (uint256 balance)
    {
        return pool.stakers[_user].balance;
    }

    /* @notice Getter functions for Staking contract
     *  @dev Get the tokens staked by a user
     */
    function getStaker(
        address _user
    )
        external
        view
        returns (uint256 balance, uint256 lastRewardPoints, uint256 lastBonusRewardPoints, uint256 lastRewardUpdateTime, uint256 monaRevenueRewardsPending,uint256 bonusMonaRevenueRewardsPending, uint256 monaRevenueRewardsReleased, bool isEarlyRewardsStaker)
    {
        Staker storage staker = pool.stakers[_user];
        return (staker.balance,
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
        return pool.tokenRewardsPerTokenPoints[_token];
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
        Staker storage staker = pool.stakers[_user];
        return staker.lastTokenRewardPoints[_token];
    }

    /*
     * @dev Get the total ETH staked
     */
    function stakedMonaInPool()
        external
        view
        returns (uint256)
    {
        return pool.stakedMonaTotalForPool;
    }

    /*
     * @dev Get the total ETH staked (all pools early stakers)
     */
    function earlyStakedMonaInPool()
        external
        view
        returns (uint256)
    {
        return pool.earlyStakedMonaTotalForPool;
    }

    /*
     * @dev Get the total ETH staked
     */
    function stakedEthTotal()
        external
        view
        returns (uint256)
    {

        uint256 monaPerEth = getMonaTokenPerEthUnit(1e18);
        return stakedMonaTotal.mul(1e18).div(monaPerEth);
    }

    /*
     * @dev Get the total early ETH staked
     */
    function earlyStakedEthTotal()
        external
        view
        returns (uint256)
    {

        uint256 monaPerEth = getMonaTokenPerEthUnit(1e18);
        return earlyStakedMonaTotal.mul(1e18).div(monaPerEth);
    }

    /*
     * @dev Get the total ETH staked
     */
    function stakedEthTotalByPool()
        external
        view
        returns (uint256)
    {

        uint256 monaPerEth = getMonaTokenPerEthUnit(1e18);
        return pool.stakedMonaTotalForPool.mul(1e18).div(monaPerEth);
    }

    /*
     * @dev Get the total ETH staked
     */
    function earlyStakedEthTotalByPool()
        external
        view
        returns (uint256)
    {

        uint256 monaPerEth = getMonaTokenPerEthUnit(1e18);
        return pool.earlyStakedMonaTotalForPool.mul(1e18).div(monaPerEth);
    }


    /*
     * @notice Stake MONA Tokens and earn rewards.
     */
    function stake(
        uint256 _amount
    )
        external
    {
        _stake(_msgSender(), _amount);
    }

    /*
     * @notice Stake All MONA Tokens in your wallet and earn rewards.
     */
    function stakeAll()
        external
    {
        uint256 balance = IERC20(monaToken).balanceOf(_msgSender());
        _stake(_msgSender(), balance);
    }

    /**
     * @dev All the staking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they stake the nfts based on ether price
    */
    function _stake(
        address _user,
        uint256 _amount
    )
        internal
    {
        require(
            _amount > 0 ,
            "DigitalaxMonaStaking._stake: Staked amount must be greater than 0"
        );

        Staker storage staker = pool.stakers[_user];

        // Check if a new user
        if(staker.lastRewardUpdateTime == 0 && staker.balance == 0) {
            require(
                pool.currentNumberOfStakersInPool < pool.maximumNumberOfStakersInPool,
                "DigitalaxMonaStaking._stake: This pool is already full"
            );
            pool.currentNumberOfStakersInPool = pool.currentNumberOfStakersInPool.add(1);

            // Check if an early staker
            if(pool.currentNumberOfEarlyRewardsUsers < pool.maximumNumberOfEarlyRewardsUsers){
                pool.currentNumberOfEarlyRewardsUsers = pool.currentNumberOfEarlyRewardsUsers.add(1);
                staker.isEarlyRewardsStaker = true;
            } else {
                staker.isEarlyRewardsStaker = false;
            }
        }

        if(staker.balance == 0) {
            if (staker.lastRewardPoints == 0 ) {
              staker.lastRewardPoints = pool.rewardsPerTokenPoints;
            }
            if(staker.isEarlyRewardsStaker && (staker.lastBonusRewardPoints == 0)){
              staker.lastBonusRewardPoints = pool.bonusRewardsPerTokenPoints;
            }
        }

        updateReward(_user);

        staker.balance = staker.balance.add(_amount);

        stakedMonaTotal = stakedMonaTotal.add(_amount);
        pool.stakedMonaTotalForPool = pool.stakedMonaTotalForPool.add(_amount);

        if(staker.isEarlyRewardsStaker){
            earlyStakedMonaTotal = earlyStakedMonaTotal.add(_amount);
            pool.earlyStakedMonaTotalForPool = pool.earlyStakedMonaTotalForPool.add(_amount);
        }

        IERC20(monaToken).safeTransferFrom(
            address(_user),
            address(this),
            _amount
        );
        emit Staked(_user, _amount);
    }

    /*
     * @notice Unstake MONA Tokens.
     */
    function unstake(
        uint256 _amount
    )
        external
    {
        _unstake(_msgSender(), _amount);
    }

     /**
     * @dev All the unstaking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they unstake the nfts based on ether price
    */
    function _unstake(
        address _user,
        uint256 _amount
    )
        internal
    {

        require(
            pool.stakers[_user].balance >= _amount,
            "DigitalaxMonaStaking._unstake: Sender must have staked tokens"
        );
        _claimReward(_user);
        Staker storage staker = pool.stakers[_user];

        staker.balance = staker.balance.sub(_amount);
        stakedMonaTotal = stakedMonaTotal.sub(_amount);
        pool.stakedMonaTotalForPool = pool.stakedMonaTotalForPool.sub(_amount);

        if(staker.isEarlyRewardsStaker){
            earlyStakedMonaTotal = earlyStakedMonaTotal.sub(_amount);
            pool.earlyStakedMonaTotalForPool = pool.earlyStakedMonaTotalForPool.sub(_amount);
        }

        if (staker.balance == 0) {
            delete pool.stakers[_user]; // TODO figure out if this is still valid
        }

        uint256 tokenBal = IERC20(monaToken).balanceOf(address(this));
        if (_amount > tokenBal) {
            IERC20(monaToken).safeTransfer(address(_user), tokenBal);
        } else {
            IERC20(monaToken).safeTransfer(address(_user), _amount);
        }
        emit Unstaked(_user, _amount);
    }

    /*
     * @notice Unstake ALL without caring about rewards. EMERGENCY ONLY.
     */
    function emergencyUnstake()
        external
    {
        uint256 amount = pool.stakers[_msgSender()].balance;
        pool.stakers[_msgSender()].balance = 0;
    // TODO figure out if rewards released or pending even needs to change..
//        pool.stakers[_msgSender()].monaRevenueRewardsPending= 0;
//        pool.stakers[_msgSender()].bonusMonaRevenueRewardsPending = 0;
    // TODO all tokens

        IERC20(monaToken).safeTransfer(address(_msgSender()), amount);
        emit EmergencyUnstake(_msgSender(), amount);
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
        uint256 monaRewards = rewardsContract.MonaRevenueRewards(pool.lastUpdateTime,
                                                        _getNow());

        // Continue if there is mona in this pool
        if (pool.stakedMonaTotalForPool > 0) {
            // 3 Update the overall rewards per token points with the new mona rewards
            pool.rewardsPerTokenPoints = pool.rewardsPerTokenPoints.add(monaRewards
                                                        .mul(1e18)
                                                        .mul(pointMultiplier)
                                                        .div(pool.stakedMonaTotalForPool));
        }


        // 2 Calculates the bonus overall amount of mona revenue that has increased since the last time someone called this method
        uint256 bonusMonaRewards = rewardsContract.BonusMonaRevenueRewards(pool.lastUpdateTime, _getNow());


        // Continue if there is mona in this pool
        if (pool.earlyStakedMonaTotalForPool > 0) {
            // 3 Update the overall rewards per token points with the new mona rewards
            pool.bonusRewardsPerTokenPoints = pool.bonusRewardsPerTokenPoints.add(bonusMonaRewards
                                                        .mul(1e18)
                                                        .mul(pointMultiplier)
                                                        .div(pool.earlyStakedMonaTotalForPool));
        }

        address[] memory _tokens = rewardsContract.getExtraRewardTokens();
        // Continue if there is mona value in this pool

        console.log("Going into the routine %s", _tokens[0]);
        if (pool.stakedMonaTotalForPool > 0) {
        for (uint i=0; i< _tokens.length; i++) {
            console.log("routine %s", _tokens[i]);
            // 2 Calculates the overall amount of mona revenue that has increased since the last time someone called this method
            uint256 thisTokenRewards = rewardsContract.TokenRevenueRewards(_tokens[i], pool.lastUpdateTime,
                                                _getNow());
             console.log("this token rewrad %s", thisTokenRewards);

            // 3 Update the overall rewards per token points with the new mona rewards
            pool.tokenRewardsPerTokenPoints[_tokens[i]] = pool.tokenRewardsPerTokenPoints[_tokens[i]].add(thisTokenRewards
                .mul(1e18)
                .mul(pointMultiplier)
                .div(pool.stakedMonaTotalForPool));

            console.log("this token rewraaad %s", pool.tokenRewardsPerTokenPoints[_tokens[i]]);
            }
        }

        // 4 Update the last update time for this pool, calculating overall rewards
        pool.lastUpdateTime = _getNow();

        // 5 Calculate the rewards owing overall for this user
        uint256 rewards = rewardsOwing(_user);

        // There are 2 states.
        Staker storage staker = pool.stakers[_user];

        uint256 bonusRewards = 0;
        if(staker.isEarlyRewardsStaker){
            bonusRewards = bonusRewardsOwing(_user);
        }

        if (_user != address(0)) {
                staker.monaRevenueRewardsPending = staker.monaRevenueRewardsPending.add(rewards);
                staker.lastRewardPoints = pool.rewardsPerTokenPoints;

                if(staker.isEarlyRewardsStaker){
                    staker.bonusMonaRevenueRewardsPending = staker.bonusMonaRevenueRewardsPending.add(bonusRewards);
                    staker.lastBonusRewardPoints = pool.bonusRewardsPerTokenPoints;
                }
    console.log("next routine %s",  _tokens.length);
                for (uint i=0; i< _tokens.length; i++) {
                    uint256 specificTokenRewards = tokenRewardsOwing(_user, _tokens[i]);
                    staker.tokenRevenueRewardsPending[_tokens[i]] = staker.tokenRevenueRewardsPending[_tokens[i]].add(specificTokenRewards);
                    staker.lastTokenRewardPoints[_tokens[i]] = pool.tokenRewardsPerTokenPoints[_tokens[i]];
                    console.log("specific token rewardss %s", specificTokenRewards);
                    console.log("staker.tokenRevenueRewardsPending[_tokens[i]] %s", staker.tokenRevenueRewardsPending[_tokens[i]]);
                    console.log("staker.lastTokenRewardPoints[_tokens[i]] %s", staker.lastTokenRewardPoints[_tokens[i]]);
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
        uint256 newRewardPerToken = pool.rewardsPerTokenPoints.sub(pool.stakers[_user].lastRewardPoints);
        uint256 rewards = pool.stakers[_user].balance.mul(newRewardPerToken)
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
        uint256 newRewardPerToken = pool.tokenRewardsPerTokenPoints[_token].sub(pool.stakers[_user].lastTokenRewardPoints[_token]);
        uint256 rewards = pool.stakers[_user].balance.mul(newRewardPerToken)
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
        uint256 newRewardPerToken = pool.bonusRewardsPerTokenPoints.sub(pool.stakers[_user].lastBonusRewardPoints);
        uint256 bonusRewards = pool.stakers[_user].balance.mul(newRewardPerToken)
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
        uint256 newRewardPerToken = pool.tokenRewardsPerTokenPoints[_token].sub(pool.stakers[_user].lastTokenRewardPoints[_token]);
        uint256 rewards = pool.stakers[_user].balance.mul(newRewardPerToken)
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
        if (pool.stakedMonaTotalForPool == 0) {
            return (0,0);
        }

        Staker storage staker = pool.stakers[_user];

        uint256 monaRewards = rewardsContract.MonaRevenueRewards(pool.lastUpdateTime,
                                                        _getNow());

        uint256 newRewardPerToken = pool.rewardsPerTokenPoints.add(monaRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(pool.stakedMonaTotalForPool))
                                                         .sub(staker.lastRewardPoints);

        uint256 newRewards = staker.balance.mul(newRewardPerToken)
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
        if (pool.stakedMonaTotalForPool == 0) {
            return (0,0);
        }

        Staker storage staker = pool.stakers[_user];

        uint256 tokenRewards = rewardsContract.TokenRevenueRewards(_token, pool.lastUpdateTime,
                                                        _getNow());

        uint256 newRewardPerToken = pool.tokenRewardsPerTokenPoints[_token].add(tokenRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(pool.stakedMonaTotalForPool))
                                                         .sub(staker.lastTokenRewardPoints[_token]);

        uint256 newRewards = staker.balance.mul(newRewardPerToken)
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
     // TODO stack too deep
    function unclaimedBonusRewards(
        address _user
    )
        public
        view
        returns(uint256 claimableRewards, uint256 pendingRewards)
    {
        Staker storage staker = pool.stakers[_user];
        if (pool.stakedMonaTotalForPool == 0 || !staker.isEarlyRewardsStaker) {
            return (0,0);
        }

        uint256 monaBonusRewards = rewardsContract.BonusMonaRevenueRewards(pool.lastUpdateTime, _getNow());

        uint256 newBonusRewardPerToken = pool.bonusRewardsPerTokenPoints;
        newBonusRewardPerToken = newBonusRewardPerToken.add(monaBonusRewards.mul(1e18).mul(pointMultiplier).div(pool.earlyStakedMonaTotalForPool));
        newBonusRewardPerToken = newBonusRewardPerToken.sub(staker.lastBonusRewardPoints);

        uint256 newBonusRewards = staker.balance.mul(newBonusRewardPerToken);
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

        Staker storage staker = pool.stakers[_user];

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

                IERC20(_tokens[i]).transfer(_user, payableAmount);
                emit TokenRevenueRewardPaid(_tokens[i], _user, payableAmount);
            }


        }
    }

    function getMonaTokenPerEthUnit(uint ethAmt) public view  returns (uint liquidity){
        return rewardsContract.getMonaPerEth(1e18);
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
}
