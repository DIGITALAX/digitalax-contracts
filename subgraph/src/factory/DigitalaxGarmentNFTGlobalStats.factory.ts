import {DigitalaxGarmentNFTGlobalStats} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateGarmentNFTGlobalStats(): DigitalaxGarmentNFTGlobalStats | null {
    let globalStats = DigitalaxGarmentNFTGlobalStats.load('DigitalaxGarmentNFTGlobalStats');

    if (globalStats == null) {
        globalStats = new DigitalaxGarmentNFTGlobalStats('DigitalaxGarmentNFTGlobalStats');
        globalStats.totalSalesValue = ZERO;
        globalStats.totalActiveBidsValue = ZERO;
        globalStats.save();
    }

    return globalStats;
}
