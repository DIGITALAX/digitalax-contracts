import { DigitalaxDesigner } from "../../generated/schema";
import { Address } from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxDesigner(
  address: Address
): DigitalaxDesigner {
  let digitalaxDesigner: DigitalaxDesigner | null = DigitalaxDesigner.load(
    address.toHexString()
  );
  if (digitalaxDesigner == null) {
    digitalaxDesigner = new DigitalaxDesigner(address.toHexString());
    digitalaxDesigner.name = "";
    digitalaxDesigner.description = "";
    digitalaxDesigner.image = "";
    // DigitalaxDesigner.auctions = new Array<string>();
    digitalaxDesigner.collections = new Array<string>();
  }
  digitalaxDesigner.save();
  return digitalaxDesigner as DigitalaxDesigner;
}
