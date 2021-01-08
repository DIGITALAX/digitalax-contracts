import {log, BigInt, Address, store} from "@graphprotocol/graph-ts/index";

import {
    OfferCreated,
    OfferPurchased,
    UpdateOfferPrimarySalePrice,
    DigitalaxMarketplace as DigitalaxMarketplaceContract,
    OfferCancelled
} from "../generated/DigitalaxMarketplace/DigitalaxMarketplace";

import {
    DigitalaxMarketplaceOffer,
    DigitalaxMarketplacePurchaseHistory,
} from "../generated/schema";
import {loadOrCreateMarketplaceGlobalStats} from "./factory/DigitalaxMarketplaceGlobalStats.factory";

export function handleOfferCreated(event: OfferCreated): void {
    let contract = DigitalaxMarketplaceContract.bind(event.address);
    let offer = new DigitalaxMarketplaceOffer(event.params.garmentCollectionId.toString());
    let offerData = contract.getOffer(event.params.garmentCollectionId);
    offer.primarySalePrice = offerData.value0;
    offer.startTime = offerData.value1;
    offer.garmentCollection = event.params.garmentCollectionId.toString();
    offer.save();
}

export function handleOfferPrimarySalePriceUpdated(event: UpdateOfferPrimarySalePrice): void {
    let offer = DigitalaxMarketplaceOffer.load(event.params.garmentCollectionId.toString());
    offer.primarySalePrice = event.params.primarySalePrice;
    offer.save();
}

export function handleOfferPurchased(event: OfferPurchased): void {
    let history = new DigitalaxMarketplacePurchaseHistory(event.params.garmentTokenId.toString());
    history.token = event.params.garmentTokenId.toString();
    history.transactionHash = event.transaction.hash;
    history.token = event.params.garmentTokenId.toString();
    history.buyer = event.params.buyer;
    history.value = event.params.primarySalePrice;
    history.isPaidWithMona = event.params.paidInErc20;
    history.monaTransferredAmount = event.params.monaTransferredAmount;
    history.save();

    let globalStats = loadOrCreateMarketplaceGlobalStats();
    if(history.isPaidWithMona) {
        globalStats.totalMonaSalesValue = new BigInt(globalStats.totalMonaSalesValue.toI32() + history.monaTransferredAmount);
    } else {
        globalStats.totalETHSalesValue = new BigInt(globalStats.totalETHSalesValue.toI32() + history.value);
    }
    globalStats.save();
    let offer = DigitalaxMarketplaceOffer.load(event.params.garmentCollectionId.toString());
    offer.amountSold = new BigInt(offer.amountSold.toI32() + 1);
    offer.save();
}

export function handleOfferCancelled(event: OfferCancelled): void {
    let offer = DigitalaxMarketplaceOffer.load(event.params.garmentTokenId.toString());
    offer.primarySalePrice = null;
    offer.garmentCollection = null;
    offer.save();
}
