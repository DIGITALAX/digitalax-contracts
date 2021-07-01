// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxGuildNFTStakingWeightV1.sol";

contract DigitalaxGuildNFTStakingWeightMock is DigitalaxGuildNFTStakingWeightV1 {
    uint256 public nowOverride;

    constructor(
    )
    DigitalaxGuildNFTStakingWeightV1()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
