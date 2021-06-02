import {log, store, ipfs, json, JSONValueKind, Bytes} from "@graphprotocol/graph-ts/index";

import {
    Transfer,
    ReceivedChild,
    DigitalaxGarmentTokenUriUpdate,
    DigitalaxGarmentNFT as DigitalaxGarmentNFTContract
} from "../generated/DigitalaxGarmentNFT/DigitalaxGarmentNFT";

import {
    DigitalaxGarment,
    GarmentAttribute
} from "../generated/schema";
import {loadOrCreateGarmentDesigner} from "./factory/DigitalaxGarmentDesigner.factory";
import {loadOrCreateDigitalaxCollector} from "./factory/DigitalaxCollector.factory";

import {ZERO_ADDRESS} from "./constants";
import {loadOrCreateDigitalaxGarmentChild} from "./factory/DigitalaxGarmentChild.factory";
import { TokenPrimarySalePriceSet } from '../generated/DigitalaxGarmentNFTv2/DigitalaxGarmentNFTv2';

export function handleTransfer(event: Transfer): void {
    log.info("Handle Garment Transfer @ Hash {}", [event.transaction.hash.toHexString()]);
    let contract = DigitalaxGarmentNFTContract.bind(event.address);

    // This is the birthing of a garment
    if (event.params.from.equals(ZERO_ADDRESS)) {
        let garmentId = event.params.tokenId.toString();
        let garment = new DigitalaxGarment(garmentId);
        let garmentDesigner = loadOrCreateGarmentDesigner(garmentId);
        garment.designer = garmentDesigner.id;
        let owner = contract.try_ownerOf(event.params.tokenId);
        if (!owner.reverted) {
            garment.owner = owner.value;
        }
        garment.primarySalePrice = contract.primarySalePrice(event.params.tokenId);
        garment.tokenUri = contract.tokenURI(event.params.tokenId);
        garment.children = new Array<string>();
        garment.image = "";
        garment.animation = "";
        garment.name = "";
        garment.description = "";
        garment.external = "";
        garment.attributes = new Array<string>();

        if (garment.tokenUri) {
            if (garment.tokenUri.includes('ipfs/')) {
                let tokenHash = garment.tokenUri.split('ipfs/')[1];
                let tokenBytes = ipfs.cat(tokenHash);
                if (tokenBytes) {
                    let data = json.try_fromBytes(tokenBytes as Bytes);
                    if (data.isOk) {
                        if (data.value.kind === JSONValueKind.OBJECT) {
                            let res = data.value.toObject();
                            if (res.get('image').kind === JSONValueKind.STRING) {
                                garment.image = res.get('image').toString();
                            }
                            if (res.get('animation_url').kind === JSONValueKind.STRING) {
                                garment.animation = res.get('animation_url').toString();
                            }
                            if (res.get('name').kind === JSONValueKind.STRING) {
                                garment.name = res.get('name').toString();
                            }
                            if (res.get('description').kind === JSONValueKind.STRING) {
                                garment.description = res.get('description').toString();
                            }
                            if (res.get('external url').kind === JSONValueKind.STRING) {
                                garment.external = res.get('external url').toString();
                            }
                            if (res.get('attributes').kind === JSONValueKind.ARRAY) {
                                let attributes = res.get('attributes').toArray();
                                for (let i = 0; i < attributes.length; i += 1) {
                                    if (attributes[i].kind === JSONValueKind.OBJECT) {
                                        let attribute = attributes[i].toObject();
                                        let garmentAttribute = new GarmentAttribute(garment.id + i.toString());
                                        garmentAttribute.type = null;
                                        garmentAttribute.value = null;

                                        if (attribute.get('trait_type').kind === JSONValueKind.STRING) {
                                            garmentAttribute.type = attribute.get('trait_type').toString();
                                        }
                                        if (attribute.get('value').kind === JSONValueKind.STRING) {
                                            garmentAttribute.value = attribute.get('value').toString();
                                        }
                                        garmentAttribute.save();
                                        let attrs = garment.attributes;
                                        attrs.push(garmentAttribute.id);
                                        garment.attributes = attrs;
                                    }
                                }
                            }
                        }
                    }
                }

            }
        }

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
        let owner = contract.try_ownerOf(event.params.tokenId);
        if (!owner.reverted) {
            garment.owner = owner.value;
        }
        garment.primarySalePrice = contract.primarySalePrice(event.params.tokenId);
        garment.save();

        // Update garments owned on the `from` and `to` address collectors
        let fromCollector = loadOrCreateDigitalaxCollector(event.params.from);
        let fromGarmentsOwned = fromCollector.parentsOwned;

        let updatedGarmentsOwned = new Array<string>();
        for (let i = 0; i < fromGarmentsOwned.length; i += 1) {
            if (fromGarmentsOwned[i] !== event.params.tokenId.toString()) {
                updatedGarmentsOwned.push(fromGarmentsOwned[i]);
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
    garment.image = "";
    garment.animation = "";
    garment.name = "";
    garment.description = "";
    garment.external = "";
    garment.attributes = new Array<string>();

    if (garment.tokenUri) {
        if (garment.tokenUri.includes('ipfs/')) {
            let tokenHash = garment.tokenUri.split('ipfs/')[1];
            let tokenBytes = ipfs.cat(tokenHash);
            if (tokenBytes) {
                let data = json.try_fromBytes(tokenBytes as Bytes);
                if (data.isOk) {
                    if (data.value.kind === JSONValueKind.OBJECT) {
                        let res = data.value.toObject();
                        if (res.get('image').kind === JSONValueKind.STRING) {
                            garment.image = res.get('image').toString();
                        }
                        if (res.get('animation_url').kind === JSONValueKind.STRING) {
                            garment.animation = res.get('animation_url').toString();
                        }
                        if (res.get('name').kind === JSONValueKind.STRING) {
                            garment.name = res.get('name').toString();
                        }
                        if (res.get('description').kind === JSONValueKind.STRING) {
                            garment.description = res.get('description').toString();
                        }
                        if (res.get('external url').kind === JSONValueKind.STRING) {
                            garment.external = res.get('external url').toString();
                        }
                        if (res.get('attributes').kind === JSONValueKind.ARRAY) {
                            let attributes = res.get('attributes').toArray();
                            for (let i = 0; i < attributes.length; i += 1) {
                                if (attributes[i].kind === JSONValueKind.OBJECT) {
                                    let attribute = attributes[i].toObject();
                                    let garmentAttribute = new GarmentAttribute(garment.id + i.toString());
                                    garmentAttribute.type = null;
                                    garmentAttribute.value = null;

                                    if (attribute.get('trait_type').kind === JSONValueKind.STRING) {
                                        garmentAttribute.type = attribute.get('trait_type').toString();
                                    }
                                    if (attribute.get('value').kind === JSONValueKind.STRING) {
                                        garmentAttribute.value = attribute.get('value').toString();
                                    }
                                    garmentAttribute.save();
                                    let attrs = garment.attributes;
                                    attrs.push(garmentAttribute.id);
                                    garment.attributes = attrs;
                                }
                            }
                        }
                    }
                }
            }

        }
    }

    garment.save();
}

export function handleTokenPriceSaleUpdated(event: TokenPrimarySalePriceSet): void {
    let contract = DigitalaxGarmentNFTContract.bind(event.address);
    let garment = DigitalaxGarment.load(event.params._tokenId.toString());
    garment.primarySalePrice = contract.primarySalePrice(event.params._tokenId);

    garment.save();
}
