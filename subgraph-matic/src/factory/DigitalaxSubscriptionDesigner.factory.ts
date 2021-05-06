import {DigitalaxSubscriptionDesigner} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";

export function loadOrCreateSubscriptionDesigner(tokenId: string): DigitalaxSubscriptionDesigner {
    // TODO: We need to re-architecture the current models.
    // We are mapping designer ids in force way now.
    let garmentDesignerId = tokenId;
    let garmentDesigner = DigitalaxSubscriptionDesigner.load(garmentDesignerId);
    if (garmentDesigner == null) {
        garmentDesigner = new DigitalaxSubscriptionDesigner(garmentDesignerId);
        garmentDesigner.garments = new Array<string>();
        garmentDesigner.listings = new Array<string>();
    }
    garmentDesigner.save()
    return garmentDesigner as DigitalaxSubscriptionDesigner
}
