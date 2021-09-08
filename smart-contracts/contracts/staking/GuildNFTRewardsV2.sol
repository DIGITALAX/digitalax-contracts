

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "./interfaces/IERC20.sol";
import "../oracle/IOracle.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IGuildNFTRewards.sol";
import "./interfaces/IGuildNFTRewardsWhitelisted.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

import "hardhat/console.sol";

/**
 * @title Digitalax Rewards
 * @dev Calculates the rewards for staking on the Digitalax platform
 * @author DIGITALAX CORE TEAM
 * @author Based on original staking contract by Adrian Guerrera (deepyr)
 */

interface DigitalaxStaking {
    function stakedEthTotal() external view returns (uint256);
}

interface WhitelistedNFTStaking {
    function whitelistedNFTStakedTotal() external view returns (uint256);
}

interface DECO is IERC20 {
    function mint(address tokenOwner, uint tokens) external returns (bool);
}

contract GuildNFTRewardsV2 is Initializable, BaseRelayRecipient, ReentrancyGuard, IGuildNFTRewards, IGuildNFTRewardsWhitelisted {
    using SafeMath for uint256;

    /* ========== Variables ========== */

    DECO public decoToken;
    IOracle public oracle;
    DigitalaxAccessControls public accessControls;
    DigitalaxStaking public nftStaking;
    WhitelistedNFTStaking public whitelistedNFTStaking;

    uint256 constant pointMultiplier = 10e18;
    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 constant SECONDS_PER_WEEK = 7 * 24 * 60 * 60;

    mapping (uint256 => uint256) public weeklyRewardsPerSecond; // Deco revenue sharing


    uint256 public startTime;
    uint256 public decoRewardsPaidTotal;

    uint256 podeTokenWtPoints;
    uint256 membershipNFTWtPoints;

    /// @notice for storing information from oracle
    uint256 public lastOracleQuote = 1e18;

    // We must trust admin to pass correct weighted values, if not we could use something like
    // / @notice mapping of a staker to its current properties
    //mapping (uint256 => uint256) public weeklyTotalWeightPoints;

    /* @notice staking pool id to staking pool reward mapping
    */
    StakingPoolRewards public pool;
    StakingPoolRewards public whitelistedNFTPool;

    /* ========== Structs ========== */
    /**
       @notice Struct to track the active pool
       @dev weeklyWeightPoints mapping the week to the weight for this pool
       @dev lastRewardsTime last time the overall rewards
       @dev rewardsPaid amount of rewards that have been paid to this pool
       */
    struct StakingPoolRewards {
        uint256 lastRewardsTime;
        uint256 decoRewardsPaid;
    }

    /* ========== Events ========== */
    event UpdateAccessControls(
        address indexed accessControls
    );
    event RewardAdded(address indexed addr, uint256 reward);
    event RewardDistributed(address indexed addr, uint256 reward);
    event ReclaimedERC20(address indexed token, uint256 amount);

    event UpdateOracle(address indexed oracle);

    /* ========== Admin Functions ========== */
    function initialize(
        DECO _decoToken,
        DigitalaxAccessControls _accessControls,
        DigitalaxStaking _nftStaking,
        WhitelistedNFTStaking _whitelistedNFTStaking,
        IOracle _oracle,
        address _trustedForwarder,
        uint256 _decoRewardsPaidTotal
    ) public initializer
    {
        require(
            address(_decoToken) != address(0),
            "DigitalaxRewardsV2: Invalid Deco Address"
        );
        require(
            address(_accessControls) != address(0),
            "DigitalaxRewardsV2: Invalid Access Controls"
        );
        require(
            address(_nftStaking) != address(0),
            "DigitalaxRewardsV2: Invalid Deco Staking"
        );
        require(
            address(_whitelistedNFTStaking) != address(0),
            "DigitalaxRewardsV2: Invalid Deco Staking"
        );
        require(
            address(_oracle) != address(0),
            "DigitalaxRewardsV2: Invalid Deco Oracle"
        );
        decoToken = _decoToken;
        accessControls = _accessControls;
        nftStaking = _nftStaking;
        whitelistedNFTStaking = _whitelistedNFTStaking;
        oracle = _oracle;
        startTime = _getNow();
        decoRewardsPaidTotal = _decoRewardsPaidTotal;
        trustedForwarder = _trustedForwarder;
    }

    receive() external payable {
    }


    function setTrustedForwarder(address _trustedForwarder) external  {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.setTrustedForwarder: Sender must be admin"
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

    /// @dev Setter functions for contract config
    function setWeightPoints(
    uint256 _podeTokenWtPoints,
    uint256 _membershipNFTWtPoints
    )
    external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTRewardsV2.setWeightPoints: Sender must be admin"
            );
        podeTokenWtPoints = _podeTokenWtPoints;
        membershipNFTWtPoints = _membershipNFTWtPoints;
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
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.setStartTime: Sender must be admin"
        );
        startTime = _startTime;
    }

    /**
     @notice Method for updating oracle
     @dev Only admin
     @param _oracle new oracle
     */
    function updateOracle(IOracle _oracle) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.updateOracle: Sender must be admin"
        );

        oracle = _oracle;
        emit UpdateOracle(address(_oracle));
    }


    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "DigitalaxRewardsV2.updateAccessControls: Zero Address");
        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }

    /**
     @notice Method for updating the address of the deco staking contract
     @dev Only admin
     @param _addr Address of the deco staking contract
    */
    function setPodeNftStaking(address _addr)
        external
        {
            require(
                accessControls.hasAdminRole(_msgSender()),
                "DigitalaxRewardsV2.setNftStaking: Sender must be admin"
            );
            nftStaking = DigitalaxStaking(_addr);
    }
    /**
     @notice Method for updating the address of the deco staking contract
     @dev Only admin
     @param _addr Address of the deco staking contract
    */
    function setWhitelistedNftStaking(address _addr)
        external
        {
            require(
                accessControls.hasAdminRole(_msgSender()),
                "DigitalaxRewardsV2.setNftStaking: Sender must be admin"
            );
            whitelistedNFTStaking = WhitelistedNFTStaking(_addr);
    }

    /* From BokkyPooBah's DateTime Library v1.01
     * https://github.com/bokkypoobah/BokkyPooBahsDateTimeLibrary
     */
    function diffDays(uint fromTimestamp, uint toTimestamp) internal pure returns (uint _days) {
        require(fromTimestamp <= toTimestamp);
        _days = (toTimestamp - fromTimestamp) / SECONDS_PER_DAY;
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
                "GuildNFTRewards.setRewards: Sender must be admin"
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

    /* ========== Mutative Functions ========== */

    /* @notice Calculate and update rewards
     * @dev
     */
    function updateRewards()
        external
        override
        returns(bool)
    {
        if (_getNow() <= pool.lastRewardsTime && _getNow() <= whitelistedNFTPool.lastRewardsTime) {
            return false;
        }

        /// @dev check that the staking pool has contributions, and rewards have started
        if (_getNow() <= startTime) {
            pool.lastRewardsTime = _getNow();
            whitelistedNFTPool.lastRewardsTime = _getNow();
            return false;
        }

        // @dev Update the oracle
        (uint256 exchangeRate, bool rateValid) = oracle.getData();
        require(rateValid, "DigitalaxMarketplace.estimateDecoAmount: Oracle data is invalid");
        lastOracleQuote = exchangeRate;


        /// @dev This sends rewards (Deco from revenue sharing)
        _updateDecoRewards();
        _updateWhitelistedNFTRewards();
        /// @dev update accumulated reward
        pool.lastRewardsTime = _getNow();
        whitelistedNFTPool.lastRewardsTime = _getNow();
        return true;
    }


    /*
     * @dev Setter functions for contract config custom last rewards time for a pool
     */
    function setLastRewardsTime(uint256 _lastRewardsTime) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.setLastRewardsTime: Sender must be admin"
        );

        pool.lastRewardsTime = _lastRewardsTime;
    }

    /*
     * @dev Setter functions for contract config custom last rewards time for a pool
     */
    function setWhitelistedNFTLastRewardsTime(uint256 _lastRewardsTime) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.setLastRewardsTime: Sender must be admin"
        );

        whitelistedNFTPool.lastRewardsTime = _lastRewardsTime;
    }


    /* ========== View Functions ========== */

    /*
     * @notice Gets the total rewards outstanding from last reward time
     */
    function totalDecoRewards() external override view returns (uint256) {
        return _totalDecoRewards();
    }


    /*
     * @notice Gets the total rewards outstanding from last reward time
     */
    function totalNewWhitelistedNFTRewards() external override view returns (uint256) {
        return _totalNewWhitelistedNFTRewards();
    }

     /*
     * @notice Gets the total rewards outstanding from last reward time
     */
    function _totalDecoRewards() internal view returns (uint256) {
        uint256 lRewards = DecoRewards(pool.lastRewardsTime, _getNow());
        return lRewards;
    }


    /*
     * @notice Gets the total rewards outstanding from last reward time
     */
    function _totalNewWhitelistedNFTRewards() internal view returns (uint256) {
        uint256 lRewards = WhitelistedNFTRewards(whitelistedNFTPool.lastRewardsTime, _getNow());
        return lRewards;
    }

    /*
     * @notice Get the last rewards time for a pool
     * @return last rewards time for a pool
     */
    function lastRewardsTime()
        external
        override
        view
        returns(uint256)
    {
        return pool.lastRewardsTime;
    }

    /*
     * @notice Get the last rewards time for a pool
     * @return last rewards time for a pool
     */
    function whitelistedNFTLastRewardsTime()
        external
        override
        view
        returns(uint256)
    {
        return whitelistedNFTPool.lastRewardsTime;
    }

    /* @notice Return deco revenue rewards over the given _from to _to timestamp.
     * @dev A fraction of the start, multiples of the middle weeks, fraction of the end
     */
    function DecoRewards(uint256 _from, uint256 _to) public override view returns (uint256 rewards) {
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
                                    _to.sub(_from), podeTokenWtPoints);
        }
        /// @dev First count remainder of first week
        uint256 initialRemander = startTime.add((fromWeek+1).mul(SECONDS_PER_WEEK)).sub(_from);
        rewards = _rewardsFromPoints(weeklyRewardsPerSecond[fromWeek],
                                    initialRemander, podeTokenWtPoints);

        /// @dev add multiples of the week
        for (uint256 i = fromWeek+1; i < toWeek; i++) {
            rewards = rewards.add(_rewardsFromPoints(weeklyRewardsPerSecond[i],
                                    SECONDS_PER_WEEK, podeTokenWtPoints));
        }
        /// @dev Adds any remaining time in the most recent week till _to
        uint256 finalRemander = _to.sub(toWeek.mul(SECONDS_PER_WEEK).add(startTime));
        rewards = rewards.add(_rewardsFromPoints(weeklyRewardsPerSecond[toWeek],
                                    finalRemander, podeTokenWtPoints));
        return rewards;
    }

 /* @notice Return deco revenue rewards over the given _from to _to timestamp.
     * @dev A fraction of the start, multiples of the middle weeks, fraction of the end
     */
    function WhitelistedNFTRewards(uint256 _from, uint256 _to) public override view returns (uint256 rewards) {
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
                                    _to.sub(_from), membershipNFTWtPoints);
        }
        /// @dev First count remainder of first week
        uint256 initialRemander = startTime.add((fromWeek+1).mul(SECONDS_PER_WEEK)).sub(_from);
        rewards = _rewardsFromPoints(weeklyRewardsPerSecond[fromWeek],
                                    initialRemander,membershipNFTWtPoints);

        /// @dev add multiples of the week
        for (uint256 i = fromWeek+1; i < toWeek; i++) {
            rewards = rewards.add(_rewardsFromPoints(weeklyRewardsPerSecond[i],
                                    SECONDS_PER_WEEK,membershipNFTWtPoints));
        }
        /// @dev Adds any remaining time in the most recent week till _to
        uint256 finalRemander = _to.sub(toWeek.mul(SECONDS_PER_WEEK).add(startTime));
        rewards = rewards.add(_rewardsFromPoints(weeklyRewardsPerSecond[toWeek],
                                    finalRemander,membershipNFTWtPoints));
        return rewards;
    }

    /* ========== Internal Functions ========== */


    function _updateDecoRewards()
        internal
        returns(uint256 rewards)
    {
        rewards = DecoRewards(pool.lastRewardsTime, _getNow());
        console.log("updating deco rewards");
        console.log("the rewards are %s", rewards);
        if ( rewards > 0 ) {
            pool.decoRewardsPaid = pool.decoRewardsPaid.add(rewards);
            decoRewardsPaidTotal = decoRewardsPaidTotal.add(rewards);

            // Mint this amount of DECO to the staking contract
            require(decoToken.mint(address(nftStaking), rewards));
        }
    }

    function _updateWhitelistedNFTRewards()
        internal
        returns(uint256 rewards)
    {
        rewards = WhitelistedNFTRewards(whitelistedNFTPool.lastRewardsTime, _getNow());
    console.log("_updateWhitelistedNFTRewards");
    console.log("the rewards are %s", rewards);
        if ( rewards > 0 ) {
            whitelistedNFTPool.decoRewardsPaid = whitelistedNFTPool.decoRewardsPaid.add(rewards);
            decoRewardsPaidTotal = decoRewardsPaidTotal.add(rewards);
    console.log("_updateWhitelistedNFTRewards");
    console.log("the rewards are (whitelistedNFTPool) %s", whitelistedNFTPool.decoRewardsPaid);
    console.log("_updateWhitelistedNFTRewards");
    console.log("the rewards are (decoRewardsPaidTotal) %s", decoRewardsPaidTotal);


            // Mint this amount of DECO to the staking contract
            require(decoToken.mint(address(whitelistedNFTStaking), rewards));
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
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.reclaimERC20: Sender must be admin"
        );
//        require(
//            tokenAddress != address(decoToken),
//            "Cannot withdraw the rewards token"
//        );
        IERC20(_tokenAddress).transfer(_msgSender(), _tokenAmount);
        emit ReclaimedERC20(_tokenAddress, _tokenAmount);
    }

    /**
    * @notice EMERGENCY Recovers ETH, drains amount of eth sitting on the smart contract
    * @dev Only access controls admin can access
    */
    function reclaimETH(uint256 _amount) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.reclaimETH: Sender must be admin"
        );
        _msgSender().transfer(_amount);
    }


    /* ========== Getters ========== */

    function getCurrentWeek()
        public
        view
        returns(uint256)
    {
        return diffDays(startTime, _getNow()) / 7;
    }

    function getDecoStakedEthTotal()
        public
        view
        returns(uint256)
    {
        return nftStaking.stakedEthTotal();
    }

    function getDecoDailyAPY()
        external
        view
        returns (uint256)
    {
        uint256 stakedEth = nftStaking.stakedEthTotal();

        uint256 yearlyReturnInEth = 0;

        if ( stakedEth != 0) {
            uint256 rewards = DecoRewards(_getNow() - 60, _getNow());
            uint256 rewardsInEth = rewards.mul(getEthPerDeco()).div(1e18);

            /// @dev minutes per year x 100 = 52560000
            yearlyReturnInEth = rewardsInEth.mul(52560000).mul(1e18).div(stakedEth);
        }

      return yearlyReturnInEth;
    }

    // DECO amount for custom ETH amount
    function getDecoPerEth(uint256 _ethAmt)
        public
        view
        returns (uint256)
    {
        return _ethAmt.mul(1e18).div(lastOracleQuote);
    }

    // ETH amount for 1 DECO
    function getEthPerDeco()
        public
        view
        returns (uint256)
    {
        return lastOracleQuote;
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    function totalRewards() external view returns (uint256) {
        return _totalDecoRewards().add(_totalNewWhitelistedNFTRewards());
    }
}
