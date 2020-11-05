import {
    AuctionCreated,
    DigitalaxAuction as DigitalaxAuctionContract
} from "../generated/DigitalaxAuction/DigitalaxAuction";

import {
    DigitalaxGarmentAuction
} from "../generated/schema"

export function handleAuctionCreated(event: AuctionCreated): void {
    let contract = DigitalaxAuctionContract.bind(event.address);
    let tokenId = event.params.garmentTokenId;

    // TODO: handle re-listing
    // let auction = new DigitalaxGarmentAuction(tokenId.toString());
    // auction.reservePrice = contract.auctions(tokenId).
}
