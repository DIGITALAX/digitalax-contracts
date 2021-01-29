// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxRewardsV2.sol";

contract DigitalaxRewardsV2Mock is DigitalaxRewardsV2 {
    uint256 public nowOverride;

    constructor(
        MONA _monaToken,
        DigitalaxAccessControls _accessControls,
        DigitalaxStaking _monaStaking,
        uint256 _startTime,
        uint256 _monaRewardsPaidTotal,
        uint256 _ethRewardsPaidTotal
    )
    DigitalaxRewardsV2(_monaToken, _accessControls, _monaStaking, _startTime, _monaRewardsPaidTotal, _ethRewardsPaidTotal)
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
