// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxMonaStaking.sol";

contract DigitalaxMonaStakingMock is DigitalaxMonaStaking {
    uint256 public nowOverride;

    constructor(
        address _monaToken,
        DigitalaxAccessControls _accessControls,
        address _trustedForwarder
    )
    DigitalaxMonaStaking(_monaToken, _accessControls, _trustedForwarder)
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
