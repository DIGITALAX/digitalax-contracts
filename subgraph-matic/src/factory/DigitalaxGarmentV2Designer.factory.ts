import {DigitalaxGarmentV2Designer} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";

export function loadOrCreateGarmentV2Designer(tokenId: string): DigitalaxGarmentV2Designer {
    // TODO: We need to re-architecture the current models.
    // We are mapping designer ids in force way now.
    let garmentDesignerId = tokenId;
    let garmentDesigner = DigitalaxGarmentV2Designer.load(garmentDesignerId);
    if (garmentDesigner == null) {
        garmentDesigner = new DigitalaxGarmentV2Designer(garmentDesignerId);
        garmentDesigner.garments = new Array<string>();
        garmentDesigner.listings = new Array<string>();
    }
    garmentDesigner.save()
    return garmentDesigner as DigitalaxGarmentV2Designer
}
