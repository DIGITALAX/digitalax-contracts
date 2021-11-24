// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxMonaStaking.sol";

contract DigitalaxMonaStakingMock is DigitalaxMonaStaking {
    uint256 public nowOverride;

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }

    // Temporary to test
    function monaValue(uint256 lpQuantity)
        internal
        override
        view
        returns (uint256)
    {
        return lpQuantity;
    }
}
