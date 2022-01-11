import { BigInt, Address } from '@graphprotocol/graph-ts';
import {
  DepositRevenueSharing,
  WithdrawRevenueSharing,
} from '../generated/DigitalaxRewardsV2/DigitalaxRewardsV2';
import { ZERO } from './constants';
import { loadOrCreateDigitalaxW3fMarketplaceRevenue } from './factory/DigitalaxMarketplaceW3fRevenue.factory';

const w3fTokenAddress: string = '0x54cff88bb36fff8d16a2400c0a78ab37c14db4c6';

export function handleDepositRevenueSharing(
  event: DepositRevenueSharing
): void {
  let marketplaceRevenue = loadOrCreateDigitalaxW3fMarketplaceRevenue();

  if (marketplaceRevenue.week != event.params.week) {
    marketplaceRevenue.week = event.params.week;
    marketplaceRevenue.weeklyW3FSharing = ZERO;
  }

  let w3fTokenIndex = event.params.rewardTokens.findIndex((value) =>
    value.equals(Address.fromHexString(w3fTokenAddress))
  );
  if (w3fTokenIndex == -1) return;

  let rewardAmounts = event.params.rewardAmounts;

  let w3fTokenReward = rewardAmounts[w3fTokenIndex];

  marketplaceRevenue.weeklyW3FSharing = w3fTokenReward;
  marketplaceRevenue.totalW3FSharing = marketplaceRevenue.totalW3FSharing.plus(
    w3fTokenReward
  );

  marketplaceRevenue.save();
}

export function handleWithdrawRevenueSharing(
  event: WithdrawRevenueSharing
): void {
  let marketplaceRevenue = loadOrCreateDigitalaxW3fMarketplaceRevenue();

  if (marketplaceRevenue.week != event.params.week) {
    marketplaceRevenue.week = event.params.week;
    marketplaceRevenue.weeklyW3FSharing = ZERO;
  }

  let w3fTokenIndex = event.params.rewardTokens.findIndex((value) =>
    value.equals(Address.fromHexString(w3fTokenAddress))
  );
  if (w3fTokenIndex == -1) return;

  let rewardAmounts = event.params.rewardTokenAmounts;

  let w3fTokenReward = rewardAmounts[w3fTokenIndex];

  marketplaceRevenue.weeklyW3FSharing = w3fTokenReward;
  marketplaceRevenue.totalW3FSharing = marketplaceRevenue.totalW3FSharing.minus(
    w3fTokenReward
  );
  marketplaceRevenue.save();
}
