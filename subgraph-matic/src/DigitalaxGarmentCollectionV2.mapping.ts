import { log, ipfs, JSONValue, Value } from "@graphprotocol/graph-ts/index";
import {
    MintGarmentCollection,
    BurnGarmentCollection,
    DigitalaxGarmentCollectionV2 as DigitalaxGarmentCollectionV2Contract
} from "../generated/DigitalaxGarmentCollectionV2/DigitalaxGarmentCollectionV2";

import {
    DigitalaxGarmentV2Collection,
    DigitalaxGarmentV2,
} from "../generated/schema";
import {ZERO} from "./constants";

export function handleGarmentCollectionMinted(event: MintGarmentCollection): void {
    let contract = DigitalaxGarmentCollectionV2Contract.bind(event.address);
    let collectionData = contract.getCollection(event.params.collectionId);
    let collection = new DigitalaxGarmentV2Collection(event.params.collectionId.toString());

    let mintedGarments = new Array<string>();
    for(let i = 0; i < collectionData.value1.toI32(); i++) {
        let garmentToken = DigitalaxGarmentV2.load(collectionData.value0[i].toString());
        mintedGarments.push(garmentToken.id);
    }
    collection.garments = mintedGarments;
    collection.garmentAuctionID = event.params.auctionTokenId;
    collection.rarity = event.params.rarity;
    collection.valueSold = ZERO;
    collection.save();
}


export function handleGarmentCollectionBurned(event: BurnGarmentCollection): void {
    let collection = DigitalaxGarmentV2Collection.load(event.params.collectionId.toString());
    collection.garments = null;
    collection.garmentAuctionID = null;
    collection.rarity = null;
    collection.save();
}
