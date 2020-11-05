import {
    AuctionCreated,
    DigitalaxAuction as DigitalaxAuctionContract,
    DigitalaxAuctionContractDeployed
} from "../generated/DigitalaxAuction/DigitalaxAuction";

import {
    DigitalaxGarmentAuction,
    DigitalaxAuctionConfig
} from "../generated/schema"
import {ZERO} from "./constants";

export function handleAuctionCreated(event: AuctionCreated): void {
    let contract = DigitalaxAuctionContract.bind(event.address);
    let tokenId = event.params.garmentTokenId;

    // TODO: handle re-listing
    let auction = new DigitalaxGarmentAuction(tokenId.toString());
    auction.reservePrice = contract.auctions(tokenId).value0;
    //todo: other fields
    auction.save();

}

export function handleDigitalaxAuctionContractDeployed(event: DigitalaxAuctionContractDeployed): void {
    let contract = DigitalaxAuctionContract.bind(event.address);

    let auctionConfig = new DigitalaxAuctionConfig(event.address.toHexString());
    auctionConfig.minBidIncrement = contract.minBidIncrement();
    auctionConfig.bidWithdrawalLockTime = contract.bidWithdrawalLockTime();
    auctionConfig.platformFee = contract.platformFee();
    auctionConfig.platformFeeRecipient = contract.platformFeeRecipient();
    auctionConfig.totalSales = ZERO;
    auctionConfig.save();
}
