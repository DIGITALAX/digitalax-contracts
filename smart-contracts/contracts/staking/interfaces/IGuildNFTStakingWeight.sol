// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

/// @dev an interface to interact with the Guild Staking Weight that will 
interface IGuildNFTStakingWeight {
    function updateWeight() external returns (bool);
    function updateOwnerWeight(address _tokenOwner) external returns (bool);
    function appraise(uint256 _tokenId, address _appraiser, uint256 _limitAppraisalCount, string memory _reaction) external;
    function stake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external;
    function unstake(uint256 _tokenId, address _tokenOwner) external;

    function calcNewWeight() external view returns (uint256);
    function calcNewOwnerWeight(address _tokenOwner) external view returns (uint256);
    function getTotalWeight() external view returns (uint256);
    function getOwnerWeight(address _tokenOwner) external view returns (uint256);
    function getTokenPrice(uint256 _tokenId) external view returns (uint256);
    function balanceOf(address _owner) external view returns (uint256);

    function updateReactionPoint(string memory _reaction, uint256 _reactionPoint) external returns (bool);
}
