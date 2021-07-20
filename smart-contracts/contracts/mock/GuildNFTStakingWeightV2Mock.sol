// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/GuildNFTStakingWeightV2.sol";

contract GuildNFTStakingWeightV2Mock is GuildNFTStakingWeightV2 {
    uint256 public nowOverride;

    constructor(
    )
    GuildNFTStakingWeightV2()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
