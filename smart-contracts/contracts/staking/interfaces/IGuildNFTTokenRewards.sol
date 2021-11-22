// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with Whitelisted NFT that will
interface IGuildNFTTokenRewards {
    function totalNewRewardTokenMembershipRewards(address _rewardToken) external view returns(uint256);
    function totalNewRewardTokenWhitelistedRewards(address _rewardToken) external view returns(uint256);
    function MembershipTokenRevenueRewards(address _rewardToken, uint256 _from, uint256 _to) external view returns(uint256);
    function WhitelistedTokenRevenueRewards(address _rewardToken, uint256 _from, uint256 _to) external view returns(uint256);
}
