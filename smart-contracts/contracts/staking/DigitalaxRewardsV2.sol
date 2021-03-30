// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "./interfaces/IERC20.sol";
import "../uniswapv2/interfaces/IUniswapV2Pair.sol";
import "../uniswapv2/libraries/UniswapV2Library.sol";

/**
 * @title Digitalax Rewards
 * @dev Calculates the rewards for staking on the Digitalax platform
 * @author DIGITALAX CORE TEAM
 * @author Based on original staking contract by Adrian Guerrera (deepyr)
 */

interface DigitalaxStaking {
    function stakedEthTotal() external view returns (uint256);
    function stakedEthTotalByPool(uint256 _poolId) external view returns (uint256);
    function earlyStakedEthTotalByPool(uint256 _poolId) external view returns (uint256);
    function stakedMonaInPool(uint256 _poolId) external view returns (uint256);
    function monaToken() external view returns (address);
    function WETH() external view returns (address);
}

interface MONA is IERC20 {
    function mint(address tokenOwner, uint tokens) external returns (bool);
}

contract DigitalaxRewardsV2 {
    using SafeMath for uint256;

    /* ========== Variables ========== */

    MONA public monaToken;
    IUniswapV2Pair public lpToken;
    DigitalaxAccessControls public accessControls;
    DigitalaxStaking public monaStaking;

    uint256 constant pointMultiplier = 10e18;
    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 constant SECONDS_PER_WEEK = 7 * 24 * 60 * 60;
    
    mapping (uint256 => uint256) public weeklyMonaRevenueSharingPerSecond; // Mona revenue sharing
    mapping (uint256 => uint256) public bonusWeeklyMonaRevenueSharingPerSecond; // Mona revenue sharing


    uint256 public startTime;
    uint256 public monaRewardsPaidTotal;
    uint256 public bonusMonaRewardsPaidTotal;

    // We must trust admin to pass correct weighted values, if not we could use something like
    // / @notice mapping of a staker to its current properties
    //mapping (uint256 => uint256) public weeklyTotalWeightPoints;

    /* @notice staking pool id to staking pool reward mapping
    */
    mapping (uint256 => StakingPoolRewards) public pools;

    /* ========== Structs ========== */
    /**
       @notice Struct to track the active pools
       @dev weeklyWeightPoints mapping the week to the weight for this pool
       @dev lastRewardsTime last time the overall rewards
       @dev rewardsPaid amount of rewards that have been paid to this pool
       */
    struct StakingPoolRewards {
        mapping (uint256 => WeeklyRewards) weeklyWeightPoints;
        uint256 lastRewardsTime;
        uint256 monaRewardsPaid;
    }

    struct WeeklyRewards {
        uint256 weightPointsRevenueSharing; // Weekly weight points For revenue sharing
        uint256 bonusWeightPointsRevenueSharing; // Weekly weight points For revenue sharing based on the bonus structure
    }

    /* ========== Events ========== */
    event UpdateAccessControls(
        address indexed accessControls
    );
    event RewardAdded(address indexed addr, uint256 reward);
    event RewardDistributed(address indexed addr, uint256 reward);
    event ReclaimedERC20(address indexed token, uint256 amount);

    event DepositRevenueSharing(uint256 weeklyMonaRevenueSharingPerSecond, uint256 bonusWeeklyMonaRevenueSharingPerSecond);

    
    /* ========== Admin Functions ========== */
    constructor(
        MONA _monaToken,
        DigitalaxAccessControls _accessControls,
        DigitalaxStaking _monaStaking,
        IUniswapV2Pair _lpToken,
        uint256 _startTime,
        uint256 _monaRewardsPaidTotal,
        uint256 _bonusMonaRewardsPaidTotal
    )
        public
    {
        require(
            address(_monaToken) != address(0),
            "DigitalaxRewardsV2: Invalid Mona Address"
        );
        require(
            address(_accessControls) != address(0),
            "DigitalaxRewardsV2: Invalid Access Controls"
        );
        require(
            address(_monaStaking) != address(0),
            "DigitalaxRewardsV2: Invalid Mona Staking"
        );
        require(
            address(_lpToken) != address(0),
            "DigitalaxRewardsV2: Invalid Mona LP"
        );
        monaToken = _monaToken;
        accessControls = _accessControls;
        monaStaking = _monaStaking;
        lpToken = _lpToken;
        startTime = _startTime;
        monaRewardsPaidTotal = _monaRewardsPaidTotal;
        bonusMonaRewardsPaidTotal = _bonusMonaRewardsPaidTotal;
    }
    receive() external payable {
    }

    /*
     * @notice Set the start time
     * @dev Setter functions for contract config
    */
    function setStartTime(
        uint256 _startTime
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewardsV2.setStartTime: Sender must be admin"
        );
        startTime = _startTime;
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewardsV2.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "DigitalaxRewardsV2.updateAccessControls: Zero Address");
        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }

    /**
     @notice Method for updating the address of the mona staking contract
     @dev Only admin
     @param _addr Address of the mona staking contract
    */
    function setMonaStaking(address _addr)
        external
        {
            require(
                accessControls.hasAdminRole(msg.sender),
                "DigitalaxRewardsV2.setMonaStaking: Sender must be admin"
            );
            monaStaking = DigitalaxStaking(_addr);
    }

    /*
     * @dev Setter functions for contract config
     * @param _week the week to be changed
     * @param _poolIds the ids of the pools that are being modified
     * @param _weightPointsRevenueSharing the weights of the pools to be entered (must be calculated off chain)
     * @param _bonusWeightPointsRevenueSharing the bonus weights of the pools to be entered (must be calculated off chain)
     */
    function initializePools(
        uint256 _poolId,
        uint256[] calldata _weeks,
        uint256[] calldata _weightPointsRevenueSharing,
        uint256[] calldata _bonusWeightPointsRevenueSharing
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewardsV2.initializePools: Sender must be admin"
        );

        require(
            _weeks.length >= 1,
            "DigitalaxRewardsV2.initializePools: Must be 1 or more weeks"
        );

        require(
            _weeks.length == _weightPointsRevenueSharing.length,
            "DigitalaxRewardsV2.initializePools: Please check weeks and weight point revenue lengths"
        );

        require(
            _weeks.length == _bonusWeightPointsRevenueSharing.length,
            "DigitalaxRewardsV2.initializePools: Please check weeks and bonus weight point revenue lengths"
        );


        for (uint256 i = 0; i < _weeks.length; i++) {
            WeeklyRewards storage weeklyRewards = pools[_poolId].weeklyWeightPoints[_weeks[i]];
            weeklyRewards.weightPointsRevenueSharing = _weightPointsRevenueSharing[i]; // Revenue sharing has no fixed return, just weight of the marketplace rewards
            weeklyRewards.bonusWeightPointsRevenueSharing = _bonusWeightPointsRevenueSharing[i]; // Bonus Revenue sharing has no fixed return, just weight of the marketplace rewards
         }
    }

    /*
     * @notice Deposit revenue sharing rewards to be distributed during a certain week
     * @dev this number is the total rewards that week with 18 decimals
     */
    function depositRevenueSharingRewards(
        uint256 _poolId,
        uint256 _week,
        uint256 _amount,
        uint256 _bonusAmount
    )
        external payable
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewardsV2.setRewards: Sender must be admin"
        );

        require(
            _week > getCurrentWeek(),
            "DigitalaxRewardsV2.depositRevenueSharingRewards: The rewards generated should be set for the future weeks"
        );

        require(IERC20(monaToken).allowance(msg.sender, address(this)) >= _amount.add(_bonusAmount), "DigitalaxRewardsV2.depositRevenueSharingRewards: Failed to supply ERC20 Allowance");

        // Deposit this amount of MONA here
        require(IERC20(monaToken).transferFrom(
            address(msg.sender),
            address(this),
            _amount.add(_bonusAmount)
        ));


        uint256 monaAmount = _amount.mul(pointMultiplier)
                                   .div(SECONDS_PER_WEEK)
                                   .div(pointMultiplier);

        uint256 bonusMonaAmount = _bonusAmount.mul(pointMultiplier)
                                   .div(SECONDS_PER_WEEK)
                                   .div(pointMultiplier);


        // Increase the revenue sharing per second for the week for Mona
        weeklyMonaRevenueSharingPerSecond[_week] = weeklyMonaRevenueSharingPerSecond[_week].add(monaAmount);
        bonusWeeklyMonaRevenueSharingPerSecond[_week] = bonusWeeklyMonaRevenueSharingPerSecond[_week].add(bonusMonaAmount);


        emit DepositRevenueSharing(weeklyMonaRevenueSharingPerSecond[_week], bonusWeeklyMonaRevenueSharingPerSecond[_week]);
    }

    /* From BokkyPooBah's DateTime Library v1.01
     * https://github.com/bokkypoobah/BokkyPooBahsDateTimeLibrary
     */
    function diffDays(uint fromTimestamp, uint toTimestamp) internal pure returns (uint _days) {
        require(fromTimestamp <= toTimestamp);
        _days = (toTimestamp - fromTimestamp) / SECONDS_PER_DAY;
    }


    /* ========== Mutative Functions ========== */

    /* @notice Calculate and update rewards
     * @dev
     */
    function updateRewards(uint256 _poolId)
        external
        returns(bool)
    {
        if (_getNow() <= pools[_poolId].lastRewardsTime) {
            return false;
        }

        /// @dev check that the staking pools have contributions, and rewards have started
        if (_getNow() <= startTime) {
            pools[_poolId].lastRewardsTime = _getNow();
            return false;
        }

        /// @dev This sends rewards (Mona from revenue sharing)
        _updateMonaRewards(_poolId);

        /// @dev This sends the bonus rewards (Mona from revenue sharing)
        _updateBonusMonaRewards(_poolId);

        /// @dev update accumulated reward
        pools[_poolId].lastRewardsTime = _getNow();
        return true;
    }


    /*
     * @dev Setter functions for contract config custom last rewards time for a pool
     */
    function setLastRewardsTime(
    uint256[] memory _poolIds,
    uint256[] memory _lastRewardsTimes) external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewardsV2.setLastRewardsTime: Sender must be admin"
        );
        for (uint256 i = 0; i < _poolIds.length; i++) {
            pools[_poolIds[i]].lastRewardsTime = _lastRewardsTimes[i];
        }
    }


    /* ========== View Functions ========== */

    /*
     * @notice Gets the total rewards outstanding from last reward time
     */
    function totalNewMonaRewards(uint256 _poolId) external view returns (uint256) {
        uint256 lRewards = MonaRevenueRewards(_poolId, pools[_poolId].lastRewardsTime, _getNow());
        return lRewards;
    }

    /*
     * @notice Get the last rewards time for a pool
     * @return last rewards time for a pool
     */
    function lastRewardsTime(uint256 _poolId)
        external
        view
        returns(uint256)
    {
        return pools[_poolId].lastRewardsTime;
    }

    /* @notice Return mona revenue rewards over the given _from to _to timestamp.
     * @dev A fraction of the start, multiples of the middle weeks, fraction of the end
     */
    function MonaRevenueRewards(uint256 _poolId, uint256 _from, uint256 _to) public view returns (uint256 rewards) {
        if (_to <= startTime) {
            return 0;
        }
        if (_from < startTime) {
            _from = startTime;
        }
        uint256 fromWeek = diffDays(startTime, _from) / 7;                      
        uint256 toWeek = diffDays(startTime, _to) / 7;                          

        if (fromWeek == toWeek) {
            return _rewardsFromPoints(weeklyMonaRevenueSharingPerSecond[fromWeek],
                                    _to.sub(_from),
                                    pools[_poolId].weeklyWeightPoints[fromWeek].weightPointsRevenueSharing);
        }
        /// @dev First count remainder of first week
        uint256 initialRemander = startTime.add((fromWeek+1).mul(SECONDS_PER_WEEK)).sub(_from);
        rewards = _rewardsFromPoints(weeklyMonaRevenueSharingPerSecond[fromWeek],
                                    initialRemander,
                                    pools[_poolId].weeklyWeightPoints[fromWeek].weightPointsRevenueSharing);

        /// @dev add multiples of the week
        for (uint256 i = fromWeek+1; i < toWeek; i++) {
            rewards = rewards.add(_rewardsFromPoints(weeklyMonaRevenueSharingPerSecond[i],
                                    SECONDS_PER_WEEK,
                                    pools[_poolId].weeklyWeightPoints[i].weightPointsRevenueSharing));
        }
        /// @dev Adds any remaining time in the most recent week till _to
        uint256 finalRemander = _to.sub(toWeek.mul(SECONDS_PER_WEEK).add(startTime));
        rewards = rewards.add(_rewardsFromPoints(weeklyMonaRevenueSharingPerSecond[toWeek],
                                    finalRemander,
                                    pools[_poolId].weeklyWeightPoints[toWeek].weightPointsRevenueSharing));
        return rewards;
    }

    /* @notice Return bonus mona revenue rewards over the given _from to _to timestamp.
     * @dev A fraction of the start, multiples of the middle weeks, fraction of the end
     */
    function BonusMonaRevenueRewards(uint256 _poolId, uint256 _from, uint256 _to) public view returns (uint256 rewards) {
        if (_to <= startTime) {
            return 0;
        }
        if (_from < startTime) {
            _from = startTime;
        }
        uint256 fromWeek = diffDays(startTime, _from) / 7;
        uint256 toWeek = diffDays(startTime, _to) / 7;

        if (fromWeek == toWeek) {
            return _rewardsFromPoints(bonusWeeklyMonaRevenueSharingPerSecond[fromWeek],
                                    _to.sub(_from),
                                    pools[_poolId].weeklyWeightPoints[fromWeek].bonusWeightPointsRevenueSharing);
        }
        /// @dev First count remainder of first week
        uint256 initialRemander = startTime.add((fromWeek+1).mul(SECONDS_PER_WEEK)).sub(_from);
        rewards = _rewardsFromPoints(bonusWeeklyMonaRevenueSharingPerSecond[fromWeek],
                                    initialRemander,
                                    pools[_poolId].weeklyWeightPoints[fromWeek].bonusWeightPointsRevenueSharing);

        /// @dev add multiples of the week
        for (uint256 i = fromWeek+1; i < toWeek; i++) {
            rewards = rewards.add(_rewardsFromPoints(bonusWeeklyMonaRevenueSharingPerSecond[i],
                                    SECONDS_PER_WEEK,
                                    pools[_poolId].weeklyWeightPoints[i].bonusWeightPointsRevenueSharing));
        }
        /// @dev Adds any remaining time in the most recent week till _to
        uint256 finalRemander = _to.sub(toWeek.mul(SECONDS_PER_WEEK).add(startTime));
        rewards = rewards.add(_rewardsFromPoints(bonusWeeklyMonaRevenueSharingPerSecond[toWeek],
                                    finalRemander,
                                    pools[_poolId].weeklyWeightPoints[toWeek].bonusWeightPointsRevenueSharing));
        return rewards;
    }

    /* ========== Internal Functions ========== */


    function _updateMonaRewards(uint256 _poolId)
        internal
        returns(uint256 rewards)
    {
        rewards = MonaRevenueRewards(_poolId, pools[_poolId].lastRewardsTime, _getNow());
        if ( rewards > 0 ) {
            pools[_poolId].monaRewardsPaid = pools[_poolId].monaRewardsPaid.add(rewards);
            monaRewardsPaidTotal = monaRewardsPaidTotal.add(rewards);

            // Send this amount of MONA to the staking contract
            IERC20(monaToken).transfer(
                address(monaStaking),
                rewards
            );
        }
    }

    function _updateBonusMonaRewards(uint256 _poolId)
        internal
        returns(uint256 rewards)
    {
        rewards = BonusMonaRevenueRewards(_poolId, pools[_poolId].lastRewardsTime, _getNow());
        if ( rewards > 0 ) {
            pools[_poolId].monaRewardsPaid = pools[_poolId].monaRewardsPaid.add(rewards);
            monaRewardsPaidTotal = monaRewardsPaidTotal.add(rewards);

            // Send this amount of MONA to the staking contract
            IERC20(monaToken).transfer(
                address(monaStaking),
                rewards
            );
        }
    }

    function _rewardsFromPoints(
        uint256 rate,
        uint256 duration, 
        uint256 weight
    ) 
        internal
        pure
        returns(uint256)
    {
        return rate.mul(duration)
            .mul(weight)
            .div(1e18)
            .div(pointMultiplier);
    }


    /* ========== Reclaim ERC20 ========== */

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
            "DigitalaxRewardsV2.reclaimERC20: Sender must be admin"
        );
