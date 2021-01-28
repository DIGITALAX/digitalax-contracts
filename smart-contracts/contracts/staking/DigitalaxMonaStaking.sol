// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
// import "../uniswapv2/libraries/UniswapV2Library.sol";
// import "../uniswapv2/interfaces/IUniswapV2Pair.sol";
import "./interfaces/IDigitalaxRewards.sol";


/**
 * @title Digitalax Staking
 * @dev Stake MONA tokens, earn MONA on the Digitalax platform
 * @author Adrian Guerrera (deepyr)
 * @author DIGITALAX CORE TEAM
 */


contract DigitalaxMonaStaking  {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public rewardsToken; // TODO Leave this for now, but will be combo of MONA and ETH. Before lp was staked, and mona was the reward
    address public monaToken; // MONA ERC20

    uint256 constant MAX_NUMBER_OF_POOLS = 20;
    DigitalaxAccessControls public accessControls;
    IDigitalaxRewards public rewardsContract;

    /**
    @notice Struct to track what user is staking which tokens
    @dev balance is the current ether balance of the staker
    @dev lastRewardPoints is the amount of rewards (revenue) that were accumulated at the last checkpoint
    @dev rewardsEarned is the total reward for the staker till now - revenue sharing
    @dev rewardsReleased is how much reward has been paid to the staker - revenue sharing
    @dev isEarlyRewardsStaker is whether this staker qualifies as an early bird for extra bonus
    @dev earlyRewardsEarned the amount of early rewards earned so far by staker
    @dev earlyRewardsReleased is the amount of early rewards that have been released to the staker
    @dev monaMintingRewardsEarned the amount of mona minted rewards earned so far by staker
    @dev earlyRewardsReleased is the amount of mona minted rewardsthat have been released to the staker
    @dev ethRewardsEarned the amount of ETH rewards earned so far by staker
    @dev ethRewardsReleased is the amount of ETH rewards that have been released to the staker
    */
    struct Staker {
        uint256 balance;
        uint256 lastRewardPoints;

        uint256 rewardsEarned;
        uint256 rewardsReleased;

        bool isEarlyRewardsStaker;
        uint256 earlyRewardsEarned;
        uint256 earlyRewardsReleased;

        uint256 monaMintingRewardsEarned;
        uint256 monaMintingRewardsReleased;

        uint256 ethRewardsEarned;
        uint256 ethRewardsReleased;
    }

    /**
    @notice Struct to track the active pools
    @dev stakers is a mapping of existing stakers in the pool
    @dev lastUpdateTime last time the pool was updated with rewards per token points
    @dev rewardsPerTokenPoints amount of rewards overall for that pool (revenue sharing)
    @dev totalUnclaimedRewards amount of rewards from revenue sharing still unclaimed
    @dev monaInflationUnclaimedRewards the unclaimed rewards of mona minted
    @dev ethRewardsUnclaimed the unclaimed rewards of eth
    @dev daysInCycle the number of minimum days to stake, the length of a cycle (e.g. 30, 90, 180 days)
    @dev minimumStakeInMona the minimum stake to be in the pool
    @dev maximumStakeInMona the maximum stake to be in the pool
    @dev maximumNumberOfStakersInPool maximum total number of stakers that can get into this pool
    @dev maximumNumberOfEarlyRewardsUsers number of people that receive early rewards for staking early
    @dev currentNumberOfEarlyRewardsUsers number of people that have staked early
    */
    struct StakingPool {
        mapping (address => Staker) stakers;
        uint256 stakedMonaTotalForPool;

        uint256 lastUpdateTime;
        uint256 rewardsPerTokenPoints;
        uint256 totalUnclaimedRewards;

        uint256 monaMintedUnclaimedRewards;
        uint256 ethRewardsUnclaimed;

        uint256 daysInCycle;
        uint256 minimumStakeInMona;
        uint256 maximumStakeInMona;
        uint256 maximumNumberOfStakersInPool;

        uint256 maximumNumberOfEarlyRewardsUsers;
        uint256 currentNumberOfEarlyRewardsUsers;
    }

    /// @notice mapping of Pool Id's to pools
    mapping (uint256 => StakingPool) pools;
    uint256 numberOfStakingPools;

    /// @notice the total mona staked over all pools
    uint256 public stakedMonaTotal;

    uint256 constant pointMultiplier = 10e32;

    /// @notice sets the token to be claimable or not, cannot claim if it set to false
    bool public tokensClaimable;

    /* ========== Events ========== */

    /// @notice event emitted when a pool is initialized
    event PoolInitialized(uint256 poolId);

    /// @notice event emitted when a user has staked a token
    event Staked(address indexed owner, uint256 amount);

    /// @notice event emitted when a user has unstaked a token
    event Unstaked(address indexed owner, uint256 amount);

    /// @notice event emitted when a user claims reward
    event RewardPaid(address indexed user, uint256 reward);
    
    event ClaimableStatusUpdated(bool status);
    event EmergencyUnstake(address indexed user, uint256 amount);
    event RewardsTokenUpdated(address indexed oldRewardsToken, address newRewardsToken );
    event MonaTokenUpdated(address indexed oldMonaToken, address newMonaToken );

    constructor(IERC20 _rewardsToken, address _monaToken, DigitalaxAccessControls _accessControls) public {
        rewardsToken = _rewardsToken;
        monaToken = _monaToken;
        accessControls = _accessControls;
    }

     /**
     * @dev Single gateway to intialize the staking contract pools after deploying
     * @dev Sets the contract with the MONA token
     */
    function initMonaStakingPool(
        uint256 _daysInCycle,
        uint256 _minimumStakeInMona,
        uint256 _maximumStakeInMona,
        uint256 _maximumNumberOfStakersInPool,
        uint256 _maximumNumberOfEarlyRewardsUsers)
        public
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxMonaStaking.initMonaStakingPool: Sender must be admin"
        );

        require(
            numberOfStakingPools < MAX_NUMBER_OF_POOLS,
            "DigitalaxMonaStaking.initMonaStakingPool: Already reached max number of supported pools"
        );

        StakingPool storage stakingPool = pools[numberOfStakingPools];
        stakingPool.daysInCycle = _daysInCycle;
        stakingPool.minimumStakeInMona = _minimumStakeInMona;
        stakingPool.maximumStakeInMona = _maximumStakeInMona;
        stakingPool.maximumNumberOfStakersInPool = _maximumNumberOfStakersInPool;
        stakingPool.maximumNumberOfEarlyRewardsUsers = _maximumNumberOfEarlyRewardsUsers;
        stakingPool.lastUpdateTime = block.timestamp;

        // Emit event with this pools id index, and increment the number of staking pools that exist
        emit PoolInitialized(numberOfStakingPools);
        numberOfStakingPools = numberOfStakingPools.add(1);
    }

    /// @notice Lets admin set the Rewards Token
    function setRewardsContract(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxMonaStaking.setRewardsContract: Sender must be admin"
        );
        require(_addr != address(0));
        address oldAddr = address(rewardsContract);
        rewardsContract = IDigitalaxRewards(_addr);
        emit RewardsTokenUpdated(oldAddr, _addr);
    }

    /// @notice Lets admin set the Mona Token
    function setMonaToken(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxMonaStaking.setMonaToken: Sender must be admin"
        );
        require(_addr != address(0));
        address oldAddr = monaToken;
        monaToken = _addr;
        emit MonaTokenUpdated(oldAddr, _addr);
    }

    /// @notice Lets admin set when tokens are claimable
    function setTokensClaimable(
        bool _enabled
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxMonaStaking.setTokensClaimable: Sender must be admin"
        );
        tokensClaimable = _enabled;
        emit ClaimableStatusUpdated(_enabled);
    }

    /// @notice Getter functions for Staking contract
    /// @dev Get the tokens staked by a user
    function getStakedBalance(
        uint256 _poolId,
        address _user
    )
        external
        view
        returns (uint256 balance)
    {
        return pools[_poolId].stakers[_user].balance;
    }

    /// @dev Get the total ETH staked (all pools)
    function stakedEthTotal()
        external
        view
        returns (uint256)
    {

        uint256 monaPerEth = getMonaTokenPerEthUnit(1e18);
        return stakedMonaTotal.mul(1e18).div(monaPerEth);
    }

    /// @dev Get the total ETH staked (all pools)
    function stakedEthTotalByPool(uint256 _poolId)
        external
        view
        returns (uint256)
    {

        uint256 monaPerEth = getMonaTokenPerEthUnit(1e18);
        return pools[_poolId].stakedMonaTotalForPool.mul(1e18).div(monaPerEth);
    }


    /// @notice Stake MONA Tokens and earn rewards.
    function stake(
        uint256 _poolId,
        uint256 _amount
    )
        external
    {
        _stake(_poolId, msg.sender, _amount);
    }

    /// @notice Stake All MONA Tokens in your wallet and earn rewards.
    function stakeAll(uint256 _poolId)
        external
    {
        uint256 balance = IERC20(monaToken).balanceOf(msg.sender);
        _stake(_poolId, msg.sender, balance);
    }

    /**
     * @dev All the staking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they stake the nfts based on ether price
    */
    function _stake(
        uint256 _poolId,
        address _user,
        uint256 _amount
    )
        internal
    {
        require(
            _amount > 0 ,
            "DigitalaxMonaStaking._stake: Staked amount must be greater than 0"
        );
        Staker storage staker = pools[_poolId].stakers[_user];

        if (staker.balance == 0 && staker.lastRewardPoints == 0 ) {
          staker.lastRewardPoints = pools[_poolId].rewardsPerTokenPoints;
        }

        updateReward(_poolId, _user);
        staker.balance = staker.balance.add(_amount);
        stakedMonaTotal = stakedMonaTotal.add(_amount);
        pools[_poolId].stakedMonaTotalForPool = pools[_poolId].stakedMonaTotalForPool.add(_amount);
        IERC20(monaToken).safeTransferFrom(
            address(_user),
            address(this),
            _amount
        );
        emit Staked(_user, _amount);
    }

    /// @notice Unstake MONA Tokens.
    function unstake(
        uint256 _poolId,
        uint256 _amount
    ) 
        external 
    {
        _unstake(_poolId, msg.sender, _amount);
    }

     /**
     * @dev All the unstaking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they unstake the nfts based on ether price
    */
    function _unstake(
        uint256 _poolId,
        address _user,
        uint256 _amount
    ) 
        internal 
    {

        require(
            pools[_poolId].stakers[_user].balance >= _amount,
            "DigitalaxMonaStaking._unstake: Sender must have staked tokens"
        );
        claimReward(_poolId, _user);
        Staker storage staker = pools[_poolId].stakers[_user];
        
        staker.balance = staker.balance.sub(_amount);
        stakedMonaTotal = stakedMonaTotal.sub(_amount);
        pools[_poolId].stakedMonaTotalForPool = pools[_poolId].stakedMonaTotalForPool.sub(_amount);

        if (staker.balance == 0) {
            delete pools[_poolId].stakers[_user];
        }

        uint256 tokenBal = IERC20(monaToken).balanceOf(address(this));
        if (_amount > tokenBal) {
            IERC20(monaToken).safeTransfer(address(_user), tokenBal);
        } else {
            IERC20(monaToken).safeTransfer(address(_user), _amount);
        }
        emit Unstaked(_user, _amount);
    }

    /// @notice Unstake without caring about rewards. EMERGENCY ONLY.
    function emergencyUnstake(uint256 _poolId)
        external
    {
        uint256 amount = pools[_poolId].stakers[msg.sender].balance;
        pools[_poolId].stakers[msg.sender].balance = 0;
        pools[_poolId].stakers[msg.sender].rewardsEarned = 0;

        IERC20(monaToken).safeTransfer(address(msg.sender), amount);
        emit EmergencyUnstake(msg.sender, amount);
    }

    /// @dev Updates the amount of rewards owed for each user before any tokens are moved
    function updateReward(
        uint256 _poolId,
        address _user
    ) 
        public 
    {

        rewardsContract.updateRewards(_poolId);

        uint256 monaRewards = rewardsContract.MonaRewards(_poolId, pools[_poolId].lastUpdateTime,
                                                        block.timestamp);

        if (pools[_poolId].stakedMonaTotalForPool > 0) {
            pools[_poolId].rewardsPerTokenPoints = pools[_poolId].rewardsPerTokenPoints.add(monaRewards
                                                        .mul(1e18)
                                                        .mul(pointMultiplier)
                                                        .div(pools[_poolId].stakedMonaTotalForPool));
        }

        pools[_poolId].lastUpdateTime = block.timestamp; // Instead of making this block.timestamp, make this end of last cycle
        uint256 rewards = rewardsOwing(_poolId, _user);

        Staker storage staker = pools[_poolId].stakers[_user];
        if (_user != address(0)) {
            staker.rewardsEarned = staker.rewardsEarned.add(rewards);
            staker.lastRewardPoints = pools[_poolId].rewardsPerTokenPoints;
        }
    }


    /// @notice Returns the rewards owing for a user
    /// @dev The rewards are dynamic and normalised from the other pools
    /// @dev This gets the rewards from each of the periods as one multiplier
    function rewardsOwing(
        uint256 _poolId,
        address _user
    )
        public
        view
        returns(uint256)
    {
        uint256 newRewardPerToken = pools[_poolId].rewardsPerTokenPoints.sub(pools[_poolId].stakers[_user].lastRewardPoints);
        uint256 rewards = pools[_poolId].stakers[_user].balance.mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);
        return rewards;
    }


    /// @notice Returns the about of rewards yet to be claimed
    function unclaimedRewards(
        uint256 _poolId,
        address _user
    )
        public
        view
        returns(uint256)
    {
        if (pools[_poolId].stakedMonaTotalForPool == 0) {
            return 0;
        }

        uint256 monaRewards = rewardsContract.MonaRewards(_poolId, pools[_poolId].lastUpdateTime,
                                                        block.timestamp);

        uint256 newRewardPerToken = pools[_poolId].rewardsPerTokenPoints.add(monaRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(pools[_poolId].stakedMonaTotalForPool))
                                                         .sub(pools[_poolId].stakers[_user].lastRewardPoints);

        uint256 rewards = pools[_poolId].stakers[_user].balance.mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);
        return rewards.add(pools[_poolId].stakers[_user].rewardsEarned).sub(pools[_poolId].stakers[_user].rewardsReleased);
    }


    /// @notice Lets a user with rewards owing to claim tokens
    function claimReward(
        uint256 _poolId,
        address _user
    )
        public
    {
        require(
            tokensClaimable == true,
            "Tokens cannnot be claimed yet"
        );
        updateReward(_poolId, _user);

        Staker storage staker = pools[_poolId].stakers[_user];
    
        uint256 payableAmount = staker.rewardsEarned.sub(staker.rewardsReleased);
        staker.rewardsReleased = staker.rewardsReleased.add(payableAmount);

        /// @dev accounts for dust 
        uint256 rewardBal = rewardsToken.balanceOf(address(this));
        if (payableAmount > rewardBal) {
            payableAmount = rewardBal;
        }
        
        rewardsToken.transfer(_user, payableAmount);
        emit RewardPaid(_user, payableAmount);
    }



    function getMonaTokenPerEthUnit(uint ethAmt) public view  returns (uint liquidity){
//        (uint256 reserveWeth, uint256 reserveTokens) = getPairReserves();
//        uint256 outTokens = UniswapV2Library.getAmountOut(ethAmt.div(2), reserveWeth, reserveTokens);
//        uint _totalSupply =  IUniswapV2Pair(monaToken).totalSupply();
//
//        (address token0, ) = UniswapV2Library.sortTokens(address(WETH), address(rewardsToken));
//        (uint256 amount0, uint256 amount1) = token0 == address(rewardsToken) ? (outTokens, ethAmt.div(2)) : (ethAmt.div(2), outTokens);
//        (uint256 _reserve0, uint256 _reserve1) = token0 == address(rewardsToken) ? (reserveTokens, reserveWeth) : (reserveWeth, reserveTokens);
//        liquidity = min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);

        // Todo convert mona to eth
        return 1;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256 c) {
        c = a <= b ? a : b;
    }


}