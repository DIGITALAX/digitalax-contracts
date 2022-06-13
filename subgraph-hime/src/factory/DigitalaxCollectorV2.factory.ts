import { DigitalaxHimeCollector } from "../../generated/schema";
import { Address } from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxHimeCollector(
  collector: Address
): DigitalaxHimeCollector {
  let digitalaxCollector: DigitalaxHimeCollector | null =
    DigitalaxHimeCollector.load(collector.toHexString());
  if (digitalaxCollector == null) {
    digitalaxCollector = new DigitalaxHimeCollector(collector.toHexString());
    digitalaxCollector.parentsOwned = new Array<string>();
    digitalaxCollector.childrenOwned = new Array<string>();
  }
  digitalaxCollector.save();
  return digitalaxCollector as DigitalaxHimeCollector;
}
