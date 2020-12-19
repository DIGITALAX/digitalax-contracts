import {DigitalaxGarmentDesigner} from "../../generated/schema";
import {NFT_DESIGNER_MAP} from "../constants";
import { BigInt } from "@graphprotocol/graph-ts";

export function loadOrCreateGarmentDesigner(tokenId: BigInt): DigitalaxGarmentDesigner {
    let designerId = NFT_DESIGNER_MAP[tokenId.toI32()];
    let garmentDesigner = DigitalaxGarmentDesigner.load(designerId);
    //if (garmentDesigner == null) {
        garmentDesigner = new DigitalaxGarmentDesigner(designerId);
        garmentDesigner.garments = new Array<string>();
        garmentDesigner.listings = new Array<string>();
    //}
    garmentDesigner.save()
    return garmentDesigner as DigitalaxGarmentDesigner
}
