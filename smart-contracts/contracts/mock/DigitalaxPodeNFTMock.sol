// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../DigitalaxPodeNFT.sol";

contract DigitalaxPodeNFTMock is DigitalaxPodeNFT {
    uint256 public nowOverride;
    uint256 public maxPodeContributionTokensOverride;

    constructor(
        address payable _fundsMultisig,
        uint256 _podeStart,
        uint256 _podeEnd,
        uint256 _podeLockTime,
        string memory _tokenURI
    )
    DigitalaxPodeNFT(_fundsMultisig, _podeStart, _podeEnd, _podeLockTime, _tokenURI)
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function setMaxPodeContributionTokensOverride(uint256 _maxPodeContributionTokensOverride) external {
        maxPodeContributionTokensOverride = _maxPodeContributionTokensOverride;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }

    function _getMaxPodeContributionTokens() internal override view returns (uint256) {
        return maxPodeContributionTokensOverride;
    }
}
