import {log, BigInt, Address, store} from "@graphprotocol/graph-ts/index";
import {ONE} from "./constants";

import {
    OfferCreated,
    OfferPurchased,
    UpdateOfferPrimarySalePrice,
    DigitalaxMarketplace as DigitalaxMarketplaceContract,
    OfferCancelled,
    DigitalaxMarketplaceContractDeployed,
    UpdateMarketplacePlatformFee,
    UpdateMarketplaceDiscountToPayInErc20
} from "../generated/DigitalaxMarketplace/DigitalaxMarketplace";

import {
    DigitalaxMarketplaceOffer,
    DigitalaxMarketplacePurchaseHistory,
    DigitalaxGarmentCollection,
} from "../generated/schema";
import {loadOrCreateGarmentNFTGlobalStats} from "./factory/DigitalaxGarmentNFTGlobalStats.factory";
import { ZERO } from "./constants";
import { loadDayFromEvent } from "./factory/Day.factory";

export function handleMarketplaceDeployed(event: DigitalaxMarketplaceContractDeployed): void {
    let contract = DigitalaxMarketplaceContract.bind(event.address);
    let globalStats = loadOrCreateGarmentNFTGlobalStats();
    //globalStats.monaDiscount = contract.discountToPayERC20();
    globalStats.marketplacePlatformFee = contract.platformFee();
    globalStats.save();
}

export function handleUpdateMarketplacePlatformFee(event: UpdateMarketplacePlatformFee): void {
    let globalStats = loadOrCreateGarmentNFTGlobalStats();
    globalStats.marketplacePlatformFee = event.params.platformFee;
    globalStats.save();
}

export function handleUpdateMarketplaceDiscountToPayInErc20(event: UpdateMarketplaceDiscountToPayInErc20): void {
    let globalStats = loadOrCreateGarmentNFTGlobalStats();
    //globalStats.monaDiscount = event.params.discount;
    globalStats.save();
}

export function handleOfferCreated(event: OfferCreated): void {
    let contract = DigitalaxMarketplaceContract.bind(event.address);
    let offer = new DigitalaxMarketplaceOffer(event.params.garmentCollectionId.toString());
    let offerData = contract.getOffer(event.params.garmentCollectionId);
    offer.primarySalePrice = offerData.value0;
    offer.startTime = offerData.value1;
    offer.amountSold = ZERO;
    offer.garmentCollection = event.params.garmentCollectionId.toString();
    offer.save();
}

export function handleOfferPrimarySalePriceUpdated(event: UpdateOfferPrimarySalePrice): void {
    let offer = DigitalaxMarketplaceOffer.load(event.params.garmentCollectionId.toString());
    offer.primarySalePrice = event.params.primarySalePrice;
    offer.save();
}

export function handleOfferPurchased(event: OfferPurchased): void {
    let collection = DigitalaxGarmentCollection.load(event.params.garmentCollectionId.toString());
    let history = new DigitalaxMarketplacePurchaseHistory(event.params.garmentTokenId.toString());
    history.eventName = "Purchased";
    history.timestamp = event.block.timestamp;
    history.token = event.params.garmentTokenId.toString();
    history.transactionHash = event.transaction.hash;
    history.token = event.params.garmentTokenId.toString();
    history.buyer = event.params.buyer;
    history.value = event.params.primarySalePrice;
    history.isPaidWithMona = event.params.paidInErc20;
    history.monaTransferredAmount = event.params.monaTransferredAmount;
    history.garmentAuctionId = collection.garmentAuctionID;
    history.rarity = collection.rarity;

    let globalStats = loadOrCreateGarmentNFTGlobalStats();
    history.platformFee = globalStats.marketplacePlatformFee;
    let day = loadDayFromEvent(event);    

    if(history.isPaidWithMona){
        //history.discount = globalStats.discountToPayERC20;
        globalStats.totalMarketplaceSalesInMona = globalStats.totalMarketplaceSalesInMona.plus(history.monaTransferredAmount);
        day.totalMarketplaceVolumeInMona = day.totalMarketplaceVolumeInMona.plus(history.monaTransferredAmount);
    } else {
        //history.discount = new BigInt(0);
        globalStats.totalMarketplaceSalesInETH = globalStats.totalMarketplaceSalesInETH.plus(history.value);
        day.totalMarketplaceVolumeInETH = day.totalMarketplaceVolumeInETH.plus(history.value);
    }

    day.save();
    history.save();
    globalStats.save();

    let offer = DigitalaxMarketplaceOffer.load(event.params.garmentCollectionId.toString());
    offer.amountSold = offer.amountSold.plus(ONE);
    offer.save();
}

export function handleOfferCancelled(event: OfferCancelled): void {
    let offer = DigitalaxMarketplaceOffer.load(event.params.garmentTokenId.toString());
    offer.primarySalePrice = null;
    offer.garmentCollection = null;
    offer.save();
}
