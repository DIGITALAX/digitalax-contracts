import {DigitalaxF3MDesigner} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";

export function loadOrCreateF3MDesigner(tokenId: string): DigitalaxF3MDesigner {
    // TODO: We need to re-architecture the current models.
    // We are mapping designer ids in force way now.
    let garmentDesignerId = tokenId;
    let garmentDesigner = DigitalaxF3MDesigner.load(garmentDesignerId);
    if (garmentDesigner == null) {
        garmentDesigner = new DigitalaxF3MDesigner(garmentDesignerId);
        garmentDesigner.garments = new Array<string>();
    }
    garmentDesigner.save()
    return garmentDesigner as DigitalaxF3MDesigner
}
