// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../staking/GuildNFTStakingWeightV3.sol";

contract GuildNFTStakingWeightV3Mock is GuildNFTStakingWeightV3 {
    uint256 public nowOverride;

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }

    // STARTING HERE
    // EXAMPLE NEW STORED VARIABLE

    function setTest() external {
        testValue = uint256(666);
    }
    uint256 public testValue;
}
