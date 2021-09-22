// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../staking/GuildWhitelistedNFTStaking.sol";

contract GuildWhitelistedNFTStakingMock is GuildWhitelistedNFTStaking {
    uint256 public nowOverride;

    constructor(
    )
    GuildWhitelistedNFTStaking()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
