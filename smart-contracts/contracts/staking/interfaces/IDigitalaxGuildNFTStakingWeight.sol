// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with the Guild Staking Weight that will 
interface IDigitalaxGuildNFTStakingWeight {
    event UpdatedTokenWeight(uint256 tokenId, uint256 weight);

    function getTotalWeight() external view returns (uint256);
    function getTokenWeight(uint256 _tokenId) external view returns (uint256);
    function getUserWeight(address _user) external view returns (uint256);
    function appraise(uint256 _tokenId, address _appraiser, uint256 _appraiseAction) external;
    function stake(uint256 _tokenId, address _tokenOwner, uint256 _salePrice) external;
    function unstake(uint256 _tokenId) external;
    function updateTokenPrice(uint256 _tokenId, uint256 _salePrice) external;
}
