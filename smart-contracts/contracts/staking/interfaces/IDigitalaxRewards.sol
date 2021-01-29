// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with the Genesis MONA NFT that will 
interface IDigitalaxRewards {
    function updateRewards(uint256 _poolId) external returns (bool);
    function MonaRevenueRewards(uint256 _poolId, uint256 _from, uint256 _to) external view returns(uint256);
    function ETHRevenueRewards(uint256 _poolId, uint256 _from, uint256 _to) external view returns(uint256);
    function lastRewardsTime(uint256 _poolId) external view returns (uint256);
}
