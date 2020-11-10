// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../ERC1155/ERC1155.sol";

contract ERC1155Mock is ERC1155 {

    function mint(uint256 id, uint256 amount) external {
        _mint(msg.sender, id, amount, "");
    }
}
