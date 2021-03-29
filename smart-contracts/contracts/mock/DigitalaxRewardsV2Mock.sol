// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxRewardsV2.sol";

contract DigitalaxRewardsV2Mock is DigitalaxRewardsV2 {
    uint256 public nowOverride;

    constructor(
        MONA _monaToken,
        DigitalaxAccessControls _accessControls,
        DigitalaxStaking _monaStaking,
        IUniswapV2Pair _lpToken,
        uint256 _startTime,
        uint256 _monaRewardsPaidTotal
    )
    DigitalaxRewardsV2(_monaToken, _accessControls, _monaStaking, _lpToken, _startTime, _monaRewardsPaidTotal)
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
