import { DigitalaxMarketplaceV3PurchaseHistory } from "../../generated/schema";
import { Address, Bytes } from "@graphprotocol/graph-ts/index";
import { ZERO, ZERO_ADDRESS } from "../constants";

export function loadOrCreateDigitalaxMarketplaceV3PurchaseHistory(
  bundleId: string
): DigitalaxMarketplaceV3PurchaseHistory {
  let purchaseHistory: DigitalaxMarketplaceV3PurchaseHistory | null = DigitalaxMarketplaceV3PurchaseHistory.load(
    bundleId
  );
  if (purchaseHistory == null) {
    purchaseHistory = new DigitalaxMarketplaceV3PurchaseHistory(bundleId);
    purchaseHistory.eventName = "";
    purchaseHistory.timestamp = ZERO;
    purchaseHistory.transactionHash = ZERO_ADDRESS;
    purchaseHistory.token = "";
    purchaseHistory.value = ZERO;
    purchaseHistory.orderId = ZERO;
    purchaseHistory.buyer = ZERO_ADDRESS;
    purchaseHistory.shippingUsd = ZERO;
    purchaseHistory.discountToPayERC20 = ZERO;
    purchaseHistory.paymentTokenTransferredAmount = ZERO;
    purchaseHistory.garmentCollectionId = ZERO;
    purchaseHistory.rarity = "";
    purchaseHistory.usdEthExchange = ZERO;
    purchaseHistory.paymentToken = ZERO_ADDRESS;
    purchaseHistory.platformFee = ZERO;
    purchaseHistory.usdPaymentTokenExchange = ZERO;
  }
  purchaseHistory.save();
  return purchaseHistory as DigitalaxMarketplaceV3PurchaseHistory;
}
