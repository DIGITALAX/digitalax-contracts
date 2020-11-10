// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../DigitalaxAuction.sol";

contract BiddingContractMock {
    DigitalaxAuction public auctionContract;

    constructor(DigitalaxAuction _auctionContract) public {
        auctionContract = _auctionContract;
    }

    function bid(uint256 _garmentTokenId) external payable {
        auctionContract.placeBid{value: msg.value}(_garmentTokenId);
    }
}
