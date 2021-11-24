// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../staking/GuildWhitelistedNFTStakingV3.sol";

contract GuildWhitelistedNFTStakingV3Mock is GuildWhitelistedNFTStakingV3 {
    uint256 public nowOverride;

    constructor(
    )
    GuildWhitelistedNFTStakingV3()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
