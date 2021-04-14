// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with the Genesis MONA NFT that will 
interface IDigitalaxNFTRewards {
    function updateRewards() external returns (bool);
    function MonaRewards(uint256 _from, uint256 _to) external view returns(uint256);
    function lastRewardsTime(uint256 _poolId) external view returns (uint256);
    function getMonaPerEth(uint256 _ethAmt) external view returns (uint256);
}
