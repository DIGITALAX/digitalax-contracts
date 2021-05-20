import {DigitalaxSubscriptionCollector} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxSubscriptionCollector(collector: Address): DigitalaxSubscriptionCollector {
    let digitalaxCollector: DigitalaxSubscriptionCollector | null = DigitalaxSubscriptionCollector.load(collector.toHexString());
    if (digitalaxCollector == null) {
        digitalaxCollector = new DigitalaxSubscriptionCollector(collector.toHexString())
        digitalaxCollector.parentsOwned = new Array<string>();
        digitalaxCollector.childrenOwned = new Array<string>();
    }
    digitalaxCollector.save()
    return digitalaxCollector as DigitalaxSubscriptionCollector;
}
