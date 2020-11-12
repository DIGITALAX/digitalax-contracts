//imported from: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/aaa5ef81cf75454d1c337dc3de03d12480849ad1/contracts/token/ERC1155/ERC1155Burnable.sol

// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./ERC1155.sol";

/**
 * @dev Extension of {ERC1155} that allows token holders to destroy both their
 * own tokens and those that they have been approved to use.
 *
 * _Available since v3.1._
 */
abstract contract ERC1155Burnable is ERC1155 {
    function burn(address account, uint256 id, uint256 amount) public virtual {
        require(
            account == _msgSender() || isApprovedForAll(account, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );

        _burn(account, id, amount);
    }

    function burnBatch(address account, uint256[] memory ids, uint256[] memory amounts) public virtual {
        require(
            account == _msgSender() || isApprovedForAll(account, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );

        _burnBatch(account, ids, amounts);
    }
}
