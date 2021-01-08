import {DigitalaxMarketplaceGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateMarketplaceGlobalStats(): DigitalaxMarketplaceGlobalStat | null {
    let globalStats = DigitalaxMarketplaceGlobalStat.load('DigitalaxGarmentNFTGlobalStats');

    if (globalStats == null) {
        globalStats = new DigitalaxMarketplaceGlobalStat('DigitalaxMarkeplaceGlobalStats');
        globalStats.totalETHSalesValue = ZERO;
        globalStats.totalMonaSalesValue = ZERO;
        globalStats.save();
    }

    return globalStats;
}
