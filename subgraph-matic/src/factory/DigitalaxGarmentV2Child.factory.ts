import {BigInt, ethereum, Address} from "@graphprotocol/graph-ts/index";
import {ZERO} from "../constants";

import {DigitalaxGarmentChildV2} from "../../generated/schema";
import {DigitalaxGarmentNFTv2 as DigitalaxGarmentNFTv2Contract} from "../../generated/DigitalaxGarmentNFTv2/DigitalaxGarmentNFTv2";
import {DigitalaxMaterialsV2 as DigitalaxMaterialsV2Contract} from "../../generated/DigitalaxMaterialsV2/DigitalaxMaterialsV2";

export function loadOrCreateDigitalaxGarmentChildV2(
    event: ethereum.Event,
    parentTokenId: BigInt,
    childTokenId: BigInt
): DigitalaxGarmentChildV2 {

    let contract = DigitalaxGarmentNFTv2Contract.bind(event.address);

    let childContract = DigitalaxMaterialsV2Contract.bind(contract.childContract());

    // {parent-token-id}-{child-token-id}
    let childId = parentTokenId.toString() + '-' + childTokenId.toString();

    let garmentChild = DigitalaxGarmentChildV2.load(childId);
    if (garmentChild == null) {
        garmentChild = new DigitalaxGarmentChildV2(childId);
        garmentChild.childId = childTokenId;
        garmentChild.parentId = parentTokenId;
        garmentChild.contract = contract.childContract();
        garmentChild.tokenUri = childContract.uri(childTokenId);
        garmentChild.amount = ZERO;
        garmentChild.rarity = 'Common'; // This needs to be updated from the token uri or hardcoded
    }
    garmentChild.save();

    return garmentChild as DigitalaxGarmentChildV2;
}
