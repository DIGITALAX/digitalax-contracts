pragma solidity 0.6.12;


// SPDX-License-Identifier: MIT
/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryAdd(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        uint256 c = a + b;
        if (c < a) return (false, 0);
        return (true, c);
    }

    /**
     * @dev Returns the substraction of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function trySub(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        if (b > a) return (false, 0);
        return (true, a - b);
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryMul(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) return (true, 0);
        uint256 c = a * b;
        if (c / a != b) return (false, 0);
        return (true, c);
    }

    /**
     * @dev Returns the division of two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryDiv(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        if (b == 0) return (false, 0);
        return (true, a / b);
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryMod(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        if (b == 0) return (false, 0);
        return (true, a % b);
    }

    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction overflow");
        return a - b;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     *
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: modulo by zero");
        return a % b;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {trySub}.
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        return a - b;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {tryDiv}.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        return a / b;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting with custom message when dividing by zero.
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {tryMod}.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        return a % b;
    }
}

// SPDX-License-Identifier: GPLv2
/// @dev an interface to interact with the Guild Staking Weight that will
interface IGuildNFTStakingWeight {
    function updateWeight() external returns (bool);
    function updateOwnerWeight(address _tokenOwner) external returns (bool);
    function appraise(uint256 _tokenId, address _appraiser, uint256 _limitAppraisalCount, string memory _reaction) external;
    function stake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external;
    function unstake(uint256 _tokenId, address _tokenOwner) external;

    function getTotalWeight() external view returns (uint256);
    function getOwnerWeight(address _tokenOwner) external view returns (uint256);
    function getTokenPrice(uint256 _tokenId) external view returns (uint256);
    function balanceOf(address _owner) external view returns (uint256);

    function updateReactionPoint(string memory _reaction, uint256 _reactionPoint) external returns (bool);
}

/**
 * @title Digitalax Guild NFT Staking Weight
 * @dev Calculates the weight for staking on the PODE system
 * @author DIGITALAX CORE TEAM
 * @author 
 */
contract GuildNFTStakingWeightV1 {
    using SafeMath for uint256;

    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;

    struct OwnerWeight {
        uint256 totalWeight;
        uint256 currentStakedNFTCount;
        uint256 balance;
        uint256 lastUpdateDay;
    }

    uint256 public startTime;
    uint256 public currentStakedNFTCount;
    uint256 public balance;
    uint256 public totalGuildWeight;

    mapping (uint256 => uint256) public tokenPrice;
    mapping (uint256 => address) public tokenOwner;
    mapping (address => OwnerWeight) public ownerWeight;

    uint256 public lastUpdateDay;
    uint256 public lastUpdateTime;

    function balanceOf(address _owner) external view returns (uint256) {
        return ownerWeight[_owner].balance;
    }

    function getTotalWeight() external view returns (uint256) {
        return totalGuildWeight;
    }

    function getOwnerWeight(address _tokenOwner) external view returns (uint256) {
        return ownerWeight[_tokenOwner].totalWeight;
    }

    function getTokenPrice(uint256 _tokenId) external view returns (uint256) {
        return tokenPrice[_tokenId];
    }

    function updateWeight() public returns (bool) {
        if (_getNow() <= lastUpdateTime) {
            return false;
        }

        uint256 _currentDay = getCurrentDay();

        for (uint256 i = lastUpdateDay; i < _currentDay; i++) {
            totalGuildWeight = totalGuildWeight.add(balance);
        }

        lastUpdateTime = _getNow();
        lastUpdateDay = _currentDay;

        return true;
    }

    function updateOwnerWeight(address _tokenOwner) public returns (bool) {
        updateWeight();

        uint256 _currentDay = getCurrentDay();

        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        if (_currentDay <= owner.lastUpdateDay) {
            return false;
        }

        for (uint256 i = owner.lastUpdateDay; i < _currentDay; i++) {
            owner.totalWeight = owner.totalWeight.add(owner.balance);
        }

        owner.lastUpdateDay = _currentDay;

        return true;
    }

    function stake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external {
        require(tokenOwner[_tokenId] == address(0) || tokenOwner[_tokenId] == _tokenOwner);

        if (balance == 0 && startTime == 0) {
            startTime = _getNow();
        }

        uint256 _currentDay = getCurrentDay();

        tokenPrice[_tokenId] = _primarySalePrice;
        tokenOwner[_tokenId] = _tokenOwner;

        // OwnerWeight
        updateOwnerWeight(_tokenOwner);
        OwnerWeight storage owner = ownerWeight[_tokenOwner];
        owner.balance = owner.balance.add(_primarySalePrice);
        owner.currentStakedNFTCount = owner.currentStakedNFTCount.add(1);

        // GuildWeight
        balance = balance.add(_primarySalePrice);
        currentStakedNFTCount = currentStakedNFTCount.add(1);
    }

    function unstake(uint256 _tokenId, address _tokenOwner) external {
        require(tokenOwner[_tokenId] == _tokenOwner);

        updateOwnerWeight(_tokenOwner);

        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        owner.currentStakedNFTCount = owner.currentStakedNFTCount.sub(1);
        owner.balance = owner.balance.sub(tokenPrice[_tokenId]);

        currentStakedNFTCount = currentStakedNFTCount.sub(1);
        balance = balance.sub(tokenPrice[_tokenId]);

        delete tokenPrice[_tokenId];
        delete tokenOwner[_tokenId];

        if (owner.balance == 0) {
            delete ownerWeight[_tokenOwner];
        }
    }

    function diffDays(uint fromTimestamp, uint toTimestamp) internal pure returns (uint _days) {
        require(fromTimestamp <= toTimestamp);
        _days = (toTimestamp - fromTimestamp) / SECONDS_PER_DAY;
    }

    function getCurrentDay() public view returns(uint256) {
        return diffDays(startTime, _getNow());
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}