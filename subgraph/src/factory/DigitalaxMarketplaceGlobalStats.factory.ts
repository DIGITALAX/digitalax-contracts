import {DigitalaxMarketplaceGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";
import {glob} from "@nomiclabs/buidler/internal/util/glob";

export function loadOrCreateMarketplaceGlobalStats(): DigitalaxMarketplaceGlobalStat {
    let globalStats = DigitalaxMarketplaceGlobalStat.load('0');

    if (globalStats == null) {
        globalStats = new DigitalaxMarketplaceGlobalStat('0');
        globalStats.totalETHSalesValue = ZERO;
        globalStats.totalMonaSalesValue = ZERO;
        globalStats.monaDiscount = ZERO;
        globalStats.platformFee = ZERO;
        globalStats.save();
    }
    globalStats.save();

    return globalStats as DigitalaxMarketplaceGlobalStat;
}
