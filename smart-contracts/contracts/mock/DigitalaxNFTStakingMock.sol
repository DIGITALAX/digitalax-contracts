// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxNFTStaking.sol";

contract DigitalaxNFTStakingMock is DigitalaxNFTStaking {
    uint256 public nowOverride;

    constructor(
    )
    DigitalaxNFTStaking()
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
