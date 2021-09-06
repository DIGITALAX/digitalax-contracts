pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

interface IGuildNFTStakingWeightStorage {
    function DECAY_POINT_DEFAULT() external view returns (uint256);
    function DECAY_POINT_WITH_APPRAISAL() external view returns (uint256);

//    // Overall variables
    function startTime() external view returns (uint256);

    function stakedNFTCount() external view returns (uint256);
    function setStakedNFTCount(uint256 _stakedNFTCount) external returns (uint256);

    function stakedWhitelistedNFTCount() external view returns (uint256);
    function setStakedWhitelistedNFTCount(uint256 _stakedWhitelistedNFTCount) external returns (uint256);

    function totalWhitelistedNFTTokenWeight() external view returns (uint256);
    function setTotalWhitelistedNFTTokenWeight(uint256 _totalWhitelistedNFTTokenWeight) external returns (uint256);

    function totalGuildWeight() external view returns (uint256);
    function setTotalGuildWeight(uint256 _totalGuildWeight) external returns (uint256);

    function lastUpdateDay() external view returns (uint256);

    function lastGuildMemberUpdateDay() external view returns (uint256);

    function getClapMappingValue(uint256 _totalSupply, uint256 _balance) external view returns (uint256);
    function getDecoBonusMappingValue(uint256 _totalSupply, uint256 _balance) external view returns (uint256);
    function getAppraisedBonusMappingValue(uint256 _totalAppraised) external view returns (uint256);

//    // Mappings
    function reactionPoint(string memory _type) external view returns (uint256);

    function tokenOwner(uint256 _tokenId) external view returns (address);
    function setTokenOwner(uint256 _tokenId, address _tokenOwner) external returns (address);

    function whitelistedNFTTokenOwner(address _whitelistedNFT, uint256 _tokenId) external view returns (address);
    function setWhitelistedNFTTokenOwner(address _whitelistedNFT, uint256 _tokenId, address _whitelistedNFTTokenOwner) external returns (address);

    function dailyWeight(uint256 _day) external view returns (uint256);
    function setDailyWeight(uint256 day, uint256 _dailyWeight) external returns (uint256);
}
