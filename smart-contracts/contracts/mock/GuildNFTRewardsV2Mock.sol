// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../oracle/IDigitalaxMonaOracle.sol";
import "../staking/GuildNFTRewardsV2.sol";

contract GuildNFTRewardsV2Mock is GuildNFTRewardsV2 {
    uint256 public nowOverride;

    constructor(
    )
    GuildNFTRewardsV2()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
