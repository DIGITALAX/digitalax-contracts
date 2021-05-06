import {BigInt, ethereum, Address} from "@graphprotocol/graph-ts/index";
import {ZERO} from "../constants";

import {DigitalaxSubscriptionChild} from "../../generated/schema";
import {DigitalaxSubscriptionNFT as DigitalaxSubscriptionNFTContract} from "../../generated/DigitalaxSubscriptionNFT/DigitalaxSubscriptionNFT";
import {DFBundle as DFBundleContract} from "../../generated/DFBundle/DFBundle";

export function loadOrCreateDigitalaxSubscriptionChild(
    event: ethereum.Event,
    parentTokenId: BigInt,
    childTokenId: BigInt
): DigitalaxSubscriptionChild {

    let contract = DigitalaxSubscriptionNFTContract.bind(event.address);

    let childContract = DFBundleContract.bind(contract.childContract());

    // {parent-token-id}-{child-token-id}
    let childId = parentTokenId.toString() + '-' + childTokenId.toString();

    let garmentChild = DigitalaxSubscriptionChild.load(childId);
    if (garmentChild == null) {
        garmentChild = new DigitalaxSubscriptionChild(childId);
        garmentChild.childId = childTokenId;
        garmentChild.parentId = parentTokenId;
        garmentChild.contract = contract.childContract();
        garmentChild.tokenUri = childContract.uri(childTokenId);
        garmentChild.amount = ZERO;
        garmentChild.rarity = 'Common'; // This needs to be updated from the token uri or hardcoded
    }
    garmentChild.save();

    return garmentChild as DigitalaxSubscriptionChild;
}
