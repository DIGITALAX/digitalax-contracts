import {log, BigInt, Address, store, ipfs, json, Bytes, JSONValueKind} from "@graphprotocol/graph-ts/index";

import {
    Transfer,
    LookGoldenTicket as LookGoldenTicketContract
} from "../generated/LookGoldenTicket/LookGoldenTicket";

import {
    LookGoldenTicket,
    GarmentAttribute
} from "../generated/schema";


import {loadOrCreateLookGoldenTicketCollector} from "./factory/LookGoldenTicketCollector.factory";
import {ZERO_ADDRESS} from "./constants";

export function handleTransfer(event: Transfer): void {
    log.info("Handle Garment Transfer @ Hash {}", [event.transaction.hash.toHexString()]);
    let contract = LookGoldenTicketContract.bind(event.address);

    // This is the birthing of a garment
    if (event.params.from.equals(ZERO_ADDRESS)) {
        let garmentId = event.params.tokenId.toString();
        let garment = new LookGoldenTicket(garmentId);
        let owner = contract.try_ownerOf(event.params.tokenId);
        if (!owner.reverted) {
            garment.owner = owner.value;
        }
        garment.tokenUri = contract.tokenURI(event.params.tokenId);
        garment.animation = "";
        garment.name = "";
        garment.description = "";
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
                            if (res.get('animation_url').kind === JSONValueKind.STRING) {
                                garment.animation = res.get('animation_url').toString();
                            }if (res.get('name').kind === JSONValueKind.STRING) {
                                garment.name = res.get('name').toString();
                            }
                            if (res.get('description').kind === JSONValueKind.STRING) {
                                garment.description = res.get('description').toString();
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

        let collector = loadOrCreateLookGoldenTicketCollector(event.params.to);
        let parentsOwned = collector.parentsOwned;
        parentsOwned.push(garmentId);
        collector.parentsOwned = parentsOwned;
        collector.save();
    }

    // handle burn
    else if (event.params.to.equals(ZERO_ADDRESS)) {
        // TODO come back to this regarding collector vs artist / admin burning
        store.remove('LookGoldenTicket', event.params.tokenId.toString());
    }
    // just a transfer
    else {
        // Update garment info
        let garment = LookGoldenTicket.load(event.params.tokenId.toString());
        let owner = contract.try_ownerOf(event.params.tokenId);
        if (!owner.reverted) {
            garment.owner = owner.value;
        }

        garment.save();

        // Update garments owned on the `from` and `to` address collectors
        let fromCollector = loadOrCreateLookGoldenTicketCollector(event.params.from);
        let fromGarmentsOwned = fromCollector.parentsOwned;

        let updatedGarmentsOwned = new Array<string>();
        for (let i = 0; i < fromGarmentsOwned.length; i += 1) {
            if (fromGarmentsOwned[i] !== event.params.tokenId.toString()) {
                updatedGarmentsOwned.push(fromGarmentsOwned[i]);
            }
        }

        fromCollector.parentsOwned = updatedGarmentsOwned;
        fromCollector.save();

        let toCollector = loadOrCreateLookGoldenTicketCollector(event.params.to);
        let parentsOwned = toCollector.parentsOwned;
        parentsOwned.push(event.params.tokenId.toString());
        toCollector.parentsOwned = parentsOwned;
        toCollector.save();
    }
}
