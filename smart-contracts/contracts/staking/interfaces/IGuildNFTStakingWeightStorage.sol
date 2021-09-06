pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

interface IGuildNFTStakingWeightStorage {
    function getDECAY_POINT_DEFAULT() external view returns (uint256);
    function getDECAY_POINT_WITH_APPRAISAL() external view returns (uint256);

//    // Overall variables
    function getStartTime() external view returns (uint256);

    function getStakedNFTCount() external view returns (uint256);
    function setStakedNFTCount(uint256 _stakedNFTCount) external returns (uint256);

    function getStakedWhitelistedNFTCount() external view returns (uint256);
    function setStakedWhitelistedNFTCount(uint256 _stakedWhitelistedNFTCount) external returns (uint256);

    function getTotalWhitelistedNFTTokenWeight() external view returns (uint256);
    function setTotalWhitelistedNFTTokenWeight(uint256 _totalWhitelistedNFTTokenWeight) external returns (uint256);

    function getTotalGuildWeight() external view returns (uint256);
    function setTotalGuildWeight(uint256 _totalGuildWeight) external returns (uint256);

    function getLastUpdateDay() external view returns (uint256);

    function getLastGuildMemberUpdateDay() external view returns (uint256);

    function getClapMappingValue(uint256 _totalSupply, uint256 _balance) external view returns (uint256);
    function getDecoBonusMappingValue(uint256 _totalSupply, uint256 _balance) external view returns (uint256);
    function getAppraisedBonusMappingValue(uint256 _totalAppraised) external view returns (uint256);

//    // Mappings
    function getReactionPoint(string memory _type) external view returns (uint256);

    function getTokenOwner(uint256 _tokenId) external view returns (address);
    function setTokenOwner(uint256 _tokenId, address _tokenOwner) external returns (address);

    function getWhitelistedNFTTokenOwner(address _whitelistedNFT, uint256 _tokenId) external view returns (address);
    function setWhitelistedNFTTokenOwner(address _whitelistedNFT, uint256 _tokenId, address _whitelistedNFTTokenOwner) external returns (address);

    function getDailyWeight(uint256 _day) external view returns (uint256);
    function setDailyWeight(uint256 day, uint256 _dailyWeight) external returns (uint256);
}
