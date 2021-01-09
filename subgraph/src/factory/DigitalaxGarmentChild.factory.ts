import {BigInt, ethereum, Address} from "@graphprotocol/graph-ts/index";
import {ZERO} from "../constants";

import {DigitalaxGarmentChild} from "../../generated/schema";
import {DigitalaxGarmentNFT as DigitalaxGarmentNFTContract} from "../../generated/DigitalaxGarmentNFT/DigitalaxGarmentNFT";
import {DigitalaxMaterials as DigitalaxMaterialsContract} from "../../generated/DigitalaxMaterials/DigitalaxMaterials";

export function loadOrCreateDigitalaxGarmentChild(
    event: ethereum.Event,
    parentTokenId: BigInt,
    childTokenId: BigInt
): DigitalaxGarmentChild {

    let contract = DigitalaxGarmentNFTContract.bind(event.address);

    let childContract = DigitalaxMaterialsContract.bind(contract.childContract());

    // {parent-token-id}-{child-token-id}
    let childId = parentTokenId.toString() + '-' + childTokenId.toString();

    let garmentChild = DigitalaxGarmentChild.load(childId);
    if (garmentChild == null) {
        garmentChild = new DigitalaxGarmentChild(childId);
        garmentChild.childId = childTokenId;
        garmentChild.parentId = parentTokenId;
        garmentChild.contract = contract.childContract();
        garmentChild.tokenUri = childContract.uri(childTokenId);
        garmentChild.amount = ZERO;
        garmentChild.rarity = 'Common'; // This needs to be updated from the token uri or hardcoded
    }
    garmentChild.save();

    return garmentChild as DigitalaxGarmentChild;
}
