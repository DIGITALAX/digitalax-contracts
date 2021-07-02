// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../staking/GuildNFTStaking.sol";

contract GuildNFTStakingMock is GuildNFTStaking {
    uint256 public nowOverride;

    constructor(
    )
    GuildNFTStaking()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
