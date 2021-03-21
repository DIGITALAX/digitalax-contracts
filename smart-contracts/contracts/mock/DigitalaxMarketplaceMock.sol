// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../DigitalaxMarketplace.sol";

contract DigitalaxMarketplaceMock is DigitalaxMarketplace {
    uint256 public nowOverride;

    constructor(
        DigitalaxAccessControls _accessControls,
        IDigitalaxGarmentNFT _garmentNft,
        DigitalaxGarmentCollection _garmentCollection,
        IDigitalaxMonaOracle _oracle,
        address payable _platformReserveAddress,
        address _monaErc20Token,
        address _trustedForwarder
    )
    DigitalaxMarketplace(_accessControls, _garmentNft, _garmentCollection, _oracle, _platformReserveAddress, _monaErc20Token, _trustedForwarder)
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
