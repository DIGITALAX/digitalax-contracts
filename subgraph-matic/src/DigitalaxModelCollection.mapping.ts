import { log, ipfs, JSONValue, Value } from "@graphprotocol/graph-ts/index";
import {
  MintGarmentCollection,
  BurnGarmentCollection,
  DigitalaxModelCollection as DigitalaxModelCollectionContract,
} from "../generated/DigitalaxModelCollection/DigitalaxModelCollection";

import { DigitalaxModelCollection, DigitalaxModelNFT } from "../generated/schema";
import { ZERO } from "./constants";

export function handleGarmentCollectionMinted(
  event: MintGarmentCollection
): void {
  let contract = DigitalaxModelCollectionContract.bind(event.address);
  let collectionData = contract.getCollection(event.params.collectionId);
  let collection = new DigitalaxModelCollection(
    event.params.collectionId.toString()
  );

  let mintedGarments = new Array<string>();
  for (let i = 0; i < collectionData.value1.toI32(); i++) {
    let garmentToken = DigitalaxModelNFT.load(collectionData.value0[i].toString());
    mintedGarments.push(garmentToken!.id);
  }
  collection.garments = mintedGarments;
  collection.garmentAuctionID = event.params.auctionTokenId;
  collection.rarity = event.params.rarity;
  collection.valueSold = ZERO;
  collection.save();
}

export function handleGarmentCollectionBurned(
  event: BurnGarmentCollection
): void {
  let collection = DigitalaxModelCollection.load(
    event.params.collectionId.toString()
  );
 // collection.garments = null;
// collection.garmentAuctionID = null;
//  collection.rarity = null;
  collection.save();
}
