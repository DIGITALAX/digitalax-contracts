import { DigitalaxModelCollector } from "../../generated/schema";
import { Address } from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxModelCollector(
  collector: Address
): DigitalaxModelCollector {
  let digitalaxCollector: DigitalaxModelCollector | null = DigitalaxModelCollector.load(
    collector.toHexString()
  );
  if (digitalaxCollector == null) {
    digitalaxCollector = new DigitalaxModelCollector(collector.toHexString());
    digitalaxCollector.parentsOwned = new Array<string>();
    digitalaxCollector.childrenOwned = new Array<string>();
  }
  digitalaxCollector.save();
  return digitalaxCollector as DigitalaxModelCollector;
}
