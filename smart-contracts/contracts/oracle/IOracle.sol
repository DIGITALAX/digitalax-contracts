// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IOracle {
    function getData() external returns (uint256, bool);
}
