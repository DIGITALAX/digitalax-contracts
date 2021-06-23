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
    }

    uint256 private totalWeight;
    mapping (uint256 => TokenWeight) public tokenWeight;

    event UpdatedTokenWeight(uint256 tokenId, uint256 weight);

    constructor() public {
        totalWeight = 0;
    }

    function getTotalWeight() external view returns (uint256) {
        return totalWeight;
    }

    function weightOf(uint256 _tokenId) external view returns (uint256) {
        TokenWeight storage token = tokenWeight[_tokenId];
        return token.weight;
    }

    function calcWeight(uint256 _tokenId) private returns (uint256) {
        TokenWeight storage token = tokenWeight[_tokenId];

        uint256 score = 1; // need to calc from token.appraisalCount

        uint256 weight = token.salePrice.mul(score);

        return weight;
    }

    function appraise(uint256 _tokenId, string memory _appraiseAction, bool _isCancel) external {
        TokenWeight storage token = tokenWeight[_tokenId];

        if (!_isCancel) {
            token.appraisalCount[_appraiseAction] = token.appraisalCount[_appraiseAction].add(1);
        } else {
            token.appraisalCount[_appraiseAction] = token.appraisalCount[_appraiseAction].sub(1);
        }

        uint256 newWeight = calcWeight(_tokenId);

        totalWeight = totalWeight.sub(token.weight)
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
        
        token.weight = newWeight;

        emit UpdatedTokenWeight(_tokenId, newWeight);
    }

    function stake(uint256 _tokenId, uint256 _salePrice) external {
        TokenWeight storage token = tokenWeight[_tokenId];
        token.salePrice = _salePrice;
        uint256 newWeight = _salePrice; // need to calc or default_value = _salePrice
        token.weight = newWeight;

        totalWeight = totalWeight.add(newWeight);
    }

    function unstake(uint256 _tokenId) external {
        TokenWeight storage token = tokenWeight[_tokenId];

        totalWeight = totalWeight.sub(token.weight);

        delete tokenWeight[_tokenId];
    }
}