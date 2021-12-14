import { BigInt } from "@graphprotocol/graph-ts";
import {
  DepositRevenueSharing,
  WithdrawRevenueSharing,
} from "../generated/DigitalaxRewardsV2/DigitalaxRewardsV2";
import { ZERO } from "./constants";
import { loadOrCreateDigitalaxMarketplaceRevenue } from "./factory/DigitalaxMarketplaceRevenue.factory";

export function handleDepositRevenueSharing(
  event: DepositRevenueSharing
): void {
  let marketplaceRevenue = loadOrCreateDigitalaxMarketplaceRevenue();
  let weekSeconds = BigInt.fromI32(604800);

  if (marketplaceRevenue.week != event.params.week) {
    marketplaceRevenue.week = event.params.week;
    marketplaceRevenue.weeklyMonaSharing = ZERO;
    marketplaceRevenue.bonusWeeklyMonaSharing = ZERO;
  }

  marketplaceRevenue.weeklyMonaSharing = marketplaceRevenue.weeklyMonaSharing.plus(
    event.params.weeklyMonaRevenueSharingPerSecond.times(weekSeconds)
  );
  marketplaceRevenue.totalMonaSharing = marketplaceRevenue.totalMonaSharing.plus(
    event.params.weeklyMonaRevenueSharingPerSecond.times(weekSeconds)
  );
  marketplaceRevenue.bonusWeeklyMonaSharing = marketplaceRevenue.bonusWeeklyMonaSharing.plus(
    event.params.bonusWeeklyMonaRevenueSharingPerSecond.times(weekSeconds)
  );
  marketplaceRevenue.totalBonusMonaSharing = marketplaceRevenue.totalBonusMonaSharing.plus(
    event.params.bonusWeeklyMonaRevenueSharingPerSecond.times(weekSeconds)
  );

  marketplaceRevenue.save();
}

export function handleWithdrawRevenueSharing(
  event: WithdrawRevenueSharing
): void {
  let marketplaceRevenue = loadOrCreateDigitalaxMarketplaceRevenue();
  let weekSeconds = BigInt.fromI32(604800);

  if (marketplaceRevenue.week != event.params.week) {
    marketplaceRevenue.week = event.params.week;
    marketplaceRevenue.weeklyMonaSharing = ZERO;
    marketplaceRevenue.bonusWeeklyMonaSharing = ZERO;
  }

  marketplaceRevenue.weeklyMonaSharing = marketplaceRevenue.weeklyMonaSharing.minus(
    event.params.amount.times(weekSeconds)
  );
  marketplaceRevenue.totalMonaSharing = marketplaceRevenue.totalMonaSharing.minus(
    event.params.amount.times(weekSeconds)
  );
  marketplaceRevenue.bonusWeeklyMonaSharing = marketplaceRevenue.bonusWeeklyMonaSharing.minus(
    event.params.bonusAmount.times(weekSeconds)
  );
  marketplaceRevenue.totalBonusMonaSharing = marketplaceRevenue.totalBonusMonaSharing.minus(
    event.params.bonusAmount.times(weekSeconds)
  );

  marketplaceRevenue.save();
}
