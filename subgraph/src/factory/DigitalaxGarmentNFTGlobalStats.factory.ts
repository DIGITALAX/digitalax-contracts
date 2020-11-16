import {DigitalaxGarmentNFTGlobalStat} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateGarmentNFTGlobalStats(): DigitalaxGarmentNFTGlobalStat | null {
    let globalStats = DigitalaxGarmentNFTGlobalStat.load('DigitalaxGarmentNFTGlobalStats');

    if (globalStats == null) {
        globalStats = new DigitalaxGarmentNFTGlobalStat('DigitalaxGarmentNFTGlobalStats');
        globalStats.totalSalesValue = ZERO;
        globalStats.totalActiveBidsValue = ZERO;
        globalStats.save();
    }

    return globalStats;
}
