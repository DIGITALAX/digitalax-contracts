import { log, ipfs, JSONValue, Value, store } from "@graphprotocol/graph-ts/index";
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
        let collection = DigitalaxGarmentV2Collection.load(event.params.collectionId.toString());
        if (!collection) {
            collection = new DigitalaxGarmentV2Collection(event.params.collectionId.toString());
            collection.garmentAuctionID = event.params.auctionTokenId;
            collection.rarity = event.params.rarity;
            collection.valueSold = ZERO;
            let mintedGarments = new Array<string>();
            if(collectionData) {
                for (let i = 0; i < collectionData.value1.toI32(); i++) {
                    if (collectionData.value0) {
                         if(collectionData.value0[i]) {
                            let garmentToken = DigitalaxGarmentV2.load(collectionData.value0[i].toString());
                            if (garmentToken) {
                                mintedGarments.push(garmentToken!.id);
                            }
                        }
                    }
                }
            }
            collection.garments = mintedGarments;
        } else {
            // This is the case for "mint more nfts on collection"
            let updatedGarments = collection.garments;
            if(collectionData) {
                for (let i = 0; i < collectionData.value1.toI32(); i++) {
                    if (collectionData.value0) {
                        if(collectionData.value0[i]) {
                            let garmentToken = DigitalaxGarmentV2.load(collectionData.value0[i].toString());
                            if (garmentToken) {
                                updatedGarments.push(garmentToken.id);
                            }
                        }
                    }
                }
            }
            collection.garments = updatedGarments;
        }
        collection.save();
}


export function handleGarmentCollectionBurned(event: BurnGarmentCollection): void {
        let collection = DigitalaxGarmentV2Collection.load(event.params.collectionId.toString());
        if (!collection) {
            store.remove("DigitalaxGarmentV2Collection", event.params.collectionId.toString());
        }
}
