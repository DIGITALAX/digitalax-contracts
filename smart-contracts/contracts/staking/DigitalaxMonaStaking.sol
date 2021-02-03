// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
// import "../uniswapv2/libraries/UniswapV2Library.sol";
// import "../uniswapv2/interfaces/IUniswapV2Pair.sol";
import "./interfaces/IDigitalaxRewards.sol";
import "./interfaces/IWETH9.sol";


/**
 * @title Digitalax Staking
 * @dev Stake MONA tokens, earn MONA on the Digitalax platform
 * @author DIGITALAX CORE TEAM
 * @author Based on original staking contract by Adrian Guerrera (deepyr)
 */

// TODO non-reentrant
contract DigitalaxMonaStaking  {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public monaToken; // MONA ERC20s
    IWETH public WETH;

    uint256 constant MAX_NUMBER_OF_POOLS = 20;
    uint256 constant SECONDS_IN_A_DAY = 86400;
    DigitalaxAccessControls public accessControls;
    IDigitalaxRewards public rewardsContract;

    /**
    @notice Struct to track what user is staking which tokens
    @dev balance is the current ether balance of the staker
    @dev lastRewardPoints is the amount of rewards (revenue) that were accumulated at the last checkpoint
    @dev cycleStartTimestamp is the timestamp their cycle starts. This is only reset if someone unstakes 100% and resets. Any earnings are pro-rata if stake is increased
    @dev monaRevenueRewardsEarned is the total reward for the staker till now - revenue sharing
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
        uint256 lastRewardUpdateTime;

        uint256 cycleStartTimestamp;

        uint256 monaRevenueRewardsPending;
        uint256 monaRevenueRewardsEarned;
        uint256 monaRevenueRewardsReleased;

        uint256 ethRevenueRewardsPending;  // TODO hookup
        uint256 ethRevenueRewardsEarned; // TODO hookup
        uint256 ethRevenueRewardsReleased; // TODO hookup

        bool isEarlyRewardsStaker; // TODO hookup
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
        uint256 currentNumberOfStakersInPool; // TODO hookup
        uint256 maximumNumberOfStakersInPool; // TODO hookup

        uint256 maximumNumberOfEarlyRewardsUsers; // TODO hookup
        uint256 currentNumberOfEarlyRewardsUsers; // TODO hookup
    }

    /*
     * @notice mapping of Pool Id's to pools
     */
    mapping (uint256 => StakingPool) pools;
    uint256 public numberOfStakingPools;

    /*
     * @notice the total mona staked over all pools
     */
    uint256 public stakedMonaTotal;

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
    event PoolInitialized(uint256 poolId);

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
    
    event ClaimableStatusUpdated(bool status);
    event EmergencyUnstake(address indexed user, uint256 amount);
    event MonaTokenUpdated(address indexed oldMonaToken, address newMonaToken );
    event RewardsTokenUpdated(address indexed oldRewardsToken, address newRewardsToken );

    event ReclaimedERC20(address indexed token, uint256 amount);

    constructor(address _monaToken, DigitalaxAccessControls _accessControls, IWETH _WETH) public {
        require(_monaToken != address(0), "DigitalaxMonaStaking: Invalid Mona Token");
        require(address(_accessControls) != address(0), "DigitalaxMonaStaking: Invalid Access Controls");
        require(address(_WETH) != address(0), "DigitalaxMonaStaking: Invalid WETH Token");
        monaToken = _monaToken;
        accessControls = _accessControls;
        WETH = _WETH;
    }
    receive() external payable {
        require(
            msg.sender == address(rewardsContract),
            "DigitalaxMonaStaking.receive: Sender must be rewards contract"
        );
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
            accessControls.hasAdminRole(msg.sender),
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
            "DigitalaxMonaStaking.initMonaStakingPool: Contract already reached max number of supported pools"
        );

        require(
            _daysInCycle > 0,
            "DigitalaxMonaStaking.initMonaStakingPool: Must be more then one day in the cycle"
        );

        require(
            _minimumStakeInMona > 0,
            "DigitalaxMonaStaking.initMonaStakingPool: The minimum stake in Mona must be greater than zero"
        );

        require(
            _maximumStakeInMona >= _minimumStakeInMona,
            "DigitalaxMonaStaking.initMonaStakingPool: The maximum stake in Mona must be greater than or equal to the minimum stake"
        );

        StakingPool storage stakingPool = pools[numberOfStakingPools];
        stakingPool.daysInCycle = _daysInCycle;
        stakingPool.minimumStakeInMona = _minimumStakeInMona;
        stakingPool.maximumStakeInMona = _maximumStakeInMona;
        stakingPool.maximumNumberOfStakersInPool = _maximumNumberOfStakersInPool;
        stakingPool.maximumNumberOfEarlyRewardsUsers = _maximumNumberOfEarlyRewardsUsers;
        stakingPool.lastUpdateTime = _getNow();

        // Emit event with this pools id index, and increment the number of staking pools that exist
        emit PoolInitialized(numberOfStakingPools);
        numberOfStakingPools = numberOfStakingPools.add(1);
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
            accessControls.hasAdminRole(msg.sender),
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
            accessControls.hasAdminRole(msg.sender),
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
            accessControls.hasAdminRole(msg.sender),
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
        uint256 _poolId,
        address _user
    )
        external
        view
        returns (uint256 balance)
    {
        return pools[_poolId].stakers[_user].balance;
    }

    /*
     * @dev Get the total ETH staked (all pools)
     */
    function stakedMonaInPool(uint256 _poolId)
        external
        view
        returns (uint256)
    {
        return pools[_poolId].stakedMonaTotalForPool;
    }

    /*
     * @dev Get the total ETH staked (all pools)
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
     * @dev Get the total ETH staked (all pools)
     */
    function stakedEthTotalByPool(uint256 _poolId)
        external
        view
        returns (uint256)
    {

        uint256 monaPerEth = getMonaTokenPerEthUnit(1e18);
        return pools[_poolId].stakedMonaTotalForPool.mul(1e18).div(monaPerEth);
    }


    /*
     * @notice Stake MONA Tokens and earn rewards.
     */
    function stake(
        uint256 _poolId,
        uint256 _amount
    )
        external
    {
        _stake(_poolId, msg.sender, _amount);
    }

    /*
     * @notice Stake All MONA Tokens in your wallet and earn rewards.
     */
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

        require(
            staker.balance.add(_amount) >= pools[_poolId].minimumStakeInMona,
            "DigitalaxMonaStaking._stake: Staked amount must be greater than or equal to minimum stake"
        );

        require(
            staker.balance.add(_amount) <= pools[_poolId].maximumStakeInMona,
            "DigitalaxMonaStaking._stake: Staked amount must be less than or equal to maximum stake"
        );

        if(staker.balance == 0) {
            staker.cycleStartTimestamp = _getNow();
            if (staker.lastRewardPoints == 0 ) {
              staker.lastRewardPoints = pools[_poolId].rewardsPerTokenPoints;
            }
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

    /*
     * @notice Unstake MONA Tokens.
     */
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

    /*
     * @notice Unstake without caring about rewards. EMERGENCY ONLY.
     */
    function emergencyUnstake(uint256 _poolId)
        external
    {
        uint256 amount = pools[_poolId].stakers[msg.sender].balance;
        pools[_poolId].stakers[msg.sender].balance = 0;
        pools[_poolId].stakers[msg.sender].monaRevenueRewardsEarned = 0;

        IERC20(monaToken).safeTransfer(address(msg.sender), amount);
        emit EmergencyUnstake(msg.sender, amount);
    }


    /*
     * @dev Updates the amount of rewards owed for each user before any tokens are moved
     */
    function updateReward(
        uint256 _poolId,
        address _user
    )
        public
    {
        require(pools[_poolId].daysInCycle > 0, "DigitalaxMonaStaking.updateRewards: This pool has not been instantiated");

        // 1 Updates the amount of rewards, transfer MONA to this contract so there is some balance
        rewardsContract.updateRewards(_poolId);

        // 2 Calculates the overall amount of mona revenue that has increased since the last time someone called this method
        uint256 monaRewards = rewardsContract.MonaRevenueRewards(_poolId, pools[_poolId].lastUpdateTime,
                                                        _getNow());

        // Continue if there is mona in this pool
        if (pools[_poolId].stakedMonaTotalForPool > 0) {
            // 3 Update the overall rewards per token points with the new mona rewards
            pools[_poolId].rewardsPerTokenPoints = pools[_poolId].rewardsPerTokenPoints.add(monaRewards
                                                        .mul(1e18)
                                                        .mul(pointMultiplier)
                                                        .div(pools[_poolId].stakedMonaTotalForPool));
        }

        // 4 Update the last update time for this pool, calculating overall rewards
        pools[_poolId].lastUpdateTime = _getNow();

        // 5 Calculate the rewards owing overall for this user
        uint256 rewards = rewardsOwing(_poolId, _user);

        // There are 2 states.
        // 1. We are in the same cycle and need to add pending rewards,
        // 2. If we are in a new cycle, all pending rewards get added to monaRevenueRewardsEarned
        // If we are in a new cycle, we will add subtract from the last cycle start until now
        // to see what is new pending rewards and what is monaRevenueRewardsEarned
        Staker storage staker = pools[_poolId].stakers[_user];

        uint256 secondsInCycle = pools[_poolId].daysInCycle.mul(SECONDS_IN_A_DAY);
        uint256 timeElapsedSinceStakingFromZero = _getNow().sub(staker.cycleStartTimestamp);
        uint256 startOfCurrentCycle = _getNow().sub(timeElapsedSinceStakingFromZero.mod(secondsInCycle));


        if (_user != address(0)) {
            // Check what state we are in TODO check this next line closely for accuracy of when cycle starts
            if(startOfCurrentCycle > staker.lastRewardUpdateTime) {
                // We are in a new cycle
                // Bring over the pending rewards, they have been earned
                rewards = rewards.add(staker.monaRevenueRewardsPending);

                // TODO triple check this - What it does is calculates reward pt during this cycle up to block timestamp

                uint256 monaPendingRewardsTotal = rewardsContract.MonaRevenueRewards(_poolId, startOfCurrentCycle,
                                                _getNow()).mul(1e18);

                // TODO triple check this - amount of rewards pending now for user
                uint256 pendingRewardsThisCycle = pools[_poolId].stakers[_user].balance.mul(monaPendingRewardsTotal)
                                                        .div(pools[_poolId].stakedMonaTotalForPool);
                // In case it overflows
                pendingRewardsThisCycle = pendingRewardsThisCycle.div(1e18);

                rewards = rewards.sub(pendingRewardsThisCycle);
                staker.monaRevenueRewardsPending = pendingRewardsThisCycle;

                // Set rewards (This includes old pending rewards and does not include new pending rewards)
                staker.monaRevenueRewardsEarned = staker.monaRevenueRewardsEarned.add(rewards);
                staker.lastRewardPoints = pools[_poolId].rewardsPerTokenPoints;
                staker.lastRewardUpdateTime = _getNow();
            } else {
                // We are still in the same cycle as the last reward update
                staker.monaRevenueRewardsPending = staker.monaRevenueRewardsPending.add(rewards);
                staker.lastRewardPoints = pools[_poolId].rewardsPerTokenPoints;
                staker.lastRewardUpdateTime = _getNow();
            }
        }
    }

    /*
     * @dev The rewards are dynamic and normalised from the other pools
     * @dev This gets the rewards from each of the periods as one multiplier
     */
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


     /*
      * @notice Returns the about of rewards yet to be claimed (this currently includes pending and awarded together
      * @param _poolId the id of the pool we are interested in
      * @param _user the user we are interested in
      * @dev returns the claimable rewards and pending rewards
      */
    function unclaimedRewards(
        uint256 _poolId,
        address _user
    )
        public
        view
        returns(uint256 claimableRewards, uint256 pendingRewards)
    {
        if (pools[_poolId].stakedMonaTotalForPool == 0) {
            return (0,0);
        }

        uint256 monaRewards = rewardsContract.MonaRevenueRewards(_poolId, pools[_poolId].lastUpdateTime,
                                                        _getNow());

        uint256 newRewardPerToken = pools[_poolId].rewardsPerTokenPoints.add(monaRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(pools[_poolId].stakedMonaTotalForPool))
                                                         .sub(pools[_poolId].stakers[_user].lastRewardPoints);

        uint256 newRewards = pools[_poolId].stakers[_user].balance.mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);

        // Figure out how much rewards are still pending
        Staker storage staker = pools[_poolId].stakers[_user];
        uint256 secondsInCycle = pools[_poolId].daysInCycle.mul(SECONDS_IN_A_DAY);
        uint256 timeElapsedSinceStakingFromZero = _getNow().sub(staker.cycleStartTimestamp);
        uint256 startOfCurrentCycle = _getNow().sub(timeElapsedSinceStakingFromZero.mod(secondsInCycle));

        if(startOfCurrentCycle > staker.lastRewardUpdateTime) {
            // We are in a new cycle
            // Bring over the pending rewards, they have been earned
            newRewards = newRewards.add(pools[_poolId].stakers[_user].monaRevenueRewardsEarned).sub(pools[_poolId].stakers[_user].monaRevenueRewardsReleased);
            // New cycle, the pending rewards from before move over
            newRewards = newRewards.add(staker.monaRevenueRewardsPending);

            // TODO triple check this - What it does is calculates reward pt during this cycle up to block timestamp
            uint256 monaPendingRewardsTotal = rewardsContract.MonaRevenueRewards(_poolId, startOfCurrentCycle,
                _getNow()).mul(1e18);

            // TODO triple check this - amount of rewards pending now for user
            pendingRewards = pools[_poolId].stakers[_user].balance.mul(monaPendingRewardsTotal);
            pendingRewards = pendingRewards.div(pools[_poolId].stakedMonaTotalForPool);
            // The pending rewards are now just what is in this cycle (calculation in case it overflows)
            pendingRewards = pendingRewards.div(1e18);

            claimableRewards = newRewards.sub(pendingRewards);
        } else {
            // We are in the same cycle, these new rewards calculated above are pending rewards. So no change to claimable rewards
            claimableRewards = pools[_poolId].stakers[_user].monaRevenueRewardsEarned.sub(pools[_poolId].stakers[_user].monaRevenueRewardsReleased);
            // The new rewards we calculated earlier are in the same cycle
            pendingRewards = newRewards.add(pools[_poolId].stakers[_user].monaRevenueRewardsPending);
        }
    }


    /*
     * @notice Lets a user with rewards owing to claim tokens
     */
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
    
        uint256 payableAmount = staker.monaRevenueRewardsEarned.sub(staker.monaRevenueRewardsReleased);
        staker.monaRevenueRewardsReleased = staker.monaRevenueRewardsReleased.add(payableAmount);

        /// @dev accounts for dust 
        uint256 rewardBal = IERC20(monaToken).balanceOf(address(this));
        if (payableAmount > rewardBal) {
            payableAmount = rewardBal;
        }
        
        IERC20(monaToken).transfer(_user, payableAmount);
        emit MonaRevenueRewardPaid(_user, payableAmount);
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
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxMonaStaking.reclaimERC20: Sender must be admin"
        );
        require(
            _tokenAddress != address(monaToken),
            "DigitalaxMonaStaking.reclaimERC20: Cannot withdraw the rewards token"
        );
        IERC20(_tokenAddress).transfer(msg.sender, _tokenAmount);
        emit ReclaimedERC20(_tokenAddress, _tokenAmount);
    }

    /**
    * @notice EMERGENCY Recovers ETH, drains all ETH sitting on the smart contract
    * @dev Only access controls admin can access
    */
    function reclaimETH(uint256 _amount) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxMonaStaking.reclaimETH: Sender must be admin"
        );
        msg.sender.transfer(address(this).balance);
    }
}