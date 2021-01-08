// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IDigitalaxMaterials is IERC1155 {
    function createChild(string calldata _uri) external returns (uint256);
    function batchCreateChildren(string[] calldata _uris) external returns (uint256[] memory);
    function mintChild(uint256 _childTokenId, uint256 _amount, address _beneficiary, bytes calldata _data) external;
    function batchMintChildren(uint256[] calldata _childTokenIds, uint256[] calldata _amounts, address _beneficiary, bytes calldata _data) external;
}
