import {DigitalaxGarmentNFTGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateGarmentNFTGlobalStats(): DigitalaxGarmentNFTGlobalStat | null {
    let globalStats = DigitalaxGarmentNFTGlobalStat.load('1');

    if (globalStats == null) {
        globalStats = new DigitalaxGarmentNFTGlobalStat('1');
        globalStats.totalSalesValue = ZERO;
        globalStats.totalActiveBidsValue = ZERO;
        globalStats.totalMarketplaceSalesInETH = ZERO;
        globalStats.totalMarketplaceSalesInMona = ZERO;
        globalStats.marketplacePlatformFee = ZERO;
        globalStats.save();
    }

    return globalStats;
}
