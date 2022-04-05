import {BigInt, ethereum, Address} from "@graphprotocol/graph-ts/index";
import {ZERO} from "../constants";

import {DigitalaxF3MChildren} from "../../generated/schema";
import {DigitalaxF3MNFT as DigitalaxF3MNFTContract} from "../../generated/DigitalaxF3MNFT/DigitalaxF3MNFT";
import {DigitalaxMaterialsV2 as DigitalaxMaterialsV2Contract} from "../../generated/DigitalaxF3MNFT/DigitalaxMaterialsV2";

export function loadOrCreateDigitalaxF3MChildren(
    event: ethereum.Event,
    parentTokenId: BigInt,
    childTokenId: BigInt
): DigitalaxF3MChildren {

    let contract = DigitalaxF3MNFTContract.bind(event.address);

    let childContract = DigitalaxMaterialsV2Contract.bind(contract.childContract());

    // {parent-token-id}-{child-token-id}
    let childId = parentTokenId.toString() + '-' + childTokenId.toString();

    let garmentChild = DigitalaxF3MChildren.load(childId);
    if (garmentChild == null) {
        garmentChild = new DigitalaxF3MChildren(childId);
        garmentChild.childId = childTokenId;
        garmentChild.parentId = parentTokenId;
        garmentChild.contract = contract.childContract();
        garmentChild.tokenUri = childContract.uri(childTokenId);
        garmentChild.amount = ZERO;
        garmentChild.rarity = 'Common'; // This needs to be updated from the token uri or hardcoded
    }
    garmentChild.save();

    return garmentChild as DigitalaxF3MChildren;
}
