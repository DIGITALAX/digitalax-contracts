// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

interface IDigitalaxMaterialsV2 {
    function uri(uint256 tokenId) external view returns (string memory);
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
    external;
}
