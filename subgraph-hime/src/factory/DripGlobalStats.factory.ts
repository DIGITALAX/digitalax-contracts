import {DripGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateDripGlobalStats(): DripGlobalStat | null {
    let globalStats = DripGlobalStat.load('1');

    if (globalStats == null) {
        globalStats = new DripGlobalStat('1');
        globalStats.totalMarketplaceSalesInUSD = ZERO;
        globalStats.usdETHConversion = ZERO;
        globalStats.save();
    }

    return globalStats;
}
