import {log, BigInt, Address, store} from "@graphprotocol/graph-ts/index";

import {
    Transfer,
    ReceivedChild,
    DigitalaxGarmentTokenUriUpdate,
    DigitalaxGarmentNFT as DigitalaxGarmentNFTContract
} from "../generated/DigitalaxGarmentNFT/DigitalaxGarmentNFT";

import {
    DigitalaxGarment,
} from "../generated/schema";
import {loadOrCreateGarmentDesigner} from "./factory/DigitalaxGarmentDesigner.factory";
import {loadOrCreateDigitalaxCollector} from "./factory/DigitalaxCollector.factory";

import {ZERO_ADDRESS} from "./constants";
import {loadOrCreateDigitalaxGarmentChild} from "./factory/DigitalaxGarmentChild.factory";

export function handleTransfer(event: Transfer): void {
    // log.info("Handle Garment Transfer @ Hash {}", [event.transaction.hash.toHexString()]);
    let contract = DigitalaxGarmentNFTContract.bind(event.address);

    // This is the birthing of a garment
    if (event.params.from.equals(ZERO_ADDRESS)) {
        let garmentId = event.params.tokenId.toString();
        let garment = new DigitalaxGarment(garmentId);
        let garmentDesigner = loadOrCreateGarmentDesigner(garmentId);
        garment.designer = garmentDesigner.id;
        garment.owner = contract.ownerOf(event.params.tokenId);
        garment.primarySalePrice = contract.primarySalePrice(event.params.tokenId);
        garment.tokenUri = contract.tokenURI(event.params.tokenId);
        garment.children = new Array<string>();
        garment.save();

        let collector = loadOrCreateDigitalaxCollector(event.params.to);
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
        store.remove('DigitalaxGarment', event.params.tokenId.toString());
    }
    // just a transfer
    else {
        // Update garment info
        let garment = DigitalaxGarment.load(event.params.tokenId.toString());
        garment.owner = contract.ownerOf(event.params.tokenId);
        garment.primarySalePrice = contract.primarySalePrice(event.params.tokenId);
        garment.save();

        // Update garments owned on the `from` and `to` address collectors
        let fromCollector = loadOrCreateDigitalaxCollector(event.params.from);
        let fromGarmentsOwned = fromCollector.parentsOwned;

        let updatedGarmentsOwned = new Array<string>();
        for(let i = 0; i < fromGarmentsOwned.length; i++) {
            let garmentId = fromGarmentsOwned.pop();
            if (garmentId !== event.params.tokenId.toString()) {
                updatedGarmentsOwned.push(garmentId);
            }
        }

        fromCollector.parentsOwned = updatedGarmentsOwned;
        fromCollector.save();

        let toCollector = loadOrCreateDigitalaxCollector(event.params.to);
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

    let garment = DigitalaxGarment.load(event.params.toTokenId.toString());

    let child = loadOrCreateDigitalaxGarmentChild(event, event.params.toTokenId, event.params.childTokenId);
    child.amount = child.amount.plus(event.params.amount);
    child.save();

    let children = garment.children;
    children.push(child.id);
    garment.children = children;

    garment.save();
}

export function handleUriUpdated(event: DigitalaxGarmentTokenUriUpdate): void {
    let garment = DigitalaxGarment.load(event.params._tokenId.toString());
    garment.tokenUri = event.params._tokenUri;
    garment.save();
}
