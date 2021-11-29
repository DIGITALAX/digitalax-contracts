// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "./interfaces/IERC20.sol";
import "../oracle/IDigitalaxMonaOracle.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

/**
 * @title Digitalax Rewards
 * @dev Calculates the rewards for staking on the Digitalax platform
 * @author DIGITALAX CORE TEAM
 * @author Based on original staking contract by Adrian Guerrera (deepyr)
 */

interface DigitalaxStaking {
    function stakedEthTotal() external view returns (uint256);
}

interface MONA is IERC20 {
    function mint(address tokenOwner, uint tokens) external returns (bool);
}

contract DigitalaxNFTRewardsV2 is BaseRelayRecipient, Initializable {
    using SafeMath for uint256;
        // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private _NOT_ENTERED;
    uint256 private _ENTERED;
    uint256 private _status;

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and make it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }

    /* ========== Variables ========== */

    MONA public monaToken;
    /// @notice Mona to Ether Oracle
    IDigitalaxMonaOracle public oracle;
    DigitalaxAccessControls public accessControls;
    DigitalaxStaking public nftStaking;

    mapping(address => uint256) public rewardTokensIndex;
    address[] public rewardTokens;

    uint256 public MAX_REWARD_TOKENS;
    uint256 constant pointMultiplier = 10e18;
    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 constant SECONDS_PER_WEEK = 7 * 24 * 60 * 60;

    mapping (uint256 => uint256) public weeklyMonaRevenueSharingPerSecond; // Mona revenue sharing
  	mapping (address => mapping(uint256 => uint256)) public weeklyTokenRevenueSharingPerSecond; // All token  revenue sharing


    uint256 public startTime;
    uint256 public monaRewardsPaidTotal;

	mapping(address => uint256) public tokenRewardsPaidTotal;
	mapping(address => uint256) public tokenRewardsPaid;

    /// @notice for storing information from oracle
    uint256 public lastOracleQuote = 1e18;

    // We must trust admin to pass correct weighted values, if not we could use something like
    // / @notice mapping of a staker to its current properties
    //mapping (uint256 => uint256) public weeklyTotalWeightPoints;

    /* @notice staking pool id to staking pool reward mapping
    */
    StakingPoolRewards public pool;

    /* ========== Structs ========== */
    /**
       @notice Struct to track the active pool
       @dev weeklyWeightPoints mapping the week to the weight for this pool
       @dev lastRewardsTime last time the overall rewards
       @dev rewardsPaid amount of rewards that have been paid to this pool
       */
    struct StakingPoolRewards {
        uint256 lastRewardsTime;
        uint256 monaRewardsPaid;
    }

    /* ========== Events ========== */
    event UpdateAccessControls(
        address indexed accessControls
    );
    event RewardAdded(address indexed addr, uint256 reward);
    event RewardDistributed(address indexed addr, uint256 reward);
    event ReclaimedERC20(address indexed token, uint256 amount);

    event UpdateOracle(address indexed oracle);

    // Events
    event AddRewardTokens(
        address[] rewardTokens
    );

    event RemoveRewardTokens(
        address[] rewardTokens
    );

    event DepositRevenueSharing(
        uint256 weeklyMonaRevenueSharingPerSecond,
        uint256 _week,
        uint256 _amount,
        address[] rewardTokens,
        uint256[] rewardAmounts
    );

    event WithdrawRevenueSharing(
        uint256 weeklyMonaRevenueSharingPerSecond,
        uint256 _week,
        uint256 _amount,
        address[] rewardTokens,
        uint256[] rewardTokenAmounts
    );


    /* ========== Admin Functions ========== */
    function initialize(
        MONA _monaToken,
        DigitalaxAccessControls _accessControls,
        DigitalaxStaking _nftStaking,
        IDigitalaxMonaOracle _oracle,
        address _trustedForwarder,
        uint256 _startTime,
        uint256 _monaRewardsPaidTotal
    )
        public initializer
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
            address(_nftStaking) != address(0),
            "DigitalaxRewardsV2: Invalid Mona Staking"
        );
        require(
            address(_oracle) != address(0),
            "DigitalaxRewardsV2: Invalid Mona Oracle"
        );
        monaToken = _monaToken;
        accessControls = _accessControls;
        nftStaking = _nftStaking;
        oracle = _oracle;
        startTime = _startTime;
        monaRewardsPaidTotal = _monaRewardsPaidTotal;
        trustedForwarder = _trustedForwarder;

        MAX_REWARD_TOKENS = 100;
        _NOT_ENTERED = 1;
        _ENTERED = 2;
        _status = _NOT_ENTERED;
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
    function updateOracle(IDigitalaxMonaOracle _oracle) external {
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
     @notice Method for updating the address of the mona staking contract
     @dev Only admin
     @param _addr Address of the mona staking contract
    */
    function setNftStaking(address _addr)
        external
        {
            require(
                accessControls.hasAdminRole(_msgSender()),
                "DigitalaxRewardsV2.setNftStaking: Sender must be admin"
            );
            nftStaking = DigitalaxStaking(_addr);
    }

    /*
     * @notice Deposit revenue sharing rewards to be distributed during a certain week
     * @dev this number is the total rewards that week with 18 decimals
     */
    function depositRewards(
        uint256 _week,
        uint256 _amount,
        address[] memory _rewardTokens,
        uint256[] memory _rewardAmounts
    )
        external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.depositMonaRewards: Sender must be admin"
        );

        require(
            _week >= getCurrentWeek(),
            "DigitalaxRewardsV2.depositRevenueSharingRewards: The rewards generated should be set for the future weeks"
        );

        require(IERC20(monaToken).allowance(_msgSender(), address(this)) >= _amount, "DigitalaxRewardsV2.depositRevenueSharingRewards: Failed to supply ERC20 Allowance");

        // Deposit this amount of MONA here
        require(IERC20(monaToken).transferFrom(
            address(_msgSender()),
            address(this),
            _amount
        ));


        uint256 monaAmount = _amount.mul(pointMultiplier)
                                   .div(SECONDS_PER_WEEK)
                                   .div(pointMultiplier);


        // Increase the revenue sharing per second for the week for Mona
        weeklyMonaRevenueSharingPerSecond[_week] = weeklyMonaRevenueSharingPerSecond[_week].add(monaAmount);

		for (uint i = 0; i < _rewardTokens.length; i++) {
            require(_rewardTokens[i] != address(0) && _rewardTokens[i] != address(monaToken), "This param is not for MONA or 0 address");
            require(IERC20(_rewardTokens[i]).allowance(_msgSender(), address(this)) >= _rewardAmounts[i], "DepositRevenueSharingRewards: Failed to supply ERC20 Allowance");

            // Deposit this amount of MONA here
            require(IERC20(_rewardTokens[i]).transferFrom(
                address(_msgSender()),
                address(this),
                _rewardAmounts[i]
            ));

            uint256 rewardAmount = _rewardAmounts[i].mul(pointMultiplier)
                .div(SECONDS_PER_WEEK)
                .div(pointMultiplier);

            weeklyTokenRevenueSharingPerSecond[_rewardTokens[i]][_week] = weeklyTokenRevenueSharingPerSecond[_rewardTokens[i]][_week].add(rewardAmount);
         }

        emit DepositRevenueSharing(weeklyMonaRevenueSharingPerSecond[_week], _week, _amount, _rewardTokens, _rewardAmounts);
    }

    /*
     * @notice Deposit revenue sharing rewards to be distributed during a certain week
     * @dev this number is the total rewards that week with 18 decimals
     */
    function withdrawRewards(
        uint256 _week,
        uint256 _amount,
        address[] memory _rewardTokens,
        uint256[] memory _rewardAmounts
    )
        external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.withdrawMonaRewards: Sender must be admin"
        );

        require(
            _week > getCurrentWeek(),
            "DigitalaxRewardsV2.withdrawMonaRewards: The rewards generated should be set for the future weeks"
        );


        // Withdraw this amount of MONA here
       IERC20(monaToken).transfer(
            _msgSender(),
            _amount
        );


        uint256 monaAmount = _amount.mul(pointMultiplier)
                                   .div(SECONDS_PER_WEEK)
                                   .div(pointMultiplier);

        require(monaAmount <= weeklyMonaRevenueSharingPerSecond[_week], "DigitalaxRewardsV2.withdrawMonaRewards: Cannot withdraw back more then week amount");
        // Increase the revenue sharing per second for the week for Mona
        weeklyMonaRevenueSharingPerSecond[_week] = weeklyMonaRevenueSharingPerSecond[_week].sub(monaAmount);
		  for (uint i = 0; i < _rewardTokens.length; i++) {
            require(_rewardTokens[i] != address(0) && _rewardTokens[i] != address(monaToken), "This param is not for MONA or 0 address");

            uint256 rewardAmount = _rewardAmounts[i].mul(pointMultiplier)
                .div(SECONDS_PER_WEEK)
                .div(pointMultiplier);

            require(rewardAmount <= weeklyMonaRevenueSharingPerSecond[_week], "DigitalaxRewardsV2.withdrawMonaRewards: Cannot withdraw back more then week amount");


            // Deposit this amount of MONA here
            require(IERC20(_rewardTokens[i]).transferFrom(
                address(this),
                address(_msgSender()),
                _rewardAmounts[i]
            ));

            weeklyTokenRevenueSharingPerSecond[_rewardTokens[i]][_week] = weeklyTokenRevenueSharingPerSecond[_rewardTokens[i]][_week].sub(rewardAmount);
        }


        emit WithdrawRevenueSharing(weeklyMonaRevenueSharingPerSecond[_week], _week, _amount, _rewardTokens, _rewardAmounts);
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
    function updateRewards()
        external
        returns(bool)
    {
        if (_getNow() <= pool.lastRewardsTime) {
            return false;
        }

        /// @dev check that the staking pool has contributions, and rewards have started
        if (_getNow() <= startTime) {
            pool.lastRewardsTime = _getNow();
            return false;
        }

        // @dev Update the oracle
        (uint256 exchangeRate, bool rateValid) = oracle.getData();
        require(rateValid, "DigitalaxMarketplace.estimateMonaAmount: Oracle data is invalid");
        lastOracleQuote = exchangeRate;

        /// @dev This sends rewards (Mona from revenue sharing)
        _updateMonaRewards();

        /// @dev This updates the extra token rewards (Any token from revenue sharing)
        _updateTokenRewards();
        /// @dev update accumulated reward
        pool.lastRewardsTime = _getNow();
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
    function setMaxRewardsTokens(
    uint256 _maxRewardsTokensCount) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxRewardsV2.setMaxRewardsTokens: Sender must be admin"
        );
        MAX_REWARD_TOKENS = _maxRewardsTokensCount;

    }

    function addRewardTokens(address[] memory _rewardTokens) public {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "AddRewardTokens: Sender must be admin"
        );
        require((_rewardTokens.length) > 0, "AddRewardTokens: Empty array not supported");
        require(MAX_REWARD_TOKENS >= _rewardTokens.length, "AddRewardTokens: Already reached max erc20 supported");
        for (uint i = 0; i < _rewardTokens.length; i++) {
            if(!checkInRewardTokens(_rewardTokens[i])) {
                uint256 index = rewardTokens.length;
                rewardTokens.push(_rewardTokens[i]);
                rewardTokensIndex[_rewardTokens[i]] = index;
            }
        }
        emit AddRewardTokens(_rewardTokens);
    }

    function removeRewardTokens(address[] memory _rewardTokens) public {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "RemoveRewardTokens: Sender must be admin"
        );

        require((rewardTokens.length) > 0, "RemoveRewardTokens: No reward tokens instantiated");
        require((_rewardTokens.length) > 0, "RemoveRewardTokens: Empty array not supported");

        for (uint i = 0; i < _rewardTokens.length; i++) {
            if(checkInRewardTokens(_rewardTokens[i])) {
                uint256 rowToDelete = rewardTokensIndex[_rewardTokens[i]];
                address keyToMove = rewardTokens[rewardTokens.length-1];
                rewardTokens[rowToDelete] = keyToMove;
                rewardTokensIndex[keyToMove] = rowToDelete;
                rewardTokens.pop();
                delete(rewardTokensIndex[_rewardTokens[i]]);
            }
        }

        emit RemoveRewardTokens(_rewardTokens);
    }

    function checkInRewardTokens(address _rewardToken) public view returns (bool isAddress) {
        if(rewardTokens.length == 0) return false;
        return (rewardTokens[rewardTokensIndex[_rewardToken]] == _rewardToken);
    }

    function getExtraRewardTokens() external view returns (address[] memory returnRewardTokens){
        return getRewardTokens();
    }

    function getRewardTokens() internal view returns (address[] memory returnRewardTokens){
        address[] memory a = new address[](rewardTokens.length);
        for (uint i=0; i< rewardTokens.length; i++) {
            a[i] = rewardTokens[i];
        }
        return a;
    }

    /* ========== View Functions ========== */

    /*
     * @notice Gets the total rewards outstanding from last reward time
     */
    function totalNewMonaRewards() external view returns (uint256) {
        uint256 lRewards = MonaRewards(pool.lastRewardsTime, _getNow());
        return lRewards;
    }

     /*
     * @notice Gets the total rewards outstanding from last reward time
     */
    function totalNewRewardsWithToken(address _rewardToken) external view returns (uint256) {
        uint256 lRewards = TokenRevenueRewards(_rewardToken, pool.lastRewardsTime, _getNow());
        return lRewards;
    }

    /*
     * @notice Get the last rewards time for a pool
     * @return last rewards time for a pool
     */
    function lastRewardsTime()
        external
        view
        returns(uint256)
    {
        return pool.lastRewardsTime;
    }

    /* @notice Return mona revenue rewards over the given _from to _to timestamp.
     * @dev A fraction of the start, multiples of the middle weeks, fraction of the end
     */
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
            return _rewardsFromPoints(weeklyMonaRevenueSharingPerSecond[fromWeek],
                                    _to.sub(_from));
        }
        /// @dev First count remainder of first week
        uint256 initialRemander = startTime.add((fromWeek+1).mul(SECONDS_PER_WEEK)).sub(_from);
        rewards = _rewardsFromPoints(weeklyMonaRevenueSharingPerSecond[fromWeek],
                                    initialRemander);

        /// @dev add multiples of the week
        for (uint256 i = fromWeek+1; i < toWeek; i++) {
            rewards = rewards.add(_rewardsFromPoints(weeklyMonaRevenueSharingPerSecond[i],
                                    SECONDS_PER_WEEK));
        }
        /// @dev Adds any remaining time in the most recent week till _to
        uint256 finalRemander = _to.sub(toWeek.mul(SECONDS_PER_WEEK).add(startTime));
        rewards = rewards.add(_rewardsFromPoints(weeklyMonaRevenueSharingPerSecond[toWeek],
                                    finalRemander));
        return rewards;
    }

 /* @notice Return bonus mona revenue rewards over the given _from to _to timestamp.
     * @dev A fraction of the start, multiples of the middle weeks, fraction of the end
     */
    function TokenRevenueRewards(address _rewardToken, uint256 _from, uint256 _to) public view returns (uint256 rewards) {
        if (_to <= startTime) {
            return 0;
        }
        if (_from < startTime) {
            _from = startTime;
        }
        uint256 fromWeek = diffDays(startTime, _from) / 7;
        uint256 toWeek = diffDays(startTime, _to) / 7;

        if (fromWeek == toWeek) {
            return _rewardsFromPoints(weeklyTokenRevenueSharingPerSecond[_rewardToken][fromWeek],
                                    _to.sub(_from));
        }
        /// @dev First count remainder of first week
        uint256 initialRemander = startTime.add((fromWeek+1).mul(SECONDS_PER_WEEK)).sub(_from);
        rewards = _rewardsFromPoints(weeklyTokenRevenueSharingPerSecond[_rewardToken][fromWeek],
                                    initialRemander);

        /// @dev add multiples of the week
        for (uint256 i = fromWeek+1; i < toWeek; i++) {
            rewards = rewards.add(_rewardsFromPoints(weeklyTokenRevenueSharingPerSecond[_rewardToken][i],
                                    SECONDS_PER_WEEK));
        }
        /// @dev Adds any remaining time in the most recent week till _to
        uint256 finalRemander = _to.sub(toWeek.mul(SECONDS_PER_WEEK).add(startTime));
        rewards = rewards.add(_rewardsFromPoints(weeklyTokenRevenueSharingPerSecond[_rewardToken][toWeek],
                                    finalRemander));
        return rewards;
    }
    /* ========== Internal Functions ========== */


    function _updateTokenRewards()
        internal
        returns(uint256 rewards)
    {
        address[] memory _rewardsTokens = getRewardTokens();
        for (uint i = 0; i < _rewardsTokens.length; i++)
        {
            rewards = TokenRevenueRewards(_rewardsTokens[i], pool.lastRewardsTime, _getNow());
            if ( rewards > 0 ) {
            tokenRewardsPaidTotal[_rewardsTokens[i]] = tokenRewardsPaidTotal[_rewardsTokens[i]].add(rewards);

                // Send this amount of tokens to the staking contract
                IERC20(_rewardsTokens[i]).transfer(
                    address(nftStaking),
                    rewards
                );
            }
        }
    }

    function _updateMonaRewards()
        internal
        returns(uint256 rewards)
    {
        rewards = MonaRewards(pool.lastRewardsTime, _getNow());
        if ( rewards > 0 ) {
            pool.monaRewardsPaid = pool.monaRewardsPaid.add(rewards);
            monaRewardsPaidTotal = monaRewardsPaidTotal.add(rewards);

            // Send this amount of MONA to the staking contract
            IERC20(monaToken).transfer(
                address(nftStaking),
                rewards
            );
        }
    }

    function getLastRewardsTime() external view returns(uint256 lastRewardsT){
        return pool.lastRewardsTime;
    }

    function _rewardsFromPoints(
        uint256 rate,
        uint256 duration
    )
        internal
        pure
        returns(uint256)
    {
        return rate.mul(duration);
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
//            tokenAddress != address(monaToken),
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

    function getMonaStakedEthTotal()
        public
        view
        returns(uint256)
    {
        return nftStaking.stakedEthTotal();
    }

    function getMonaDailyAPY()
        external
        view
        returns (uint256)
    {
        uint256 stakedEth = nftStaking.stakedEthTotal();

        uint256 yearlyReturnInEth = 0;

        if ( stakedEth != 0) {
            uint256 rewards = MonaRewards(_getNow() - 60, _getNow());
            uint256 rewardsInEth = rewards.mul(getEthPerMona()).div(1e18);

            /// @dev minutes per year x 100 = 52560000
            yearlyReturnInEth = rewardsInEth.mul(52560000).mul(1e18).div(stakedEth);
        }

      return yearlyReturnInEth;
    }

     // Get the amount of yearly return of rewards token per 1 MONA
   function getTokenRewardDailyAPY(address _rewardToken)
        external
        view
        returns (uint256)
    {
        uint256 stakedValue = nftStaking.stakedEthTotal();

        uint256 yearlyReturnPerMona = 0;

        if ( stakedValue != 0) {
            uint256 rewards = TokenRevenueRewards(_rewardToken, _getNow() - 60, _getNow());

            /// @dev minutes per year x 100 = 52560000
            yearlyReturnPerMona = rewards.mul(52560000).mul(1e18).div(stakedValue);
        }
      return yearlyReturnPerMona;
    }


    // MONA amount for custom ETH amount
    function getMonaPerEth(uint256 _ethAmt)
        public
        view
        returns (uint256)
    {
        return _ethAmt.mul(1e18).div(lastOracleQuote);
    }

    // ETH amount for 1 MONA
    function getEthPerMona()
        public
        view
        returns (uint256)
    {
        return lastOracleQuote;
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}
