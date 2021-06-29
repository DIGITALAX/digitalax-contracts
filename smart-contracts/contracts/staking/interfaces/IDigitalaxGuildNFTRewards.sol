// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with the Genesis MONA NFT that will 
interface IDigitalaxGuildNFTRewards {
    function updateRewards() external returns (bool);
    function totalDECORewards() external view returns(uint256);
    function DECORewards(uint256 _from, uint256 _to) external view returns(uint256);
    function lastRewardsTime() external view returns (uint256);
}
