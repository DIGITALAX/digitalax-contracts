// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../DigitalaxAuction.sol";

contract DigitalaxAuctionMock is DigitalaxAuction {
    uint256 public nowOverride;

    constructor(
        DigitalaxAccessControls _accessControls,
        IDigitalaxGarmentNFT _garmentNft,
        IDigitalaxMonaOracle _oracle,
        IERC20 _monaToken,
        address payable _platformReserveAddress,
        address _trustedForwarder
    )
    DigitalaxAuction(_accessControls, _garmentNft, _oracle, _monaToken, _platformReserveAddress, _trustedForwarder)
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
