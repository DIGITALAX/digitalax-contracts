import {DigitalaxCollector} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxCollector(collector: Address): DigitalaxCollector {
    let digitalaxCollector: DigitalaxCollector | null = DigitalaxCollector.load(collector.toHexString());
    if (digitalaxCollector == null) {
        digitalaxCollector = new DigitalaxCollector(collector.toHexString())
        digitalaxCollector.parentsOwned = new Array<string>();
        digitalaxCollector.childrenOwned = new Array<string>();
    }
    digitalaxCollector.save()
    return digitalaxCollector as DigitalaxCollector;
}
