// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IDripOracle {
    function getData(address payableToken) external view returns (uint256, bool);
    function checkValidToken(address _payableToken) external view returns (bool isValid);
}
