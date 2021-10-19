// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxRewardsV2.sol";
import "../oracle/IDigitalaxMonaOracle.sol";

contract DigitalaxRewardsV2Mock is DigitalaxRewardsV2 {
    uint256 public nowOverride;

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
