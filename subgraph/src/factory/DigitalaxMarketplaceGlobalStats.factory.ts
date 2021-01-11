import {DigitalaxMarketplaceGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";
import {glob} from "@nomiclabs/buidler/internal/util/glob";

export function loadOrCreateMarketplaceGlobalStats(): DigitalaxMarketplaceGlobalStat | null {
    let globalStats = DigitalaxMarketplaceGlobalStat.load('DigitalaxGarmentNFTGlobalStats');

    if (globalStats == null) {
        globalStats = new DigitalaxMarketplaceGlobalStat('DigitalaxMarkeplaceGlobalStats');
        globalStats.totalETHSalesValue = ZERO;
        globalStats.totalMonaSalesValue = ZERO;
        globalStats.monaDiscount = ZERO;
        globalStats.platformFee = ZERO;
        globalStats.save();
    }

    return globalStats;
}
