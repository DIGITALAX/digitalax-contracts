import { log, BigInt, Address, store } from "@graphprotocol/graph-ts/index";
import { ONE } from "./constants";

import {
  OfferCreated,
  OfferPurchased,
  UpdateOfferPrimarySalePrice,
  DigitalaxMarketplaceV3 as DigitalaxMarketplaceV3Contract,
  OfferCancelled,
  DigitalaxMarketplaceContractDeployed,
  UpdateMarketplacePlatformFee,
  UpdateMarketplaceDiscountToPayInErc20,
  OfferPurchasedWithPaymentToken,
} from "../generated/DigitalaxMarketplaceV3/DigitalaxMarketplaceV3";

import {
  DigitalaxMarketplaceV3Offer,
  DigitalaxMarketplaceV3PurchaseHistory,
  DigitalaxGarmentV2Collection,
} from "../generated/schema";
import { loadOrCreateGarmentNFTV2GlobalStats } from "./factory/DigitalaxGarmentNFTV2GlobalStats.factory";
import { ZERO } from "./constants";
import { loadDayFromEvent } from "./factory/DripDay.factory";
import { loadOrCreateDripGlobalStats } from "./factory/DripGlobalStats.factory";
import { loadOrCreateDigitalaxMarketplaceV3PurchaseHistory } from "./factory/DigitalaxMarketplaceV3PurchaseHistory.factory";

export function handleMarketplaceDeployed(
  event: DigitalaxMarketplaceContractDeployed
): void {
  let contract = DigitalaxMarketplaceV3Contract.bind(event.address);
  let globalStats = loadOrCreateGarmentNFTV2GlobalStats();
  globalStats.save();
}

export function handleUpdateMarketplacePlatformFee(
  event: UpdateMarketplacePlatformFee
): void {
  let offer = DigitalaxMarketplaceV3Offer.load(
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
  let offer = DigitalaxMarketplaceV3Offer.load(
    event.params.garmentCollectionId.toString()
  );
  if (offer) {
    offer.discountToPayMona = event.params.discount;
    offer.save();
  }
}

export function handleOfferCreated(event: OfferCreated): void {
  let contract = DigitalaxMarketplaceV3Contract.bind(event.address);
  let offer = new DigitalaxMarketplaceV3Offer(
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
  let offer = DigitalaxMarketplaceV3Offer.load(
    event.params.garmentCollectionId.toString()
  );
  if (offer) {
    offer.primarySalePrice = event.params.primarySalePrice;
    offer.save();
  }
}

export function handleOfferPurchased(event: OfferPurchased): void {
  let contract = DigitalaxMarketplaceV3Contract.bind(event.address);
  let collection = DigitalaxGarmentV2Collection.load(
    event.params.garmentCollectionId.toString()
  );
  const onChainOffer = contract.try_getOffer(event.params.garmentCollectionId);
  if (collection) {
    if (!onChainOffer.reverted) {
      let history = loadOrCreateDigitalaxMarketplaceV3PurchaseHistory(
        event.params.bundleTokenId.toString()
      );
      history.eventName = "Purchased";
      history.timestamp = event.block.timestamp;
      history.token = event.params.bundleTokenId.toString();
      history.transactionHash = event.transaction.hash;
      history.token = event.params.bundleTokenId.toString();
      history.value = onChainOffer.value.value0;
      history.buyer = event.params.buyer;
      history.paymentTokenTransferredAmount = event.params.monaTransferredAmount;
      history.garmentCollectionId = event.params.garmentCollectionId;
      history.rarity = collection.rarity;
      let weth = contract.wethERC20Token();
      history.usdEthExchange = contract.lastOracleQuote(weth);

      let day = loadDayFromEvent(event);

      let globalStats = loadOrCreateDripGlobalStats();

      globalStats.totalMarketplaceSalesInUSD = globalStats.totalMarketplaceSalesInUSD.plus(history.value);
      day.totalMarketplaceVolumeInUSD = day.totalMarketplaceVolumeInUSD.plus(history.value);

      globalStats.usdETHConversion = contract.lastOracleQuote(weth);

      day.save();
      history.save();
      globalStats.save();

      let offer = DigitalaxMarketplaceV3Offer.load(
        event.params.garmentCollectionId.toString()
      );
      offer.amountSold = offer.amountSold.plus(ONE);
      offer.save();

      collection.valueSold = collection.valueSold.plus(
        onChainOffer.value.value0
      );
      collection.save();
    }
  }
}

export function handleOfferPurchasedWithPaymentTOken(event: OfferPurchasedWithPaymentToken): void {
  let contract = DigitalaxMarketplaceV3Contract.bind(event.address);
  let history = loadOrCreateDigitalaxMarketplaceV3PurchaseHistory(
    event.params.bundleTokenId.toString()
  );
  history.discountToPayERC20 = event.params.discountToPayInERC20;
  history.paymentToken = event.params.paymentToken;
  history.platformFee = event.params.platformFee;
  history.save();
}

export function handleOfferCancelled(event: OfferCancelled): void {
  let offer = DigitalaxMarketplaceV3Offer.load(
    event.params.bundleTokenId.toString()
  );
  if (offer) {
    offer.primarySalePrice = null;
    offer.garmentCollection = null;
    offer.save();
  }
}
