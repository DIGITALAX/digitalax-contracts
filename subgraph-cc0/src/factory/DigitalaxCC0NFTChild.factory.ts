import { BigInt, ethereum, Address } from "@graphprotocol/graph-ts/index";
import { ZERO } from "../constants";

import { DigitalaxCC0Children } from "../../generated/schema";
import { DigitalaxCC0NFT as DigitalaxCC0NFTContract } from "../../generated/DigitalaxCC0NFT/DigitalaxCC0NFT";
import { DigitalaxMaterialsV2 as DigitalaxMaterialsV2Contract } from "../../generated/DigitalaxCC0NFT/DigitalaxMaterialsV2";

export function loadOrCreateDigitalaxCC0Children(
  event: ethereum.Event,
  parentTokenId: BigInt,
  childTokenId: BigInt
): DigitalaxCC0Children {
  let contract = DigitalaxCC0NFTContract.bind(event.address);

  let childContract = DigitalaxMaterialsV2Contract.bind(
    contract.childContract()
  );

  // {parent-token-id}-{child-token-id}
  let childId = parentTokenId.toString() + "-" + childTokenId.toString();

  let garmentChild = DigitalaxCC0Children.load(childId);
  if (garmentChild == null) {
    garmentChild = new DigitalaxCC0Children(childId);
    garmentChild.childId = childTokenId;
    garmentChild.parentId = parentTokenId;
    garmentChild.contract = contract.childContract();
    garmentChild.tokenUri = childContract.uri(childTokenId);
    garmentChild.amount = ZERO;
    garmentChild.rarity = "Common"; // This needs to be updated from the token uri or hardcoded
  }
  garmentChild.save();

  return garmentChild as DigitalaxCC0Children;
}
