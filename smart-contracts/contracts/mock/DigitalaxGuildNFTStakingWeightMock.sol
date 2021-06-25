// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxGuildNFTStakingWeight.sol";

contract DigitalaxGuildNFTStakingWeightMock is DigitalaxGuildNFTStakingWeight {
    uint256 public nowOverride;

    constructor(
    )
    DigitalaxGuildNFTStakingWeight()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
