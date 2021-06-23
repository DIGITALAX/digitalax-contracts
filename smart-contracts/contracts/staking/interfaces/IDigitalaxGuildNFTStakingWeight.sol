// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with the Guild Staking Weight that will 
interface IDigitalaxGuildNFTStakingWeight {
    event UpdatedTokenWeight(uint256 tokenId, uint256 weight);

    function getTotalWeight() external view returns (uint256);
    function weightOf(uint256 _tokenId) external view returns (uint256);
    function stake(uint256 _tokenId, uint256 _salePrice) external;
    function unstake(uint256 _tokenId) external;
    function appraise(uint256 _tokenId, uint256 _appraiseAction) external;
    function updateTokenPrice(uint256 _tokenId, uint256 _salePrice) external;
}
