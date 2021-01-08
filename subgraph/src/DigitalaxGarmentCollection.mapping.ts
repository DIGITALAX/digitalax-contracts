import {
    MintGarmentCollection,
    BurnGarmentCollection,
    DigitalaxGarmentCollection as DigitalaxGarmentCollectionContract
} from "../generated/DigitalaxGarmentCollection/DigitalaxGarmentCollection";

import {
    DigitalaxGarmentCollection,
    DigitalaxGarment,
} from "../generated/schema";
import {loadOrCreateGarmentDesigner} from "./factory/DigitalaxGarmentDesigner.factory";

export function handleGarmentCollectionMinted(event: MintGarmentCollection): void {
    let contract = DigitalaxGarmentCollectionContract.bind(event.address);
    let collectionData = contract.getCollection(event.params.collectionId);
    let collection = new DigitalaxGarmentCollection(event.params.collectionId.toString());

    let mintedGarments = new Array<string>();
    for(let i = 0; i < collectionData.value1.toI32(); i++) {
        let garmentToken = DigitalaxGarment.load(collectionData.value0[i].toString());
        mintedGarments.push(garmentToken.id);
        
        let garmentDesigner = loadOrCreateGarmentDesigner(garmentToken.id);
        collection.designer = garmentDesigner.id;
    }
    collection.garments = mintedGarments;
    collection.tokenUri = collectionData.value2;
    collection.save();
}

export function handleGarmentCollectionBurned(event: BurnGarmentCollection): void {
    let collection = DigitalaxGarmentCollection.load(event.params.collectionId.toString());
    collection.garments = null;
    collection.tokenUri = null;
    collection.designer = null;
    collection.save();
}