pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IDigitalaxGuildNFTStakingWeight.sol";

/**
 * @title Digitalax Guild NFT Staking Weight
 * @dev Calculates the weight for staking on the PODE system
 * @author DIGITALAX CORE TEAM
 * @author 
 */

contract DigitalaxGuildNFTStakingWeight {
    using SafeMath for uint256;

    struct TokenWeight {
        uint256 weight;
        uint256 salePrice;
        mapping (string => uint256) appraisalCount;
        mapping (address => uint256) lastAppraisalTime;
    }

    uint256 private totalWeight;
    mapping (uint256 => TokenWeight) public tokenWeight;
    mapping (uint256 => address) public tokenOwner;
    mapping (address => uint256) public userWeight;

    event UpdatedTokenWeight(uint256 tokenId, uint256 weight);

    constructor() public {
        totalWeight = 0;
    }

    function getTotalWeight() external view returns (uint256) {
        return totalWeight;
    }

    function getTokenWeight(uint256 _tokenId) external view returns (uint256) {
        TokenWeight storage token = tokenWeight[_tokenId];
        return token.weight;
    }

    function getUserWeight(address _user) external view returns (uint256) {
        return userWeight[_user];
    }

    function calcWeight(uint256 _tokenId) private returns (uint256) {
        TokenWeight storage token = tokenWeight[_tokenId];

        uint256 score = 1; // need to calc from token.appraisalCount

        uint256 weight = token.salePrice.mul(score);

        return weight;
    }

    function appraise(uint256 _tokenId, address _appraiser, string memory _appraiseAction) external {
        TokenWeight storage token = tokenWeight[_tokenId];

        uint256 _now = _getNow();
        require(
            token.lastAppraisalTime[_appraiser] == 0 || _now >= token.lastAppraisalTime[_appraiser].add(1 days),
            "DigitalaxGuildNFTStakingWeight._stake: You can appraise each token once a day."
        );

        token.lastAppraisalTime[_appraiser] = _now;
        token.appraisalCount[_appraiseAction] = token.appraisalCount[_appraiseAction].add(1);

        uint256 newWeight = calcWeight(_tokenId);

        totalWeight = totalWeight.sub(token.weight)
                            .add(newWeight);

        address owner = tokenOwner[_tokenId];
        userWeight[owner] = userWeight[owner].sub(token.weight)
                                        .add(newWeight);
        
        token.weight = newWeight;

        emit UpdatedTokenWeight(_tokenId, newWeight);
    }

    function updateTokenPrice(uint256 _tokenId, uint256 _salePrice) external {
        TokenWeight storage token = tokenWeight[_tokenId];
        token.salePrice = _salePrice;

        uint256 newWeight = calcWeight(_tokenId);

        totalWeight = totalWeight.sub(token.weight)
                            .add(newWeight);

        address owner = tokenOwner[_tokenId];
        userWeight[owner] = userWeight[owner].sub(token.weight)
                                        .add(newWeight);
        
        token.weight = newWeight;

        emit UpdatedTokenWeight(_tokenId, newWeight);
    }

    function stake(uint256 _tokenId, address _tokenOwner, uint256 _salePrice) external {
        TokenWeight storage token = tokenWeight[_tokenId];
        token.salePrice = _salePrice;
        uint256 newWeight = _salePrice; // need to calc or default_value = _salePrice
        token.weight = newWeight;
        tokenOwner[_tokenId] = _tokenOwner;
        userWeight[_tokenOwner] = userWeight[_tokenOwner].add(newWeight);

        totalWeight = totalWeight.add(newWeight);
    }

    function unstake(uint256 _tokenId) external {
        TokenWeight storage token = tokenWeight[_tokenId];

        totalWeight = totalWeight.sub(token.weight);

        address owner = tokenOwner[_tokenId];
        userWeight[owner] = userWeight[owner].sub(token.weight);

        delete tokenWeight[_tokenId];
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}