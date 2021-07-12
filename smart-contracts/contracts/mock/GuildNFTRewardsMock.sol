// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../oracle/IDigitalaxMonaOracle.sol";
import "../staking/GuildNFTRewards.sol";

contract GuildNFTRewardsMock is GuildNFTRewards {
    uint256 public nowOverride;

    constructor(
        DECO _decoToken,
        DigitalaxAccessControls _accessControls,
        DigitalaxStaking _nftStaking,
        IOracle _oracle,
        address _trustedForwarder,
        uint256 _startTime,
        uint256 _decoRewardsPaidTotal
    )
    GuildNFTRewards(_decoToken, _accessControls, _nftStaking, _oracle, _trustedForwarder, _startTime, _decoRewardsPaidTotal)
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
