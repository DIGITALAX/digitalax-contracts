// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "../DigitalaxGenesisNFT.sol";
import "./interfaces/IERC20.sol";
import "../uniswapv2/interfaces/IUniswapV2Pair.sol";
import "../uniswapv2/libraries/UniswapV2Library.sol";

/**
 * @title Digitalax Rewards
 * @dev Calculates the rewards for staking on the Digitialax platform
 * @author Adrian Guerrera (deepyr)
 * @author DIGITALAX CORE TEAM
 */

interface DigitalaxStaking {
    function stakedEthTotal() external view returns (uint256);
    function monaToken() external view returns (address);
    function WETH() external view returns (address);
}

interface MONA is IERC20 {
    function mint(address tokenOwner, uint tokens) external returns (bool);
}

contract DigitalaxRewards {
    using SafeMath for uint256;

    /* ========== Variables ========== */

    MONA public rewardsToken;
    DigitalaxAccessControls public accessControls;
 //   DigitalaxStaking public genesisStaking;
 //   DigitalaxStaking public parentStaking;
    DigitalaxStaking public monaStaking;

    uint256 constant pointMultiplier = 10e18;
    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 constant SECONDS_PER_WEEK = 7 * 24 * 60 * 60;
    
    // weekNumber => rewards
    mapping (uint256 => uint256) public weeklyRewardsPerSecond;
    mapping (address => mapping(uint256 => uint256)) public weeklyBonusPerSecond;

    uint256 public startTime;
    uint256 public lastRewardTime;


    uint256 public rewardsPaid;

    /* ========== Structs ========== */

    struct Weights {
        uint256 genesisWtPoints;
        uint256 parentWtPoints;
        uint256 monaWeightPoints;
    }

    /// @notice mapping of a staker to its current properties
    mapping (uint256 => Weights) public weeklyWeightPoints;

    /* ========== Events ========== */

    event RewardAdded(address indexed addr, uint256 reward);
    event RewardDistributed(address indexed addr, uint256 reward);
    event Recovered(address indexed token, uint256 amount);

    
    /* ========== Admin Functions ========== */
    constructor(
        MONA _rewardsToken,
        DigitalaxAccessControls _accessControls,
        DigitalaxStaking _monaStaking,
        uint256 _startTime,
        uint256 _lastRewardTime,
        uint256 _rewardsPaid

    )
        public
    {
        rewardsToken = _rewardsToken;
        accessControls = _accessControls;
        monaStaking = _monaStaking;
        startTime = _startTime;
        lastRewardTime = _lastRewardTime;
        rewardsPaid = _rewardsPaid;
    }

    /// @dev Setter functions for contract config
    function setStartTime(
        uint256 _startTime,
        uint256 _lastRewardTime
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewards.setStartTime: Sender must be admin"
        );
        startTime = _startTime;
        lastRewardTime = _lastRewardTime;
    }

    /// @dev Setter functions for contract config
    function setInitialPoints(
        uint256 week,
//        uint256 gW,
//        uint256 pW,
        uint256 mW

    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewards.setStartTime: Sender must be admin"
        );
        Weights storage weights = weeklyWeightPoints[week];
