import {log, BigInt, Address, store} from "@graphprotocol/graph-ts/index";

import {
    Transfer,
    ReceivedChild,
    DigitalaxGarmentNFT as DigitalaxGarmentNFTContract
} from "../generated/DigitalaxGarmentNFT/DigitalaxGarmentNFT";

import {
    DigitalaxMaterials as DigitalaxMaterialsContract
} from "../generated/DigitalaxMaterials/DigitalaxMaterials";

import {
    DigitalaxGarment,
    DigitalaxMaterialOwner,
    DigitalaxCollector,
    DigitalaxGarmentDesigner
} from "../generated/schema";

export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

export function handleTransfer(event: Transfer): void {
    log.info("Handle Garment Transfer @ Hash {}", [event.transaction.hash.toHexString()]);
    let contract = DigitalaxGarmentNFTContract.bind(event.address);

    // This is the birthing of a garment
    if (event.params.from.equals(ZERO_ADDRESS)) {
        let garmentId = event.params.tokenId.toString();
        let garment = new DigitalaxGarment(garmentId);
        garment.designer = contract.garmentDesigners(event.params.tokenId);
        garment.owner = contract.ownerOf(event.params.tokenId);
        garment.primarySalePrice = contract.primarySalePrice(event.params.tokenId);
        garment.tokenUri = contract.tokenURI(event.params.tokenId);
        garment.strands = new Array<string>();
        garment.save();

        let collector = DigitalaxCollector.load(event.params.to.toHexString());

        let garmentsOwned = new Array<string>();
        let strandsOwned = new Array<string>();
        if (collector == null) {
            collector = new DigitalaxCollector(event.params.to.toHexString());
        } else {
            garmentsOwned = collector.garmentsOwned;
            strandsOwned = collector.strandsOwned;
        }

        garmentsOwned.push(garmentId);
        collector.garmentsOwned = garmentsOwned;
        collector.strandsOwned = strandsOwned;
        collector.save();

        let garmentDesignerId = contract.garmentDesigners(event.params.tokenId).toHexString();
        let garmentDesigner = DigitalaxGarmentDesigner.load(garmentDesignerId);
        if (garmentDesigner == null) {
            garmentDesigner = new DigitalaxGarmentDesigner(garmentDesignerId);
            garmentDesigner.garments = new Array<string>();
            garmentDesigner.listings = new Array<string>();
        }

        let garments = garmentDesigner.garments;
        garments.push(garmentId);
        garmentDesigner.garments = garments;
        garmentDesigner.save();
    }

    // handle burn
    else if (event.params.to.equals(ZERO_ADDRESS)) {
        let garment = DigitalaxGarment.load(event.params.tokenId.toString());
        let collector = DigitalaxCollector.load(event.params.from.toHexString());
        collector.strandsOwned = garment.strands;
        collector.save();

        // TODO come back to this regarding collector vs artist / admin burning
        store.remove('DigitalaxGarment', event.params.tokenId.toString());
    }
    // just a transfer
    else {
        let garment = DigitalaxGarment.load(event.params.tokenId.toString());
        garment.owner = contract.ownerOf(event.params.tokenId);
        garment.primarySalePrice = contract.primarySalePrice(event.params.tokenId);
        garment.save();
    }
}

export function handleChildReceived(event: ReceivedChild): void {
    log.info("Handle Child ID {} linking to Garment ID {} @ Hash {}", [
        event.params.childTokenId.toString(),
        event.transaction.hash.toHexString(),
        event.params.toTokenId.toString()
    ]);

    let contract = DigitalaxGarmentNFTContract.bind(event.address);

    let garment = DigitalaxGarment.load(event.params.toTokenId.toString());

    let childId = contract.ownerOf(event.params.toTokenId).toHexString() + '-' + event.params.childTokenId.toString();
    let child = DigitalaxMaterialOwner.load(childId);

    if (child == null) {
        child = new DigitalaxMaterialOwner(childId);
        child.amount = event.params.amount;
    } else {
        child.amount = child.amount + event.params.amount;
    }

    child.contract = contract.childContract();

    const childContract = DigitalaxMaterialsContract.bind(contract.childContract());
    child.tokenUri = childContract.uri(event.params.childTokenId);
    child.save();

    let strands = garment.strands;

    strands.push(childId);
    garment.strands = strands;

    garment.save();
}
