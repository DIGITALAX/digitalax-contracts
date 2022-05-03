import { log, BigInt, Address, store } from "@graphprotocol/graph-ts/index";
import { ONE } from "./constants";

import {
  OfferCreated,
  OfferPurchased,
  UpdateOfferPrimarySalePrice,
  DigitalaxCC0Marketplace as DigitalaxCC0MarketplaceContract,
  OfferCancelled,
  DigitalaxMarketplaceContractDeployed,
  UpdateMarketplacePlatformFee,
  UpdateMarketplaceDiscountToPayInErc20,
  OfferPurchasedWithPaymentToken,
} from "../generated/DigitalaxCC0Marketplace/DigitalaxCC0Marketplace";

import {
  DigitalaxCC0MarketplaceOffer,
  DigitalaxCC0NFTCollection,
} from "../generated/schema";
import { loadOrCreateCC0GlobalStats } from "./factory/DigitalaxCC0GlobalStats.factory";
import { ZERO } from "./constants";
import { loadDayFromEvent } from "./factory/DripDay.factory";
import { loadOrCreateDripGlobalStats } from "./factory/DripGlobalStats.factory";
import { loadOrCreateDigitalaxMarketplaceV3PurchaseHistory } from "./factory/DigitalaxCC0MarketplacePurchaseHistory.factory";

export function handleMarketplaceDeployed(
  event: DigitalaxMarketplaceContractDeployed
): void {
  let contract = DigitalaxCC0MarketplaceContract.bind(event.address);
  let globalStats = loadOrCreateCC0GlobalStats();
  globalStats!.save();
}

export function handleUpdateMarketplacePlatformFee(
  event: UpdateMarketplacePlatformFee
): void {
  let offer = DigitalaxCC0MarketplaceOffer.load(
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
  let offer = DigitalaxCC0MarketplaceOffer.load(
    event.params.garmentCollectionId.toString()
  );
  if (offer) {
    offer.discountToPayMona = event.params.discount;
    offer.save();
  }
}

export function handleOfferCreated(event: OfferCreated): void {
  let contract = DigitalaxCC0MarketplaceContract.bind(event.address);
  let offer = new DigitalaxCC0MarketplaceOffer(
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
  let offer = DigitalaxCC0MarketplaceOffer.load(
    event.params.garmentCollectionId.toString()
  );
  if (offer) {
    offer.primarySalePrice = event.params.primarySalePrice;
    offer.save();
  }
}

export function handleOfferPurchased(event: OfferPurchased): void {
  let contract = DigitalaxCC0MarketplaceContract.bind(event.address);
  let collection = DigitalaxCC0NFTCollection.load(
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
      history.orderId = event.params.orderId;
      history.paymentTokenTransferredAmount =
        event.params.monaTransferredAmount;
      history.garmentCollectionId = event.params.garmentCollectionId;
      history.rarity = collection.rarity;
      let weth = contract.wethERC20Token();
      history.usdEthExchange = contract.lastOracleQuote(weth);

      let day = loadDayFromEvent(event);

      let globalStats = loadOrCreateDripGlobalStats();

      globalStats.totalMarketplaceSalesInUSD =
        globalStats.totalMarketplaceSalesInUSD.plus(history.value);
      day.totalMarketplaceVolumeInUSD = day.totalMarketplaceVolumeInUSD.plus(
        history.value
      );

      globalStats.usdETHConversion = contract.lastOracleQuote(weth);

      day.save();
      history.save();
      globalStats!.save();

      let offer = DigitalaxCC0MarketplaceOffer.load(
        event.params.garmentCollectionId.toString()
      );
      offer!.amountSold = offer!.amountSold.plus(ONE);
      offer!.save();

      collection!.valueSold = collection!.valueSold.plus(
        onChainOffer.value.value0
      );
      collection!.save();
    }
  }
}

export function handleOfferPurchasedWithPaymentToken(
  event: OfferPurchasedWithPaymentToken
): void {
  let contract = DigitalaxCC0MarketplaceContract.bind(event.address);
  let history = loadOrCreateDigitalaxMarketplaceV3PurchaseHistory(
    event.params.bundleTokenId.toString()
  );
  history.discountToPayERC20 = event.params.discountToPayInERC20;
  history.paymentToken = event.params.paymentToken;
  history.platformFee = event.params.platformFee;
  history.save();
}

export function handleOfferCancelled(event: OfferCancelled): void {
  let offer = DigitalaxCC0MarketplaceOffer.load(
    event.params.bundleTokenId.toString()
  );
  if (offer) {
    offer.primarySalePrice = ZERO;
    offer.garmentCollection = '';
    offer.save();
  }
}
