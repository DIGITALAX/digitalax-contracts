// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../DigitalaxDedeNFT.sol";

contract DigitalaxDedeNFTMock is DigitalaxDedeNFT {
    uint256 public nowOverride;
    uint256 public maxDedeContributionTokensOverride;

    constructor(
        DigitalaxAccessControls _accessControls,
        address payable _fundsMultisig,
        uint256 _dedeStart,
        uint256 _dedeEnd,
        uint256 _dedeLockTime,
        string memory _tokenURI
    )
    DigitalaxDedeNFT(_accessControls, _fundsMultisig, _dedeStart, _dedeEnd, _dedeLockTime, _tokenURI)
    public {}

    function addContribution(uint256 _contributionAmount) external {
        contribution[_msgSender()] = _contributionAmount;
        totalContributions = totalContributions.add(_contributionAmount);
    }

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function setMaxDedeContributionTokensOverride(uint256 _maxDedeContributionTokensOverride) external {
        maxDedeContributionTokensOverride = _maxDedeContributionTokensOverride;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }

    function _getMaxDedeContributionTokens() internal override view returns (uint256) {
        return maxDedeContributionTokensOverride;
    }
}
