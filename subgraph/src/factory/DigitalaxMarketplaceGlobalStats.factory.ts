import {DigitalaxMarketplaceGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateMarketplaceGlobalStats(): DigitalaxMarketplaceGlobalStat {
    let globalStats = DigitalaxMarketplaceGlobalStat.load('0');

    if (globalStats == null) {
        globalStats = new DigitalaxMarketplaceGlobalStat('0');
        globalStats.totalETHSalesValue = ZERO;
        globalStats.totalMonaSalesValue = ZERO;
    }
    globalStats.save();

    return globalStats as DigitalaxMarketplaceGlobalStat;
}