//        weights.genesisWtPoints = gW;
//        weights.parentWtPoints = pW;
        weights.monaWeightPoints = mW;

    }

    function setmonaStaking(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewards.setmonaStaking: Sender must be admin"
        );
        monaStaking = DigitalaxStaking(_addr);
    } 

    /// @notice Set rewards distributed each week
    /// @dev this number is the total rewards that week with 18 decimals
    function setRewards(
        uint256[] memory rewardWeeks,
        uint256[] memory amounts
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewards.setRewards: Sender must be admin"
        );
        uint256 numRewards = rewardWeeks.length;
        for (uint256 i = 0; i < numRewards; i++) {
            uint256 week = rewardWeeks[i];
            uint256 amount = amounts[i].mul(pointMultiplier)
                                       .div(SECONDS_PER_WEEK)
                                       .div(pointMultiplier);
            weeklyRewardsPerSecond[week] = amount;
        }
    }
    /// @notice Set rewards distributed each week
    /// @dev this number is the total rewards that week with 18 decimals
    function bonusRewards(
        address pool,
        uint256[] memory rewardWeeks,
        uint256[] memory amounts
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewards.setRewards: Sender must be admin"
        );
        uint256 numRewards = rewardWeeks.length;
        for (uint256 i = 0; i < numRewards; i++) {
            uint256 week = rewardWeeks[i];
            uint256 amount = amounts[i].mul(pointMultiplier)
                                       .div(SECONDS_PER_WEEK)
                                       .div(pointMultiplier);
            weeklyBonusPerSecond[pool][week] = amount;
        }
    }

    // From BokkyPooBah's DateTime Library v1.01
    // https://github.com/bokkypoobah/BokkyPooBahsDateTimeLibrary
    function diffDays(uint fromTimestamp, uint toTimestamp) internal pure returns (uint _days) {
        require(fromTimestamp <= toTimestamp);
        _days = (toTimestamp - fromTimestamp) / SECONDS_PER_DAY;
    }


    /* ========== Mutative Functions ========== */

    /// @notice Calculate the current normalised weightings and update rewards
    /// @dev 
    function updateRewards() 
        external
        returns(bool)
    {
        if (block.timestamp <= lastRewardTime) {
            return false;
        }
//        uint256 g_net = genesisStaking.stakedEthTotal();
//        uint256 p_net = parentStaking.stakedEthTotal();
        uint256 m_net  = monaStaking.stakedEthTotal();

        /// @dev check that the staking pools have contributions, and rewards have started
        if (block.timestamp <= startTime) {
            lastRewardTime = block.timestamp;
            return false;
        }

        (uint256 gW, uint256 pW, uint256 mW) = _getReturnWeights(m_net, m_net, m_net); // Dont take this out for now, just compute based on 1 pool
        _updateWeightingAcc(mW);

        /// @dev This mints and sends rewards
        _updateMonaRewards();

        /// @dev update accumulated reward
        lastRewardTime = block.timestamp;
        return true;
    }


    /* ========== View Functions ========== */

    /// @notice Gets the total rewards outstanding from last reward time
    function totalRewards() external view returns (uint256) {
        uint256 lRewards = MonaRewards(lastRewardTime, block.timestamp);
        return lRewards;
    }


    /// @notice Gets the total contributions from the staked contracts
    function getTotalContributions()
        external
        view
        returns(uint256)
    {
        return monaStaking.stakedEthTotal();
    }

    /// @dev Getter functions for Rewards contract
    function getCurrentRewardWeek()
        external 
        view 
        returns(uint256)
    {
        return diffDays(startTime, block.timestamp) / 7;
    }

    function totalRewardsPaid()
        external
        view
        returns(uint256)
    {
        return rewardsPaid;
    }

    /// @notice Return mona rewards over the given _from to _to timestamp.
    /// @dev A fraction of the start, multiples of the middle weeks, fraction of the end
    function MonaRewards(uint256 _from, uint256 _to) public view returns (uint256 rewards) {
        if (_to <= startTime) {
            return 0;
        }
        if (_from < startTime) {
            _from = startTime;
        }
        uint256 fromWeek = diffDays(startTime, _from) / 7;                      
        uint256 toWeek = diffDays(startTime, _to) / 7;                          

        if (fromWeek == toWeek) {
            return _rewardsFromPoints(weeklyRewardsPerSecond[fromWeek],
                                    _to.sub(_from),
                                    weeklyWeightPoints[fromWeek].monaWeightPoints)
                        .add(weeklyBonusPerSecond[address(monaStaking)][fromWeek].mul(_to.sub(_from)));
        }
        /// @dev First count remainer of first week 
        uint256 initialRemander = startTime.add((fromWeek+1).mul(SECONDS_PER_WEEK)).sub(_from);
        rewards = _rewardsFromPoints(weeklyRewardsPerSecond[fromWeek],
                                    initialRemander,
                                    weeklyWeightPoints[fromWeek].monaWeightPoints)
                        .add(weeklyBonusPerSecond[address(monaStaking)][fromWeek].mul(initialRemander));

        /// @dev add multiples of the week
        for (uint256 i = fromWeek+1; i < toWeek; i++) {
            rewards = rewards.add(_rewardsFromPoints(weeklyRewardsPerSecond[i],
                                    SECONDS_PER_WEEK,
                                    weeklyWeightPoints[i].monaWeightPoints))
                             .add(weeklyBonusPerSecond[address(monaStaking)][i].mul(SECONDS_PER_WEEK));
        }
        /// @dev Adds any remaining time in the most recent week till _to
        uint256 finalRemander = _to.sub(toWeek.mul(SECONDS_PER_WEEK).add(startTime));
        rewards = rewards.add(_rewardsFromPoints(weeklyRewardsPerSecond[toWeek],
                                    finalRemander,
                                    weeklyWeightPoints[toWeek].monaWeightPoints))
                        .add(weeklyBonusPerSecond[address(monaStaking)][toWeek].mul(finalRemander));
        return rewards;
    }


    /* ========== Internal Functions ========== */

    function _updateMonaRewards()
        internal
        returns(uint256 rewards)
    {
        rewards = MonaRewards(lastRewardTime, block.timestamp);
        if ( rewards > 0 ) {
            rewardsPaid = rewardsPaid.add(rewards);
            require(rewardsToken.mint(address(monaStaking), rewards));
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

    /// @dev Internal fuction to update the weightings 
    function _updateWeightingAcc(uint256 mW) internal {
        uint256 currentWeek = diffDays(startTime, block.timestamp) / 7;
        uint256 lastRewardWeek = diffDays(startTime, lastRewardTime) / 7;
        uint256 startCurrentWeek = startTime.add(currentWeek.mul(SECONDS_PER_WEEK)); 

        /// @dev Initialisation of new weightings and fill gaps
        if ( weeklyWeightPoints[0].monaWeightPoints == 0  ) {
            Weights storage weights = weeklyWeightPoints[0];
//            weights.genesisWtPoints = gW;
//            weights.parentWtPoints = pW;
            weights.monaWeightPoints = mW;
        }
        /// @dev Fill gaps in weightings
        if (lastRewardWeek < currentWeek ) {
            /// @dev Back fill missing weeks
            for (uint256 i = lastRewardWeek+1; i <= currentWeek; i++) {
                Weights storage weights = weeklyWeightPoints[i];
//                weights.genesisWtPoints = gW;
//                weights.parentWtPoints = pW;
                weights.monaWeightPoints = mW;
            }
            return;
        }      
        /// @dev Calc the time weighted averages
        Weights storage weights = weeklyWeightPoints[currentWeek];
//        weights.genesisWtPoints = _calcWeightPoints(weights.genesisWtPoints,gW,startCurrentWeek);
//        weights.parentWtPoints = _calcWeightPoints(weights.parentWtPoints,pW,startCurrentWeek);
        weights.monaWeightPoints = _calcWeightPoints(weights.monaWeightPoints,mW,startCurrentWeek);
    }

    /// @dev Time weighted average of the token weightings
    function _calcWeightPoints(
        uint256 prevWeight,
        uint256 newWeight,
        uint256 startCurrentWeek
    ) 
        internal 
        view 
        returns(uint256) 
    {
        uint256 previousWeighting = prevWeight.mul(lastRewardTime.sub(startCurrentWeek));
        uint256 currentWeighting = newWeight.mul(block.timestamp.sub(lastRewardTime));
        return previousWeighting.add(currentWeighting)
                                .div(block.timestamp.sub(startCurrentWeek));
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256 c) {
        c = a >= b ? a : b;
    }
    
    /// @notice Normalised weightings of weights with point multiplier 
    function _getReturnWeights(
        uint256 _g,
        uint256 _p,
        uint256 _m
    )   
        internal
        view
        returns(uint256,uint256,uint256)
    {
        uint256 eg = _g.mul(_getSqrtWeight(_g,_p,_m));
        uint256 ep = _p.mul(_getSqrtWeight(_p,_m,_g));
        uint256 em = _m.mul(_getSqrtWeight(_m,_g,_p));

        uint256 norm = eg.add(ep).add(em);

        return (eg.mul(pointMultiplier).mul(1e18).div(norm), ep.mul(pointMultiplier).mul(1e18).div(norm), 
                em.mul(pointMultiplier).mul(1e18).div(norm));

    }


    /// @notice Normalised weightings  
    function _getSqrtWeight(
        uint256 _a,
        uint256 _b,
        uint256 _c
    )  
        internal
        view
        returns(
            uint256 wA
        )
    {
        if ( _a <= _b.add(_c) ||  _b.add(_c) == 0  ) {
            return 1e18;
        }
        /// @dev Normalised for each weighting
        uint256 A1 = max(_a.mul(1e18).div(max(_b,1e18)),1e18);
        uint256 A2 = max(_a.mul(1e18).div(max(_c,1e18)),1e18);
        uint256 A = A1.mul(A2).div(1e18);

        /// @dev sqrt needs to refactored by 1/2 decimals, ie 1e9
        wA = _sqrt(uint256(1e18).mul(1e18).div(A)).mul(1e9);
        
    }

    /// @dev babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
    function _sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /* ========== Recover ERC20 ========== */

    /// @notice allows for the recovery of incorrect ERC20 tokens sent to contract
    function recoverERC20(
        address tokenAddress,
        uint256 tokenAmount
    )
        external
    {
        // Cannot recover the staking token or the rewards token
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxRewards.recoverERC20: Sender must be admin"
        );
        require(
            tokenAddress != address(rewardsToken),
            "Cannot withdraw the rewards token"
        );
        IERC20(tokenAddress).transfer(msg.sender, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /**
    * @notice EMERGENCY Recovers ETH, drains all ETH sitting on the smart contract
    * @dev Only access controls admin can access
    */
    function recoverETH() external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxMarketplace.reclaimETH: Sender must be admin"
        );
        msg.sender.transfer(address(this).balance);
    }


    /* ========== Getters ========== */

    function getCurrentWeek()
        external
        view
        returns(uint256)
    {
        return diffDays(startTime, block.timestamp) / 7;
    }

    function getCurrentMonaWeightPoints()
        external
        view
        returns(uint256)
    {
        uint256 currentWeek = diffDays(startTime, block.timestamp) / 7;
        return weeklyWeightPoints[currentWeek].monaWeightPoints;
    }


    function getMonaStakedEthTotal()
        public
        view
        returns(uint256)
    {
        return monaStaking.stakedEthTotal();
    }

    function getMonaDailyAPY()
        external
        view 
        returns (uint256) 
    {
        uint256 stakedEth = getMonaStakedEthTotal();
        if ( stakedEth == 0 ) {
            return 0;
        }
        uint256 rewards = MonaRewards(block.timestamp - 60, block.timestamp);
        uint256 rewardsInEth = rewards.mul(getEthPerMona()).div(1e18);
        /// @dev minutes per year x 100 = 52560000
        return rewardsInEth.mul(52560000).mul(1e18).div(stakedEth);
    } 

    function getMonaPerEth()
        public 
        view 
        returns (uint256)
    {
        (uint256 wethReserve, uint256 tokenReserve) = getPairReserves();
        return UniswapV2Library.quote(1e18, wethReserve, tokenReserve);
    }

    function getEthPerMona()
        public
        view
        returns (uint256)
    {
        (uint256 wethReserve, uint256 tokenReserve) = getPairReserves();
        return UniswapV2Library.quote(1e18, tokenReserve, wethReserve);
    }

    function getPairReserves() internal view returns (uint256 wethReserves, uint256 tokenReserves) {
        (address token0,) = UniswapV2Library.sortTokens(address(monaStaking.WETH()), address(rewardsToken));
        (uint256 reserve0, uint reserve1,) = IUniswapV2Pair(monaStaking.monaToken()).getReserves();
        (wethReserves, tokenReserves) = token0 == address(rewardsToken) ? (reserve1, reserve0) : (reserve0, reserve1);
    }

}