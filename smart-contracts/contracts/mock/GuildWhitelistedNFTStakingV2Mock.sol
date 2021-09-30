// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../staking/GuildWhitelistedNFTStakingV2.sol";

contract GuildWhitelistedNFTStakingV2Mock is GuildWhitelistedNFTStakingV2 {
    uint256 public nowOverride;

    constructor(
    )
    GuildWhitelistedNFTStakingV2()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
