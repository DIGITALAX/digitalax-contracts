import { DigitalaxHimeDesigner } from "../../generated/schema";
import { log } from "@graphprotocol/graph-ts/index";

export function loadOrCreateHimeDesigner(tokenId: string): DigitalaxHimeDesigner {
  // TODO: We need to re-architecture the current models.
  // We are mapping designer ids in force way now.
  let garmentDesignerId = tokenId;
  let garmentDesigner = DigitalaxHimeDesigner.load(garmentDesignerId);
  if (garmentDesigner == null) {
    garmentDesigner = new DigitalaxHimeDesigner(garmentDesignerId);
    garmentDesigner.garments = new Array<string>();
  }
  garmentDesigner.save();
  return garmentDesigner as DigitalaxHimeDesigner;
}
