import {DigitalaxF3MCollector} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxF3MCollector(collector: Address): DigitalaxF3MCollector {
    let digitalaxCollector: DigitalaxF3MCollector | null = DigitalaxF3MCollector.load(collector.toHexString());
    if (digitalaxCollector == null) {
        digitalaxCollector = new DigitalaxF3MCollector(collector.toHexString())
        digitalaxCollector.parentsOwned = new Array<string>();
        digitalaxCollector.childrenOwned = new Array<string>();
    }
    digitalaxCollector.save()
    return digitalaxCollector as DigitalaxF3MCollector;
}
