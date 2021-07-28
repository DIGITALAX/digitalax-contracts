// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with the Guild Staking Weight that will
interface IGuildNFTStakingWeightAppraisal {
    function appraiseNFT(address _whitelistedNFT, uint256 _tokenId, address _appraiser, string memory _reaction) external;
}
