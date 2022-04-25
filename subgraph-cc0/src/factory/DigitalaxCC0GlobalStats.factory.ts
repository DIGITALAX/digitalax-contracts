import { DigitalaxCC0GlobalStat } from "../../generated/schema";
import { ZERO } from "../constants";

export function loadOrCreateCC0GlobalStats(): DigitalaxCC0GlobalStat | null {
  let globalStats = DigitalaxCC0GlobalStat.load("1");

  if (globalStats == null) {
    globalStats = new DigitalaxCC0GlobalStat("1");
    globalStats.totalSalesValue = ZERO;
    globalStats.totalActiveBidsValue = ZERO;
    globalStats.totalMarketplaceSalesInETH = ZERO;
    globalStats.totalMarketplaceSalesInMona = ZERO;
    globalStats.monaPerEth = ZERO;
    globalStats.save();
  }

  return globalStats;
}
