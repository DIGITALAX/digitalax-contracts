import { DigitalaxHimeGlobalStat } from "../../generated/schema";
import { ZERO } from "../constants";

export function loadOrCreateHimeGlobalStats(): DigitalaxHimeGlobalStat | null {
  let globalStats = DigitalaxHimeGlobalStat.load("1");

  if (globalStats == null) {
    globalStats = new DigitalaxHimeGlobalStat("1");
    globalStats.totalSalesValue = ZERO;
    globalStats.totalActiveBidsValue = ZERO;
    globalStats.totalMarketplaceSalesInETH = ZERO;
    globalStats.totalMarketplaceSalesInMona = ZERO;
    globalStats.monaPerEth = ZERO;
    globalStats.save();
  }

  return globalStats;
}
