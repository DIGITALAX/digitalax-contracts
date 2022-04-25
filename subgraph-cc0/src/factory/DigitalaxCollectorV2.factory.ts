import { DigitalaxCC0Collector } from "../../generated/schema";
import { Address } from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxCC0Collector(
  collector: Address
): DigitalaxCC0Collector {
  let digitalaxCollector: DigitalaxCC0Collector | null =
    DigitalaxCC0Collector.load(collector.toHexString());
  if (digitalaxCollector == null) {
    digitalaxCollector = new DigitalaxCC0Collector(collector.toHexString());
    digitalaxCollector.parentsOwned = new Array<string>();
    digitalaxCollector.childrenOwned = new Array<string>();
  }
  digitalaxCollector.save();
  return digitalaxCollector as DigitalaxCC0Collector;
}
