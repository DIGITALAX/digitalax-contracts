import {DigitalaxSubscriptionDesigner} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";

export function loadOrCreateSubscriptionDesigner(tokenId: string): DigitalaxSubscriptionDesigner {
    // TODO: We need to re-architecture the current models.
    // We are mapping designer ids in force way now.
    let subscriptionDesignerId = tokenId;
    let subscriptionDesigner = DigitalaxSubscriptionDesigner.load(subscriptionDesignerId);
    if (subscriptionDesigner == null) {
        subscriptionDesigner = new DigitalaxSubscriptionDesigner(subscriptionDesignerId);
        subscriptionDesigner.garments = new Array<string>();
    }
    subscriptionDesigner.save()
    return subscriptionDesigner as DigitalaxSubscriptionDesigner
}
