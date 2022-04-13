import { DigitalaxModelMarketplaceV3PurchaseHistory } from "../../generated/schema";
import { Address, Bytes } from "@graphprotocol/graph-ts/index";
import { ZERO, ZERO_ADDRESS } from "../constants";

export function loadOrCreateDigitalaxModelMarketplaceV3PurchaseHistory(
  bundleId: string
): DigitalaxModelMarketplaceV3PurchaseHistory {
  let purchaseHistory: DigitalaxModelMarketplaceV3PurchaseHistory | null = DigitalaxModelMarketplaceV3PurchaseHistory.load(
    bundleId
  );
  if (purchaseHistory == null) {
    purchaseHistory = new DigitalaxModelMarketplaceV3PurchaseHistory(bundleId);
    purchaseHistory.eventName = "";
    purchaseHistory.timestamp = ZERO;
    purchaseHistory.transactionHash = ZERO_ADDRESS;
    purchaseHistory.token = "";
    purchaseHistory.value = ZERO;
    purchaseHistory.orderId = ZERO;
    purchaseHistory.buyer = ZERO_ADDRESS;
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
  return purchaseHistory as DigitalaxModelMarketplaceV3PurchaseHistory;
}
