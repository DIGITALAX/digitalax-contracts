// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../DigitalaxMarketplaceV3.sol";

contract DigitalaxMarketplaceV3Mock is DigitalaxMarketplaceV3 {
    uint256 public nowOverride;

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
