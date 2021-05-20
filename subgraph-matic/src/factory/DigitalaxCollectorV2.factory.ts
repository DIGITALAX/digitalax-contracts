import {DigitalaxCollectorV2} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxCollectorV2(collector: Address): DigitalaxCollectorV2 {
    let digitalaxCollector: DigitalaxCollectorV2 | null = DigitalaxCollectorV2.load(collector.toHexString());
    if (digitalaxCollector == null) {
        digitalaxCollector = new DigitalaxCollectorV2(collector.toHexString())
        digitalaxCollector.parentsOwned = new Array<string>();
        digitalaxCollector.childrenOwned = new Array<string>();
    }
    digitalaxCollector.save()
    return digitalaxCollector as DigitalaxCollectorV2;
}
