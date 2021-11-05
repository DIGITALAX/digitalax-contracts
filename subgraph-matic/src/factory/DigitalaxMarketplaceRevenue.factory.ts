import { BigInt } from "@graphprotocol/graph-ts";
import { DigitalaxMonaMarketplaceRevenue } from "../../generated/schema";
import { ZERO } from "../constants";

export function loadOrCreateDigitalaxMarketplaceRevenue(): DigitalaxMonaMarketplaceRevenue | null {
  let marketplaceRevenue = DigitalaxMonaMarketplaceRevenue.load('1');

  if (!marketplaceRevenue) {
    marketplaceRevenue = new DigitalaxMonaMarketplaceRevenue('1');
    marketplaceRevenue.week = ZERO;
    marketplaceRevenue.totalMonaSharing = ZERO;
    marketplaceRevenue.weeklyMonaSharing = ZERO;
    marketplaceRevenue.bonusWeeklyMonaSharing = ZERO;
    marketplaceRevenue.totalBonusMonaSharing = ZERO;
    marketplaceRevenue.save();
  }

  return marketplaceRevenue;
}