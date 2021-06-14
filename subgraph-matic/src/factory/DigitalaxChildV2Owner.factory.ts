import {BigInt, ethereum, Address} from "@graphprotocol/graph-ts/index";
import {ZERO} from "../constants";

import {DigitalaxBundle, DigitalaxChildV2Owner, DigitalaxMaterial, DigitalaxMaterialV2} from "../../generated/schema";
import {DigitalaxMaterialsV2 as DigitalaxMaterialsV2Contract} from "../../generated/DigitalaxMaterialsV2/DigitalaxMaterialsV2";

export function loadOrCreateDigitalaxChildV2Owner(
    event: ethereum.Event,
    parentTokenOwner: Address,
    childTokenId: BigInt
): DigitalaxChildV2Owner {

    let childContract = DigitalaxMaterialsV2Contract.bind(event.address);

    // {parent-token-id-holder}-{child-token-id}
    let childId = parentTokenOwner.toHexString() + '-' + childTokenId.toString();

    let materialOwner = DigitalaxChildV2Owner.load(childId);
    if (materialOwner == null) {
        materialOwner = new DigitalaxChildV2Owner(childId);
        materialOwner.childId = childTokenId;
        materialOwner.owner = parentTokenOwner;
        materialOwner.contract = event.address;
        materialOwner.tokenUri = childContract.uri(childTokenId);
        materialOwner.amount = ZERO;
        materialOwner.token = DigitalaxMaterialV2.load(childTokenId.toString()).id.toString();
    }
    materialOwner.save();

    return materialOwner as DigitalaxChildV2Owner;
}
