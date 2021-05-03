// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../staking/DigitalaxNFTRewardsV2.sol";
import "../oracle/IDigitalaxMonaOracle.sol";

contract DigitalaxNFTRewardsV2Mock is DigitalaxNFTRewardsV2 {
    uint256 public nowOverride;

    constructor(
        MONA _monaToken,
        DigitalaxAccessControls _accessControls,
        DigitalaxStaking _nftStaking,
        IDigitalaxMonaOracle _oracle,
        address _trustedForwarder,
        uint256 _startTime,
        uint256 _monaRewardsPaidTotal
    )
    DigitalaxNFTRewardsV2(_monaToken, _accessControls, _nftStaking, _oracle, _trustedForwarder, _startTime, _monaRewardsPaidTotal)
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
