// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IDripOracle {
    function getData(address payableToken) external returns (uint256, bool);
}
