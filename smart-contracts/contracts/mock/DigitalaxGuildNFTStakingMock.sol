// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxGuildNFTStaking.sol";

contract DigitalaxGuildNFTStakingMock is DigitalaxGuildNFTStaking {
    uint256 public nowOverride;

    constructor(
    )
    DigitalaxGuildNFTStaking()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
