import {BigInt, ethereum, Address} from "@graphprotocol/graph-ts/index";
import {ZERO} from "../constants";

import {DigitalaxBundle, DigitalaxBundleOwner} from "../../generated/schema";
import {DFBundle as DFBundleContract} from "../../generated/DFBundle/DFBundle";

export function loadOrCreateDigitalaxBundleOwner(
    event: ethereum.Event,
    parentTokenOwner: Address,
    childTokenId: BigInt
): DigitalaxBundleOwner {

    let childContract = DFBundleContract.bind(event.address);

    // {parent-token-id-holder}-{child-token-id}
    let childId = parentTokenOwner.toHexString() + '-' + childTokenId.toString();

    let materialOwner = DigitalaxBundleOwner.load(childId);
    if (materialOwner == null) {
        materialOwner = new DigitalaxBundleOwner(childId);
        materialOwner.childId = childTokenId;
        materialOwner.owner = parentTokenOwner;
        materialOwner.contract = event.address;
        materialOwner.tokenUri = childContract.uri(childTokenId);
        materialOwner.amount = ZERO;
        if(DigitalaxBundle.load(childTokenId.toString())){
            if(DigitalaxBundle.load(childTokenId.toString())!.id) {
                materialOwner.token = DigitalaxBundle.load(childTokenId.toString())!.id.toString();
            }
        }

    }
    materialOwner.save();

    return materialOwner as DigitalaxBundleOwner;
}
