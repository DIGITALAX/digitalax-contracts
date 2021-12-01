import {PatronGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreatePatronGlobalStats(): PatronGlobalStat | null {
    let globalStats = PatronGlobalStat.load('1');

    if (globalStats == null) {
        globalStats = new PatronGlobalStat('1');
        globalStats.totalMarketplaceSalesInUSD = ZERO;
        globalStats.usdETHConversion = ZERO;
        globalStats.save();
    }

    return globalStats;
}
