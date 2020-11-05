import {
    AuctionCancelled,
    AuctionCreated, AuctionResulted, BidPlaced, BidWithdrawn,
    DigitalaxAuction as DigitalaxAuctionContract,
    DigitalaxAuctionContractDeployed
} from "../generated/DigitalaxAuction/DigitalaxAuction";

import {
    DigitalaxGarmentAuction,
    DigitalaxAuctionContract,
    DigitalaxGarmentDesigner,
    DigitalaxGarment,
    DigitalaxGarmentAuctionHistory
} from "../generated/schema"
import {ZERO} from "./constants";

export function handleAuctionCreated(event: AuctionCreated): void {
    let contract = DigitalaxAuctionContract.bind(event.address);
    let tokenId = event.params.garmentTokenId;

    // TODO: handle re-listing
    let auction = new DigitalaxGarmentAuction(tokenId.toString());

    // Auction config
    let auctionResult = contract.auctions(tokenId);
    auction.reservePrice = auctionResult.value0;
    auction.startTime = auctionResult.value1;
    auction.endTime = auctionResult.value2;
    auction.lister = auctionResult.value3;
    auction.resulted = auctionResult.value4;
    auction.save();

    let garmentDesigner = DigitalaxGarmentDesigner.load(tokenId.toString());
    let listings = garmentDesigner.listings;
    listings.push(tokenId.toString());
    garmentDesigner.listings = listings;
    garmentDesigner.save();

    // Auction Created event
    let eventId = tokenId.toString()
        .concat("-")
        .concat(event.transaction.hash.toHexString())
        .concat("-")
        .concat(event.transaction.index.toString());

    let auctionEvent = new DigitalaxGarmentAuctionHistory(eventId);
    auctionEvent.token = DigitalaxGarment.load(event.params.garmentTokenId.toString()).id
    auctionEvent.eventName = "AuctionCreated"
    auctionEvent.timestamp = event.block.timestamp
    auctionEvent.transactionHash = event.transaction.hash
    auctionEvent.save()
}

export function handleDigitalaxAuctionContractDeployed(event: DigitalaxAuctionContractDeployed): void {
    let contract = DigitalaxAuctionContract.bind(event.address);

    let auctionConfig = new DigitalaxAuctionContract(event.address.toHexString());
    auctionConfig.minBidIncrement = contract.minBidIncrement();
    auctionConfig.bidWithdrawalLockTime = contract.bidWithdrawalLockTime();
    auctionConfig.platformFee = contract.platformFee();
    auctionConfig.platformFeeRecipient = contract.platformFeeRecipient();
    auctionConfig.totalSales = ZERO;
    auctionConfig.save();
}

export function handleBidPlaced(event: BidPlaced): void {
    let contract = DigitalaxAuctionContract.bind(event.address);
    let tokenId = event.params.garmentTokenId;

    let auction = DigitalaxGarmentAuction.load(tokenId.toString());

    // Record top bidder
    const topBidder = contract.getHighestBidder(event.params.garmentTokenId)
    auction.topBidder = topBidder.value0
    auction.topBid = topBidder.value1
    auction.lastBidTime = topBidder.value2
    auction.save();

    let eventId = tokenId.toString()
        .concat("-")
        .concat(event.transaction.hash.toHexString())
        .concat("-")
        .concat(event.transaction.index.toString());

    let auctionEvent = new DigitalaxGarmentAuctionHistory(eventId);
    auctionEvent.token = DigitalaxGarment.load(event.params.garmentTokenId.toString()).id
    auctionEvent.eventName = "BidPlaced"
    auctionEvent.bidder = event.params.bidder
    auctionEvent.timestamp = event.block.timestamp
    auctionEvent.value = event.params.bid
    auctionEvent.transactionHash = event.transaction.hash
    auctionEvent.save()
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    let tokenId = event.params.garmentTokenId;

    let eventId = tokenId.toString()
        .concat("-")
        .concat(event.transaction.hash.toHexString())
        .concat("-")
        .concat(event.transaction.index.toString());

    let auctionEvent = new DigitalaxGarmentAuctionHistory(eventId);
    auctionEvent.token = DigitalaxGarment.load(event.params.garmentTokenId.toString()).id
    auctionEvent.eventName = "BidWithdrawn"
    auctionEvent.bidder = event.params.bidder
    auctionEvent.timestamp = event.block.timestamp
    auctionEvent.value = event.params.bid
    auctionEvent.transactionHash = event.transaction.hash
    auctionEvent.save()
}

export function handleAuctionResulted(event: AuctionResulted): void {
    let tokenId = event.params.garmentTokenId;

    let eventId = tokenId.toString()
        .concat("-")
        .concat(event.transaction.hash.toHexString())
        .concat("-")
        .concat(event.transaction.index.toString());

    let auctionEvent = new DigitalaxGarmentAuctionHistory(eventId);
    auctionEvent.token = DigitalaxGarment.load(event.params.garmentTokenId.toString()).id
    auctionEvent.eventName = "AuctionResulted"
    auctionEvent.bidder = event.params.winner
    auctionEvent.timestamp = event.block.timestamp
    auctionEvent.value = event.params.winningBid
    auctionEvent.transactionHash = event.transaction.hash
    auctionEvent.save()

    // Record winning bid
    let auctionConfig = DigitalaxAuctionContract.load(event.address.toHexString());
    auctionConfig.totalSales = auctionConfig.totalSales.plus(event.params.winningBid)

    // Result the auction
    let auction = DigitalaxGarmentAuction.load(tokenId.toString());
    auction.resulted = true
    auction.topBidder = null
    auction.topBid = null
    auction.lastBidTime = null
    auction.save();

}

export function handleAuctionCancelled(event: AuctionCancelled): void {
    let tokenId = event.params.garmentTokenId;

    let eventId = tokenId.toString()
        .concat("-")
        .concat(event.transaction.hash.toHexString())
        .concat("-")
        .concat(event.transaction.index.toString());

    let auctionEvent = new DigitalaxGarmentAuctionHistory(eventId);
    auctionEvent.token = DigitalaxGarment.load(event.params.garmentTokenId.toString()).id
    auctionEvent.eventName = "AuctionCancelled"
    auctionEvent.timestamp = event.block.timestamp
    auctionEvent.transactionHash = event.transaction.hash
    auctionEvent.save()
}
