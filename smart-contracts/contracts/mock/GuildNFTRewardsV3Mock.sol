// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../oracle/IDigitalaxMonaOracle.sol";
import "../staking/GuildNFTRewardsV3.sol";

contract GuildNFTRewardsV3Mock is GuildNFTRewardsV3 {
    uint256 public nowOverride;

    constructor(
    )
    GuildNFTRewardsV3()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
