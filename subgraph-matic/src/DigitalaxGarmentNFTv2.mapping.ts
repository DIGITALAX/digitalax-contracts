import {log, BigInt, Address, store} from "@graphprotocol/graph-ts/index";

import {
    Transfer,
    ReceivedChild,
    DigitalaxGarmentTokenUriUpdate,
    DigitalaxGarmentNFTv2 as DigitalaxGarmentNFTv2Contract
} from "../generated/DigitalaxGarmentNFTv2/DigitalaxGarmentNFTv2";

import {
    DigitalaxGarmentV2,
} from "../generated/schema";
import {loadOrCreateGarmentV2Designer} from "./factory/DigitalaxGarmentV2Designer.factory";
import {loadOrCreateDigitalaxCollectorV2} from "./factory/DigitalaxCollectorV2.factory";

import {ZERO_ADDRESS} from "./constants";
import {loadOrCreateDigitalaxGarmentChildV2} from "./factory/DigitalaxGarmentV2Child.factory";

export function handleTransfer(event: Transfer): void {
    log.info("Handle Garment Transfer @ Hash {}", [event.transaction.hash.toHexString()]);
    let contract = DigitalaxGarmentNFTv2Contract.bind(event.address);

    // This is the birthing of a garment
    if (event.params.from.equals(ZERO_ADDRESS)) {
        let garmentId = event.params.tokenId.toString();
        let garment = new DigitalaxGarmentV2(garmentId);
        let garmentDesigner = loadOrCreateGarmentV2Designer(garmentId);
        garment.tokenUri = contract.tokenURI(event.params.tokenId);
        garment.owner = contract.ownerOf(event.params.tokenId);
        garment.designer = garmentDesigner.id;
        garment.primarySalePrice = contract.primarySalePrice(event.params.tokenId);
        garment.children = new Array<string>();
        garment.image = null;
        garment.animation = null;
        garment.save();

        let collector = loadOrCreateDigitalaxCollectorV2(event.params.to);
        let parentsOwned = collector.parentsOwned;
        parentsOwned.push(garmentId);
        collector.parentsOwned = parentsOwned;
        collector.save();

        let garments = garmentDesigner.garments;
        garments.push(garmentId);
        garmentDesigner.garments = garments;
        garmentDesigner.save();
    }

    // handle burn
    else if (event.params.to.equals(ZERO_ADDRESS)) {
        // TODO come back to this regarding collector vs artist / admin burning
        store.remove('DigitalaxGarmentV2', event.params.tokenId.toString());
    }
    // just a transfer
    else {
        // Update garment info
        let garment = DigitalaxGarmentV2.load(event.params.tokenId.toString());
        garment.owner = contract.ownerOf(event.params.tokenId);
        garment.primarySalePrice = contract.primarySalePrice(event.params.tokenId);
        garment.save();

        // Update garments owned on the `from` and `to` address collectors
        let fromCollector = loadOrCreateDigitalaxCollectorV2(event.params.from);
        let fromGarmentsOwned = fromCollector.parentsOwned;

        let updatedGarmentsOwned = new Array<string>();
        for(let i = 0; i < fromGarmentsOwned.length - 1; i++) {
            let garmentId = fromGarmentsOwned.pop();
            if (garmentId !== event.params.tokenId.toString()) {
                updatedGarmentsOwned.push(garmentId);
            }
        }

        fromCollector.parentsOwned = updatedGarmentsOwned;
        fromCollector.save();

        let toCollector = loadOrCreateDigitalaxCollectorV2(event.params.to);
        let parentsOwned = toCollector.parentsOwned;
        parentsOwned.push(event.params.tokenId.toString());
        toCollector.parentsOwned = parentsOwned;
        toCollector.save();
    }
}

// triggered when a parent receives a child token
export function handleChildReceived(event: ReceivedChild): void {
    log.info("Handle Child ID {} linking to Garment ID {} @ Hash {}", [
        event.params.childTokenId.toString(),
        event.transaction.hash.toHexString(),
        event.params.toTokenId.toString()
    ]);

    let garment = DigitalaxGarmentV2.load(event.params.toTokenId.toString());

    let child = loadOrCreateDigitalaxGarmentChildV2(event, event.params.toTokenId, event.params.childTokenId);
    child.amount = child.amount.plus(event.params.amount);
    child.save();

    let children = garment.children;
    children.push(child.id);
    garment.children = children;

    garment.save();
}


export function handleUriUpdated(event: DigitalaxGarmentTokenUriUpdate): void {
    let contract = DigitalaxGarmentNFTv2Contract.bind(event.address);
    let garment = DigitalaxGarmentV2.load(event.params._tokenId.toString());
    if (garment == null) {
        garment = new DigitalaxGarmentV2(event.params._tokenId.toString());
        garment.designer = contract.garmentDesigners(event.params._tokenId).toString();
        garment.primarySalePrice = contract.primarySalePrice(event.params._tokenId);
        garment.children = null;
        garment.owner = null;
        garment.children
    }
    garment.tokenUri = contract.tokenURI(event.params._tokenId);
    garment.save();
}

