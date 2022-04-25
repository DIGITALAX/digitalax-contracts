import { DigitalaxCC0Resident } from "../../generated/schema";
import { log } from "@graphprotocol/graph-ts/index";

export function loadOrCreateCC0Resident(tokenId: string): DigitalaxCC0Resident {
  // TODO: We need to re-architecture the current models.
  // We are mapping designer ids in force way now.
  let garmentResidentId = tokenId;
  let garmentResident = DigitalaxCC0Resident.load(garmentResidentId);
  if (garmentResident == null) {
    garmentResident = new DigitalaxCC0Resident(garmentResidentId);
    garmentResident.garments = new Array<string>();
  }
  garmentResident.save();
  return garmentResident as DigitalaxCC0Resident;
}
