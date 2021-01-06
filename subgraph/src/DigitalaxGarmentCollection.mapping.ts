import {log, BigInt, Address, store} from "@graphprotocol/graph-ts/index";

import {
    MintGarmentCollection,
    BurnGarmentCollection,
    DigitalaxGarmentCollection as DigitalaxGarmentCollectionContract
} from "../generated/DigitalaxGarmentCollection/DigitalaxGarmentCollection";

import {
    DigitalaxGarmentCollection,
    DigitalaxGarment,
} from "../generated/schema";

export function handleGarmentCollectionMinted(event: MintGarmentCollection): void {
    let contract = DigitalaxGarmentCollectionContract.bind(event.address);
    let collectionData = contract.getCollection(event.params.collectionId);
    let collection = new DigitalaxGarmentCollection(event.params.collectionId.toString());

    let mintedGarments = new Array<string>();
    for(let i = 0; i < collectionData.value1; i++) {
            mintedGarments.push(DigitalaxGarment.load(collectionData.value0[i]));
    }
    collection.garments = mintedGarments;
    collection.tokenUri = collectionData.value2;
    collection.designer = collectionData.value3.toHexString();
    collection.save();
}

export function handleGarmentCollectionBurned(event: BurnGarmentCollection): void {
    let collection = DigitalaxGarmentCollection.load(event.params.collectionId.toString());
    collection.garments = null;
    collection.tokenUri = null;
    collection.designer = null;
    collection.save();
}