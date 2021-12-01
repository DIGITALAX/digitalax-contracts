import {DigitalaxGenesisV2Collector} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxGenesisV2Collector(collector: Address): DigitalaxGenesisV2Collector {
    let digitalaxGenesisV2Collector: DigitalaxGenesisV2Collector | null = DigitalaxGenesisV2Collector.load(collector.toHexString());
    if (digitalaxGenesisV2Collector == null) {
        digitalaxGenesisV2Collector = new DigitalaxGenesisV2Collector(collector.toHexString())
        digitalaxGenesisV2Collector.parentsOwned = new Array<string>();
    }
    digitalaxGenesisV2Collector.save()
    return digitalaxGenesisV2Collector as DigitalaxGenesisV2Collector;
}
