import {DigitalaxCollector} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrDigitalaxCollector(collector: Address): DigitalaxCollector {
    let digitalaxCollector: DigitalaxCollector | null = DigitalaxCollector.load(collector.toHexString());
    if (digitalaxCollector == null) {
        digitalaxCollector = new DigitalaxCollector(collector.toHexString())
        digitalaxCollector.garmentsOwned = new Array<string>();
        digitalaxCollector.strandsOwned = new Array<string>();
    }
    digitalaxCollector.save()
    return digitalaxCollector as DigitalaxCollector;
}
