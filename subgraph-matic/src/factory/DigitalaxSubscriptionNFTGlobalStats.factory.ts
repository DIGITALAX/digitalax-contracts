import {DigitalaxSubscriptionNFTGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateSubscriptionNFTGlobalStats(): DigitalaxSubscriptionNFTGlobalStat | null {
    let globalStats = DigitalaxSubscriptionNFTGlobalStat.load('1');

    if (globalStats == null) {
        globalStats = new DigitalaxSubscriptionNFTGlobalStat('1');
        globalStats.totalSalesValue = ZERO;
        globalStats.totalMarketplaceSalesInMona = ZERO;
        globalStats.save();
    }

    return globalStats;
}
