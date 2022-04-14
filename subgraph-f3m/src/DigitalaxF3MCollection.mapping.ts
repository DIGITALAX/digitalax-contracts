import {
  log,
  ipfs,
  JSONValue,
  Value,
  store,
} from "@graphprotocol/graph-ts/index";
import {
  MintGarmentCollection,
  BurnGarmentCollection,
  DigitalaxF3MCollection as DigitalaxF3MCollectionContract,
} from "../generated/DigitalaxF3MCollection/DigitalaxF3MCollection";

import {
  DigitalaxF3MNFTCollection,
  DigitalaxF3MNFT,
} from "../generated/schema";
import { ZERO } from "./constants";

export function handleGarmentCollectionMinted(
  event: MintGarmentCollection
): void {
  let contract = DigitalaxF3MCollectionContract.bind(event.address);
  let collectionData = contract.getCollection(event.params.collectionId);
  let collection = DigitalaxF3MNFTCollection.load(
    event.params.collectionId.toString()
  );
  if (!collection) {
    collection = new DigitalaxF3MNFTCollection(
      event.params.collectionId.toString()
    );
    collection.rarity = event.params.rarity;
    collection.valueSold = ZERO;
    let mintedGarments = new Array<string>();
    if (collectionData) {
      for (let i = 0; i < collectionData.value1.toI32(); i++) {
        if (collectionData.value0) {
          if (collectionData.value0[i]) {
            let garmentToken = DigitalaxF3MNFT.load(
              collectionData.value0[i].toString()
            );
            if (garmentToken) {
              mintedGarments.push(garmentToken.id);
            }
          }
        }
      }
    }
    collection.garments = mintedGarments;
  } else {
    // This is the case for "mint more nfts on collection"
    let updatedGarments = collection.garments;
    if (collectionData) {
      for (let i = 0; i < collectionData.value1.toI32(); i++) {
        if (collectionData.value0) {
          if (collectionData.value0[i]) {
            let garmentToken = DigitalaxF3MNFT.load(
              collectionData.value0[i].toString()
            );
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

export function handleGarmentCollectionBurned(
  event: BurnGarmentCollection
): void {
  let collection = DigitalaxF3MNFTCollection.load(
    event.params.collectionId.toString()
  );
  if (!collection) {
    store.remove(
      "DigitalaxF3MNFTCollection",
      event.params.collectionId.toString()
    );
  }
}
