pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

interface IGuildNFTStakingWeightStorage {
    function getDECAY_POINT_DEFAULT() external view returns (uint256);
    function getDECAY_POINT_WITH_APPRAISAL() external view returns (uint256);

//    // Overall variables

    function getClapMappingValue(uint256 _totalSupply, uint256 _balance) external view returns (uint256);
    function getDecoBonusMappingValue(uint256 _totalSupply, uint256 _balance) external view returns (uint256);
    function getAppraisedBonusMappingValue(uint256 _totalAppraised) external view returns (uint256);

//    // Mappings
    function getReactionPoint(string memory _type) external view returns (uint256);
}
