import { DigitalaxModelNFTDesigner } from "../../generated/schema";
import { log } from "@graphprotocol/graph-ts/index";

export function loadOrCreateModelNFTDesigner(
  tokenId: string
): DigitalaxModelNFTDesigner {
  // TODO: We need to re-architecture the current models.
  // We are mapping designer ids in force way now.
  let garmentDesignerId = tokenId;
  let garmentDesigner = DigitalaxModelNFTDesigner.load(garmentDesignerId);
  if (garmentDesigner == null) {
    garmentDesigner = new DigitalaxModelNFTDesigner(garmentDesignerId);
    garmentDesigner.garments = new Array<string>();
  }
  garmentDesigner.save();
  return garmentDesigner as DigitalaxModelNFTDesigner;
}
