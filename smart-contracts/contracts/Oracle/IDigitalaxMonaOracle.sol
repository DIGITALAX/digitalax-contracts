// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IDigitalaxMonaOracle {
    function getData() external returns (uint256, bool);
}
