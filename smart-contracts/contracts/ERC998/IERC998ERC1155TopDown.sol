// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

// Based on: https://github.com/rocksideio/ERC998-ERC1155-TopDown/blob/695963195606304374015c49d166ab2fbeb42ea9/contracts/IERC998ERC1155TopDown.sol
interface IERC998ERC1155TopDown is IERC1155Receiver {

    event ReceivedChild(address indexed from, uint256 indexed toTokenId, address indexed childContract, uint256 childTokenId, uint256 amount);
    event TransferBatchChild(uint256 indexed fromTokenId, address indexed to, address indexed childContract, uint256[] childTokenIds, uint256[] amounts);

    function childContractsFor(uint256 tokenId) external view returns (address[] memory childContracts);
    function childIdsForOn(uint256 tokenId, address childContract) external view returns (uint256[] memory childIds);
    function childBalance(uint256 tokenId, address childContract, uint256 childTokenId) external view returns (uint256);
}
