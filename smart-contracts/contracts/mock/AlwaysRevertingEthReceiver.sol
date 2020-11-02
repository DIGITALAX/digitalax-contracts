// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

contract AlwaysRevertingEthReceiver {
    receive() external payable {
        revert("No thanks");
    }
}
