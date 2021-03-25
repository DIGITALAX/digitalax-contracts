import {DigitalaxGarmentDesigner} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";

export function loadOrCreateGarmentDesigner(tokenId: string): DigitalaxGarmentDesigner {
    // TODO: We need to re-architecture the current models.
    // We are mapping designer ids in force way now.
    let garmentDesignerId = tokenId;
    let garmentDesigner = DigitalaxGarmentDesigner.load(garmentDesignerId);
    if (garmentDesigner == null) {
        garmentDesigner = new DigitalaxGarmentDesigner(garmentDesignerId);
        garmentDesigner.garments = new Array<string>();
        garmentDesigner.listings = new Array<string>();
    }
    garmentDesigner.save()
    return garmentDesigner as DigitalaxGarmentDesigner
}