//        require(
//            tokenAddress != address(monaToken),
//            "Cannot withdraw the rewards token"
//        );
        IERC20(_tokenAddress).transfer(msg.sender, _tokenAmount);
        emit ReclaimedERC20(_tokenAddress, _tokenAmount);
    }

    /**
    * @notice EMERGENCY Recovers ETH, drains amount of eth sitting on the smart contract
    * @dev Only access controls admin can access
    */
    function reclaimETH(uint256 _amount) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewardsV2.reclaimETH: Sender must be admin"
        );
        msg.sender.transfer(_amount);
    }


    /* ========== Getters ========== */

    function getCurrentWeek()
        public
        view
        returns(uint256)
    {
        return diffDays(startTime, _getNow()) / 7;
    }

    function getMonaWeightPoints(uint256 _poolId, uint256 _week)
        external
        view
        returns(uint256)
    {
        return pools[_poolId].weeklyWeightPoints[_week].weightPointsRevenueSharing;
    }

    function getMonaStakedEthTotal()
        public
        view
        returns(uint256)
    {
        return monaStaking.stakedEthTotal();
    }

    function getMonaDailyAPY(uint256 _poolId, bool isEarlyStaker)
        external
        view 
        returns (uint256) 
    {
        uint256 stakedEth = monaStaking.stakedEthTotalByPool(_poolId);

        uint256 yearlyReturnInEth = 0;

        if ( stakedEth != 0) {
            uint256 rewards = MonaRevenueRewards(_poolId, _getNow() - 60, _getNow());
            uint256 rewardsInEth = rewards.mul(getEthPerMona()).div(1e18);

            /// @dev minutes per year x 100 = 52560000
            yearlyReturnInEth = rewardsInEth.mul(52560000).mul(1e18).div(stakedEth);
        }

        uint256 yearlyEarlyReturnInEth = 0;

        if(isEarlyStaker){
            uint256 earlyStakedEth = monaStaking.earlyStakedEthTotalByPool(_poolId);
            if ( earlyStakedEth != 0) {
                uint256 bonusRewards = BonusMonaRevenueRewards(_poolId, _getNow() - 60, _getNow());
                uint256 bonusRewardsInEth = bonusRewards.mul(getEthPerMona()).div(1e18);

                /// @dev minutes per year x 100 = 52560000
                yearlyEarlyReturnInEth = bonusRewardsInEth.mul(52560000).mul(1e18).div(earlyStakedEth);
            }
        }
      return yearlyReturnInEth.add(yearlyEarlyReturnInEth);
    } 

    // MONA amount for custom ETH amount
    function getMonaPerEth(uint256 _ethAmt)
        public 
        view 
        returns (uint256)
    {
        (uint256 wethReserve, uint256 tokenReserve) = getPairReserves();
        return UniswapV2Library.quote(_ethAmt, wethReserve, tokenReserve);
    }

    // ETH amount for 1 MONA
    function getEthPerMona()
        public
        view
        returns (uint256)
    {
        (uint256 wethReserve, uint256 tokenReserve) = getPairReserves();
        return UniswapV2Library.quote(1e18, tokenReserve, wethReserve);
    }

    function getPairReserves() internal view returns (uint256 wethReserves, uint256 tokenReserves) {
        (address token0,) = UniswapV2Library.sortTokens(address(monaStaking.WETH()), address(monaToken));
        (uint256 reserve0, uint reserve1,) = lpToken.getReserves();
        (wethReserves, tokenReserves) = token0 == address(monaToken) ? (reserve1, reserve0) : (reserve0, reserve1);
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}