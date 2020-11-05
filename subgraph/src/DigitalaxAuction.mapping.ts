import {
    AuctionCreated,
    DigitalaxAuction as DigitalaxAuctionContract
} from "../generated/DigitalaxAuction/DigitalaxAuction";

import {
    DigitalaxGarmentAuction,
    DigitalaxGarmentDesigner
} from "../generated/schema"

export function handleAuctionCreated(event: AuctionCreated): void {
    let contract = DigitalaxAuctionContract.bind(event.address);
    let tokenId = event.params.garmentTokenId;

    // TODO: handle re-listing
    let auction = new DigitalaxGarmentAuction(tokenId.toString());
    auction.reservePrice = contract.auctions(tokenId).value0;
    //todo: other fields
    auction.save();

    let garmentDesigner = DigitalaxGarmentDesigner.load(tokenId.toString());
    let listings = garmentDesigner.listings;
    listings.push(tokenId.toString());
    garmentDesigner.listings = listings;
    garmentDesigner.save();
}
