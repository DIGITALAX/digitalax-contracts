import { BigInt, Address } from '@graphprotocol/graph-ts';
import {
  DepositRevenueSharing,
  WithdrawRevenueSharing,
} from '../generated/DigitalaxMonaRewards/DigitalaxMonaRewards';
import { ZERO } from './constants';
import { loadOrCreateDigitalaxMarketplaceRevenue } from './factory/DigitalaxMarketplaceRevenue.factory';

const monaTokenAddress: string = '0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5';

export function handleDepositRevenueSharing(
  event: DepositRevenueSharing
): void {
  let marketplaceRevenue = loadOrCreateDigitalaxMarketplaceRevenue();
  if(marketplaceRevenue) {
    let week = BigInt.fromI32(604800);
    if (marketplaceRevenue.week != event.params.week) {
      marketplaceRevenue.week = event.params.week;
    }

    let monaTokenIndex = event.params.rewardTokens.findIndex((value) =>
        value.equals(Address.fromHexString(monaTokenAddress))
    );
    if (monaTokenIndex == -1) return;

    let rewardAmounts = event.params.rewardAmounts;

    let monaTokenReward = rewardAmounts[monaTokenIndex];

    marketplaceRevenue.weeklyMonaSharing = marketplaceRevenue.weeklyMonaSharing.plus(
        event.params.weeklyMonaRevenueSharingPerSecond.times(week)
    );
    marketplaceRevenue.totalMonaSharing = marketplaceRevenue.totalMonaSharing.plus(
        monaTokenReward
    );

    marketplaceRevenue.save();
  }
}

export function handleWithdrawRevenueSharing(
  event: WithdrawRevenueSharing
): void {
  let marketplaceRevenue = loadOrCreateDigitalaxMarketplaceRevenue();
  if(marketplaceRevenue) {
    if (marketplaceRevenue.week != event.params.week) {
      marketplaceRevenue.week = event.params.week;
      marketplaceRevenue.weeklyMonaSharing = ZERO;
    }

    let monaTokenIndex = event.params.rewardTokens.findIndex((value) =>
        value.equals(Address.fromHexString(monaTokenAddress))
    );
    if (monaTokenIndex == -1) return;

    let rewardTokenAmounts = event.params.rewardTokenAmounts;

    let monaTokenReward = rewardTokenAmounts[monaTokenIndex];

    marketplaceRevenue.weeklyMonaSharing = marketplaceRevenue.weeklyMonaSharing.plus(
        event.params.amount
    );
    marketplaceRevenue.totalMonaSharing = marketplaceRevenue.totalMonaSharing.minus(
        monaTokenReward
    );

    marketplaceRevenue.save();
  }
}
