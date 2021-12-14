import { BigInt } from "@graphprotocol/graph-ts";
import { W3FStakingMarketplaceRevenue } from "../../generated/schema";
import { ZERO } from "../constants";

export function loadOrCreateDigitalaxMarketplaceRevenue(): W3FStakingMarketplaceRevenue | null {
  let marketplaceRevenue = W3FStakingMarketplaceRevenue.load('1');

  if (!marketplaceRevenue) {
    marketplaceRevenue = new W3FStakingMarketplaceRevenue('1');
    marketplaceRevenue.week = ZERO;
    marketplaceRevenue.totalW3FSharing = ZERO;
    marketplaceRevenue.weeklyW3FSharing = ZERO;
    marketplaceRevenue.bonusWeeklyW3FSharing = ZERO;
    marketplaceRevenue.totalBonusW3FSharing = ZERO;
    marketplaceRevenue.save();
  }

  return marketplaceRevenue;
}
