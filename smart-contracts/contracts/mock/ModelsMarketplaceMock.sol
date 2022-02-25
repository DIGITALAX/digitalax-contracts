// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../ModelsMarketplace.sol";

contract ModelsMarketplaceMock is ModelsMarketplace {
    uint256 public nowOverride;

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
