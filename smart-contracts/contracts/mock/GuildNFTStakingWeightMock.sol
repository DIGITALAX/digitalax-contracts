// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/GuildNFTStakingWeightV1.sol";

contract GuildNFTStakingWeightMock is GuildNFTStakingWeightV1 {
    uint256 public nowOverride;

    constructor(
    )
    GuildNFTStakingWeightV1()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
