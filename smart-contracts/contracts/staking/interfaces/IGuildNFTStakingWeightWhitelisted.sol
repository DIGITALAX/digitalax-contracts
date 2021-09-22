// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with the Guild Staking Weight that will
interface IGuildNFTStakingWeightWhitelisted {
    function appraiseWhitelistedNFT(address _whitelistedNFT, uint256 _tokenId, address _appraiser, string memory _reaction) external;
    function stakeWhitelistedNFT(address _whitelistedNFT, uint256 _tokenId, address _tokenOwner) external;
    function unstakeWhitelistedNFT(address _whitelistedNFT, uint256 _tokenId, address _tokenOwner) external;
    function getTotalWhitelistedNFTTokenWeight() external view returns (uint256);
    function getWhitelistedNFTOwnerWeight(address _tokenOwner) external view returns (uint256);
    function updateWhitelistedNFTOwnerWeight(address _tokenOwner) external returns (bool);
}
