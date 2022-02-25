// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../DigitalaxWhitelistedSales.sol";

contract DigitalaxWhitelistedSalesMock is DigitalaxWhitelistedSales {
    uint256 public nowOverride;

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
