import { BigInt, ethereum, Address } from "@graphprotocol/graph-ts/index";
import { ZERO } from "../constants";

import { DigitalaxGarmentModelChild } from "../../generated/schema";
import { DigitalaxModelNFT as DigitalaxModelContract } from "../../generated/DigitalaxModelNFT/DigitalaxModelNFT";
import { DigitalaxMaterialsV2 as DigitalaxMaterialsV2Contract } from "../../generated/DigitalaxMaterialsV2/DigitalaxMaterialsV2";

export function loadOrCreateDigitalaxModelChild(
  event: ethereum.Event,
  parentTokenId: BigInt,
  childTokenId: BigInt
): DigitalaxGarmentModelChild {
  let contract = DigitalaxModelContract.bind(event.address);

  let childContract = DigitalaxMaterialsV2Contract.bind(
    contract.childContract()
  );

  // {parent-token-id}-{child-token-id}
  let childId = parentTokenId.toString() + "-" + childTokenId.toString();

  let garmentChild = DigitalaxGarmentModelChild.load(childId);
  if (garmentChild == null) {
    garmentChild = new DigitalaxGarmentModelChild(childId);
    garmentChild.childId = childTokenId;
    garmentChild.parentId = parentTokenId;
    garmentChild.contract = contract.childContract();
    garmentChild.tokenUri = childContract.uri(childTokenId);
    garmentChild.amount = ZERO;
    garmentChild.rarity = "Common"; // This needs to be updated from the token uri or hardcoded
  }
  garmentChild.save();

  return garmentChild as DigitalaxGarmentModelChild;
}
