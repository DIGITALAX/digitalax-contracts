pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IGuildNFTStakingWeight.sol";

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