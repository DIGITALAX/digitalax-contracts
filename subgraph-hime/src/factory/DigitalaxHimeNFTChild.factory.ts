import { BigInt, ethereum, Address } from "@graphprotocol/graph-ts/index";
import { ZERO } from "../constants";

import { DigitalaxHimeChildren } from "../../generated/schema";
import { DigitalaxHimeNFT as DigitalaxHimeNFTContract } from "../../generated/DigitalaxHimeNFT/DigitalaxHimeNFT";
import { DigitalaxMaterialsV2 as DigitalaxMaterialsV2Contract } from "../../generated/DigitalaxHimeNFT/DigitalaxMaterialsV2";

export function loadOrCreateDigitalaxHimeChildren(
  event: ethereum.Event,
  parentTokenId: BigInt,
  childTokenId: BigInt
): DigitalaxHimeChildren {
  let contract = DigitalaxHimeNFTContract.bind(event.address);

  let childContract = DigitalaxMaterialsV2Contract.bind(
    contract.childContract()
  );

  // {parent-token-id}-{child-token-id}
  let childId = parentTokenId.toString() + "-" + childTokenId.toString();

  let garmentChild = DigitalaxHimeChildren.load(childId);
  if (garmentChild == null) {
    garmentChild = new DigitalaxHimeChildren(childId);
    garmentChild.childId = childTokenId;
    garmentChild.parentId = parentTokenId;
    garmentChild.contract = contract.childContract();
    garmentChild.tokenUri = childContract.uri(childTokenId);
    garmentChild.amount = ZERO;
    garmentChild.rarity = "Common"; // This needs to be updated from the token uri or hardcoded
  }
  garmentChild.save();

  return garmentChild as DigitalaxHimeChildren;
}
