import {DigitalaxF3MGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateF3MGlobalStats(): DigitalaxF3MGlobalStat | null {
    let globalStats = DigitalaxF3MGlobalStat.load('1');

    if (globalStats == null) {
        globalStats = new DigitalaxF3MGlobalStat('1');
        globalStats.totalSalesValue = ZERO;
        globalStats.totalActiveBidsValue = ZERO;
        globalStats.totalMarketplaceSalesInETH = ZERO;
        globalStats.totalMarketplaceSalesInMona = ZERO;
        globalStats.monaPerEth = ZERO;
        globalStats.save();
    }

    return globalStats;
}
