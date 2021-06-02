import {DigitalaxGarmentNFTV2GlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateGarmentNFTV2GlobalStats(): DigitalaxGarmentNFTV2GlobalStat | null {
    let globalStats = DigitalaxGarmentNFTV2GlobalStat.load('1');

    if (globalStats == null) {
        globalStats = new DigitalaxGarmentNFTV2GlobalStat('1');
        globalStats.totalSalesValue = ZERO;
        globalStats.totalActiveBidsValue = ZERO;
        globalStats.totalMarketplaceSalesInETH = ZERO;
        globalStats.totalMarketplaceSalesInMona = ZERO;
        globalStats.save();
    }

    return globalStats;
}
