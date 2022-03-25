import {DigitalaxModelGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateModelGlobalStats(): DigitalaxModelGlobalStat | null {
    let globalStats = DigitalaxModelGlobalStat.load('1');

    if (globalStats == null) {
        globalStats = new DigitalaxModelGlobalStat('1');
        globalStats.totalSalesValue = ZERO;
        globalStats.totalActiveBidsValue = ZERO;
        globalStats.totalMarketplaceSalesInETH = ZERO;
        globalStats.totalMarketplaceSalesInMona = ZERO;
        globalStats.monaPerEth = ZERO;
        globalStats.save();
    }

    return globalStats;
}
