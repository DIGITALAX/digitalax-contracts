import {log, BigInt, Address, store} from "@graphprotocol/graph-ts/index";
import {ONE} from "./constants";

import {
    OfferCreated,
    OfferPurchased,
    UpdateOfferPrimarySalePrice,
    DigitalaxSubscriptionMarketplace as DigitalaxSubscriptionMarketplaceContract,
    OfferCancelled,
    DigitalaxSubscriptionMarketplaceContractDeployed,
    UpdateMarketplacePlatformFee,
    UpdateMarketplaceDiscountToPayInErc20, UpdateOfferStartEnd
} from "../generated/DigitalaxSubscriptionMarketplace/DigitalaxSubscriptionMarketplace";

import {
    DigitalaxSubscriptionMarketplaceOffer,
    DigitalaxSubscriptionPurchaseHistory,
    DigitalaxSubscriptionCollection,
} from "../generated/schema";
import {loadOrCreateSubscriptionNFTGlobalStats} from "./factory/DigitalaxSubscriptionNFTGlobalStats.factory";
import { ZERO } from "./constants";
import { loadDayFromEvent } from "./factory/SubscriptionDay.factory";

export function handleMarketplaceDeployed(event: DigitalaxSubscriptionMarketplaceContractDeployed): void {
    let contract = DigitalaxSubscriptionMarketplaceContract.bind(event.address);
    let globalStats = loadOrCreateSubscriptionNFTGlobalStats();
    globalStats!.save();
}

export function handleUpdateMarketplacePlatformFee(event: UpdateMarketplacePlatformFee): void {
    let offer = DigitalaxSubscriptionMarketplaceOffer.load(event.params.subscriptionCollectionId.toString());
    if (offer) {
        offer.marketplacePlatformFee = event.params.platformFee;
        offer.save();
    }
}

export function handleUpdateMarketplaceDiscountToPayInErc20(event: UpdateMarketplaceDiscountToPayInErc20): void {
    let offer = DigitalaxSubscriptionMarketplaceOffer.load(event.params.subscriptionCollectionId.toString());
    if (offer) {
        offer.discountToPayMona = event.params.discount;
        offer.save();
    }
}

export function handleOfferCreated(event: OfferCreated): void {
    let contract = DigitalaxSubscriptionMarketplaceContract.bind(event.address);
    let offer = new DigitalaxSubscriptionMarketplaceOffer(event.params.subscriptionCollectionId.toString());
    let offerData = contract.getOffer(event.params.subscriptionCollectionId);
    offer.subscriptionCollection = event.params.subscriptionCollectionId.toString();
    offer.primarySalePrice = offerData.value0;
    offer.startTime = offerData.value1;
    offer.endTime = offerData.value2;
    offer.amountSold = ZERO;
    offer.marketplacePlatformFee = offerData.value4;
    offer.discountToPayMona = offerData.value5;
    offer.save();
}

export function handleOfferPrimarySalePriceUpdated(event: UpdateOfferPrimarySalePrice): void {
    let offer = DigitalaxSubscriptionMarketplaceOffer.load(event.params.subscriptionCollectionId.toString());
    if (offer) {
        offer.primarySalePrice = event.params.primarySalePrice;
        offer.save();
    }
}

export function handleUpdateOfferStartEnd(event: UpdateOfferStartEnd): void {
    let offer = DigitalaxSubscriptionMarketplaceOffer.load(event.params.subscriptionCollectionId.toString());
    if (offer) {
        offer.startTime = event.params.startTime;
        offer.endTime = event.params.endTime;
        offer.save();
    }
}

export function handleOfferPurchased(event: OfferPurchased): void {
    let collection = DigitalaxSubscriptionCollection.load(event.params.subscriptionCollectionId.toString());
    let history = new DigitalaxSubscriptionPurchaseHistory(event.params.bundleTokenId.toString());
    history.eventName = "Purchased";
    history.timestamp = event.block.timestamp;
    history.token = event.params.bundleTokenId.toString();
    history.transactionHash = event.transaction.hash;
    history.buyer = event.params.buyer;
    history.value = event.params.primarySalePrice;
    history.isPaidWithMona = event.params.paidInErc20;
    history.monaTransferredAmount = event.params.monaTransferredAmount;
    history.bundleId = collection.bundleID;
    history.rarity = collection.rarity;
    history.platformFee = event.params.platformFee;

    let day = loadDayFromEvent(event);
    let globalStats = loadOrCreateSubscriptionNFTGlobalStats();

    // if(history.isPaidWithMona){
        globalStats!.totalMarketplaceSalesInMona = globalStats!.totalMarketplaceSalesInMona.plus(history.monaTransferredAmount);
        day!.totalMarketplaceVolumeInMona = day!.totalMarketplaceVolumeInMona.plus(history.monaTransferredAmount);
        history.discountToPayMona = event.params.discountToPayInERC20;

    day.save();
    history.save();
    globalStats!.save();

    let offer = DigitalaxSubscriptionMarketplaceOffer.load(event.params.subscriptionCollectionId.toString());
    offer.amountSold = offer.amountSold.plus(ONE);
    offer.save();

    collection.valueSold = collection.valueSold.plus(event.params.primarySalePrice);
    collection.save();
}

export function handleOfferCancelled(event: OfferCancelled): void {
    let offer = DigitalaxSubscriptionMarketplaceOffer.load(event.params.bundleTokenId.toString());
    if (offer) {
        offer.primarySalePrice = null;
        offer.subscriptionCollection = null;
        offer.startTime = null;
        offer.endTime = null;
        offer.save();
    }
}
