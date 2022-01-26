import { DigitalaxModelNFTModel } from "../../generated/schema";
import { log } from "@graphprotocol/graph-ts/index";

export function loadOrCreateModelNFTModel(tokenId: string): DigitalaxModelNFTModel {
  // TODO: We need to re-architecture the current models.
  // We are mapping designer ids in force way now.
  let garmentModelId = tokenId;
  let garmentModel = DigitalaxModelNFTModel.load(garmentModelId);
  if (garmentModel == null) {
    garmentModel = new DigitalaxModelNFTModel(garmentModelId);
    garmentModel.garments = new Array<string>();
  }
  garmentModel.save();
  return garmentModel as DigitalaxModelNFTModel;
}
