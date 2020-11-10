// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../DigitalaxAuction.sol";

contract DigitalaxAuctionMock is DigitalaxAuction {
    uint256 public nowOverride;

    constructor(
        DigitalaxAccessControls _accessControls,
        IDigitalaxGarmentNFT _garmentNft,
        address payable _platformReserveAddress
    )
    DigitalaxAuction(_accessControls, _garmentNft, _platformReserveAddress)
    public {}

    function setNowOverride(uint256 _now) external {
        nowOverride = _now;
    }

    function _getNow() internal override view returns (uint256) {
        return nowOverride;
    }
}
