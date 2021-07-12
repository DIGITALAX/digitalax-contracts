pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../EIP2771/BaseRelayRecipient.sol";

/**
 * @title Digitalax Guild NFT Staking Weight
 * @dev Calculates the weight for staking on the PODE system
 * @author DIGITALAX CORE TEAM
 * @author 
 */

contract GuildNFTStakingWeightV1 is BaseRelayRecipient {
    using SafeMath for uint256;

    struct OwnerWeight {
        uint256 totalWeight;
        uint256 currentStakedNFTCount;
        uint256 balance;
        uint256 lastUpdateTime;
    }

    uint256 public startTime;
    uint256 public currentStakedNFTCount;
    uint256 public balance;
    uint256 public totalGuildWeight;

    mapping (uint256 => uint256) public tokenPrice;
    mapping (uint256 => address) public tokenOwner;
    mapping (address => OwnerWeight) public ownerWeight;

    address stakingContract;

    uint256 public lastUpdateTime;

    bool initialised;

    constructor() public {
        startTime = _getNow();
    }

    function init(address _stakingContract) external {
        require(!initialised, "Already initialised");
        
        stakingContract = _stakingContract;
        initialised = true;
    }

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

    function calcNewWeight() public view returns (uint256) {
        if (_getNow() <= lastUpdateTime || balance == 0) {
            return totalGuildWeight;
        }

        uint256 _newWeight = balance.mul(_getNow() - lastUpdateTime);

        return totalGuildWeight.add(_newWeight);
    }

    function updateWeight() public returns (bool) {
        if (lastUpdateTime < startTime) {
            lastUpdateTime = startTime;
        }

        if (_getNow() <= lastUpdateTime) {
            return false;
        }

        totalGuildWeight = calcNewWeight();

        lastUpdateTime = _getNow();

        return true;
    }

    function calcNewOwnerWeight(address _tokenOwner) public view returns (uint256) {
        OwnerWeight memory _owner = ownerWeight[_tokenOwner];

        if (_getNow() <= _owner.lastUpdateTime || _owner.balance == 0) {
            return _owner.totalWeight;
        }

        uint256 _newWeight = _owner.balance.mul(_getNow() - _owner.lastUpdateTime);

        return _owner.totalWeight.add(_newWeight);
    }

    function updateOwnerWeight(address _tokenOwner) public returns (bool) {
        updateWeight();
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        if (_getNow() <= owner.lastUpdateTime) {
            return false;
        }

        owner.totalWeight = calcNewOwnerWeight(_tokenOwner);        

        owner.lastUpdateTime = _getNow();

        return true;
    }

    function _msgSender() internal view returns (address payable sender) {
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

    function stake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");
        require(tokenOwner[_tokenId] == address(0) || tokenOwner[_tokenId] == _tokenOwner);

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
        require(_msgSender() == stakingContract, "Sender must be staking contract");
        require(tokenOwner[_tokenId] == _tokenOwner);

        updateOwnerWeight(_tokenOwner);

        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        owner.currentStakedNFTCount = owner.currentStakedNFTCount.sub(1);
        owner.balance = owner.balance.sub(tokenPrice[_tokenId]);

        if (owner.balance == 0) {
            delete ownerWeight[_tokenOwner];
        }

        currentStakedNFTCount = currentStakedNFTCount.sub(1);
        balance = balance.sub(tokenPrice[_tokenId]);

        if (balance == 0) {
            totalGuildWeight = 0;
        }

        delete tokenPrice[_tokenId];
        delete tokenOwner[_tokenId];
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}