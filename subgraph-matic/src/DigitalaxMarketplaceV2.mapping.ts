import { log, BigInt, Address, store } from "@graphprotocol/graph-ts/index";
import { ONE } from "./constants";

import {
  OfferCreated,
  OfferPurchased,
  UpdateOfferPrimarySalePrice,
  DigitalaxMarketplaceV2 as DigitalaxMarketplaceV2Contract,
  OfferCancelled,
  DigitalaxMarketplaceContractDeployed,
  UpdateMarketplacePlatformFee,
  UpdateMarketplaceDiscountToPayInErc20,
} from "../generated/DigitalaxMarketplaceV2/DigitalaxMarketplaceV2";

import {
  DigitalaxMarketplaceV2Offer,
  DigitalaxMarketplaceV2PurchaseHistory,
  DigitalaxGarmentV2Collection,
} from "../generated/schema";
import { loadOrCreateGarmentNFTV2GlobalStats } from "./factory/DigitalaxGarmentNFTV2GlobalStats.factory";
import { ZERO } from "./constants";
import { loadDayFromEvent } from "./factory/Day.factory";

export function handleMarketplaceDeployed(
  event: DigitalaxMarketplaceContractDeployed
): void {
  let contract = DigitalaxMarketplaceV2Contract.bind(event.address);
  let globalStats = loadOrCreateGarmentNFTV2GlobalStats();
  globalStats!.save();
}

export function handleUpdateMarketplacePlatformFee(
  event: UpdateMarketplacePlatformFee
): void {
  let offer = DigitalaxMarketplaceV2Offer.load(
    event.params.garmentCollectionId.toString()
  );
  if (offer) {
    offer.marketplacePlatformFee = event.params.platformFee;
    offer.save();
  }
}

export function handleUpdateMarketplaceDiscountToPayInErc20(
  event: UpdateMarketplaceDiscountToPayInErc20
): void {
  let offer = DigitalaxMarketplaceV2Offer.load(
    event.params.garmentCollectionId.toString()
  );
  if (offer) {
    offer.discountToPayMona = event.params.discount;
    offer.save();
  }
}

export function handleOfferCreated(event: OfferCreated): void {
  let contract = DigitalaxMarketplaceV2Contract.bind(event.address);
  let offer = new DigitalaxMarketplaceV2Offer(
    event.params.garmentCollectionId.toString()
  );
  let offerData = contract.getOffer(event.params.garmentCollectionId);
  offer.primarySalePrice = offerData.value0;
  offer.startTime = offerData.value1;
  offer.endTime = offerData.value2;
  offer.garmentCollection = event.params.garmentCollectionId.toString();
  offer.amountSold = ZERO;
  offer.marketplacePlatformFee = offerData.value4;
  offer.discountToPayMona = offerData.value5;
  offer.save();
}

export function handleOfferPrimarySalePriceUpdated(
  event: UpdateOfferPrimarySalePrice
): void {
  let offer = DigitalaxMarketplaceV2Offer.load(
    event.params.garmentCollectionId.toString()
  );
  if (offer) {
    offer.primarySalePrice = event.params.primarySalePrice;
    offer.save();
  }
}

export function handleOfferPurchased(event: OfferPurchased): void {
  let contract = DigitalaxMarketplaceV2Contract.bind(event.address);
  let collection = DigitalaxGarmentV2Collection.load(
    event.params.garmentCollectionId.toString()
  );
  if(collection) {
    let history = new DigitalaxMarketplaceV2PurchaseHistory(
        event.params.bundleTokenId.toString()
    );
    history.eventName = "Purchased";
    history.timestamp = event.block.timestamp;
    history.token = event.params.bundleTokenId.toString();
    history.transactionHash = event.transaction.hash;
    history.token = event.params.bundleTokenId.toString();
    history.value = event.params.primarySalePrice;
    history.buyer = event.params.buyer;
    history.isPaidWithMona = event.params.paidInErc20;
    history.monaTransferredAmount = event.params.monaTransferredAmount;
    history.garmentAuctionId = collection.garmentAuctionID;
    history.rarity = collection.rarity;
    history.platformFee = event.params.platformFee;
    history.monaPerEth = contract.lastOracleQuote();

    let day = loadDayFromEvent(event);
    let globalStats = loadOrCreateGarmentNFTV2GlobalStats();

    if (history.isPaidWithMona) {
      globalStats.totalMarketplaceSalesInMona = globalStats.totalMarketplaceSalesInMona.plus(
          history.monaTransferredAmount
      );
      day.totalMarketplaceVolumeInMona = day.totalMarketplaceVolumeInMona.plus(
          history.monaTransferredAmount
      );
      history.discountToPayMona = event.params.discountToPayInERC20;
    } else {
      globalStats.totalMarketplaceSalesInETH = globalStats.totalMarketplaceSalesInETH.plus(
          history.value
      );
      day.totalMarketplaceVolumeInETH = day.totalMarketplaceVolumeInETH.plus(
          history.value
      );
      history.discountToPayMona = ZERO;
    }

    globalStats.monaPerEth = contract.lastOracleQuote();

    day.save();
    history.save();
    globalStats!.save();

    let offer = DigitalaxMarketplaceV2Offer.load(
        event.params.garmentCollectionId.toString()
    );
    offer.amountSold = offer.amountSold.plus(ONE);
    offer.save();

    collection.valueSold = collection.valueSold.plus(
        event.params.primarySalePrice
    );
    collection.save();
  }
}

export function handleOfferCancelled(event: OfferCancelled): void {
  let offer = DigitalaxMarketplaceV2Offer.load(
    event.params.bundleTokenId.toString()
  );
  if (offer) {
    offer.primarySalePrice = null;
    offer.garmentCollection = null;
    offer.save();
  }
}
