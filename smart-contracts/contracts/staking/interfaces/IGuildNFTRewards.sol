// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with PODE NFT that will
interface IGuildNFTRewards {
    function updateRewards() external returns (bool);
    function totalDecoRewards() external view returns(uint256);
    function DecoRewards(uint256 _from, uint256 _to) external view returns(uint256);
    function lastRewardsTime() external view returns (uint256);
}
