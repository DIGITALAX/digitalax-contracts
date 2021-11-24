// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../staking/GuildNFTStakingV3.sol";

contract GuildNFTStakingV3Mock is GuildNFTStakingV3 {
    uint256 public nowOverride;

    constructor(
    )
    GuildNFTStakingV3()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
