import { log, ipfs, JSONValue, Value } from "@graphprotocol/graph-ts/index";
import {
    MintSubscriptionCollection,
    BurnSubscriptionCollection,
    DigitalaxSubscriptionCollection as DigitalaxSubscriptionCollectionContract
} from "../generated/DigitalaxSubscriptionCollection/DigitalaxSubscriptionCollection";

import {
    DigitalaxSubscriptionCollection,
    DigitalaxSubscription,
} from "../generated/schema";

export function handleSubscriptionCollectionMinted(event: MintSubscriptionCollection): void {
    let contract = DigitalaxSubscriptionCollectionContract.bind(event.address);
    let collectionData = contract.getCollection(event.params.collectionId);
    let collection = new DigitalaxSubscriptionCollection(event.params.collectionId.toString());

    let mintedGarments = new Array<string>();
    for(let i = 0; i < collectionData.value1.toI32(); i++) {
        let garmentToken = DigitalaxSubscription.load(collectionData.value0[i].toString());
        mintedGarments.push(garmentToken.id);
    }
    collection.garments = mintedGarments;
    collection.rarity = event.params.rarity;
    collection.save();
}


export function handleSubscriptionCollectionBurned(event: BurnSubscriptionCollection): void {
    let collection = DigitalaxSubscriptionCollection.load(event.params.collectionId.toString());
    collection.garments = null;
    collection.rarity = null;
    collection.save();
}
