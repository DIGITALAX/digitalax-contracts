import { log, ipfs, JSONValue, Value } from "@graphprotocol/graph-ts/index";
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
    for(let i = 0; i < collectionData.value1.toI32(); i++) {
        let garmentToken = DigitalaxGarment.load(collectionData.value0[i].toString());
        mintedGarments.push(garmentToken.id);
    }
    collection.garments = mintedGarments;
    collection.garmentAuctionId = 1 // This is 721 auction nft tokenid- needs to be connected to ipfs, or we need to modify MintGarmentCollection event, or we need to change subgraph
    collection.rarity = "Common"; // This needs to be connected to ipfs, or we need to modify MintGarmentCollection event, or we need to change the subgraph
    collection.save();
}


export function handleGarmentCollectionBurned(event: BurnGarmentCollection): void {
    let collection = DigitalaxGarmentCollection.load(event.params.collectionId.toString());
    collection.garments = null;
    collection.garmentAuctionId = null;
    collection.rarity = null;
    collection.save();
}