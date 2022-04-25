import { DigitalaxResident } from "../../generated/schema";
import { Address } from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxResident(
  address: Address
): DigitalaxResident {
  let digitalaxResident: DigitalaxResident | null = DigitalaxResident.load(
    address.toHexString()
  );
  if (digitalaxResident == null) {
    digitalaxResident = new DigitalaxResident(address.toHexString());
    digitalaxResident.name = "";
    digitalaxResident.description = "";
    digitalaxResident.image = "";
    // DigitalaxResident.auctions = new Array<string>();
    digitalaxResident.collections = new Array<string>();
  }
  digitalaxResident.save();
  return digitalaxResident as DigitalaxResident;
}
