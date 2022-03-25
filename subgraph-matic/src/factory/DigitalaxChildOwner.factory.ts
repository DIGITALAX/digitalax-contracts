import {BigInt, ethereum, Address} from "@graphprotocol/graph-ts/index";
import {ZERO} from "../constants";

import {DigitalaxBundle, DigitalaxChildOwner, DigitalaxMaterial} from "../../generated/schema";
import {DigitalaxMaterials as DigitalaxMaterialsContract} from "../../generated/DigitalaxMaterials/DigitalaxMaterials";

export function loadOrCreateDigitalaxChildOwner(
    event: ethereum.Event,
    parentTokenOwner: Address,
    childTokenId: BigInt
): DigitalaxChildOwner {

    let childContract = DigitalaxMaterialsContract.bind(event.address);

    // {parent-token-id-holder}-{child-token-id}
    let childId = parentTokenOwner.toHexString() + '-' + childTokenId.toString();

    let materialOwner = DigitalaxChildOwner.load(childId);
    if (materialOwner == null) {
        materialOwner = new DigitalaxChildOwner(childId);
        materialOwner.childId = childTokenId;
        materialOwner.owner = parentTokenOwner;
        materialOwner.contract = event.address;
        materialOwner.tokenUri = childContract.uri(childTokenId);
        materialOwner.amount = ZERO;
        materialOwner.token = DigitalaxMaterial.load(childTokenId.toString()).id.toString();
    }
    materialOwner.save();

    return materialOwner as DigitalaxChildOwner;
}
