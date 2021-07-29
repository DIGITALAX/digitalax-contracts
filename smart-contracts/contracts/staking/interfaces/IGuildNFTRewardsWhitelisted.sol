// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with Whitelisted NFT that will
interface IGuildNFTRewardsWhitelisted {
    function totalWhitelistedNFTRewards() external view returns(uint256);
    function WhitelistedNFTRewards(uint256 _from, uint256 _to) external view returns(uint256);
}
