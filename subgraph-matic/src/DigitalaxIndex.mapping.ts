import {Bytes, ipfs, json, JSONValueKind, log, store} from "@graphprotocol/graph-ts/index";

import {
    CollectionGroupAdded,
    CollectionGroupRemoved,
    CollectionGroupUpdated,
    DesignerGroupAdded,
    DesignerGroupRemoved,
    DeveloperGroupRemoved
} from "../generated/DigitalaxIndex/DigitalaxIndex";

import {
    DigitalaxDesigner,
    DigitalaxCollectionGroup,
    DigitalaxDeveloper,
    DigitalaxGarmentV2Auction,
    DigitalaxGarmentV2Collection,
} from "../generated/schema";
import { loadOrCreateDigitalaxDesigner } from './factory/DigitalaxDesigner.factory';
import { loadOrCreateDigitalaxDeveloper } from './factory/DigitalaxDeveloper.factory';

export function handleCollectionGroupAdded(event: CollectionGroupAdded): void {
    let collectionGroupId = event.params.sid;
    let collectionGroup = new DigitalaxCollectionGroup(collectionGroupId.toString());

    let auctions = new Array<string>();
    let paramAuctions = event.params.auctions;
    for (let i = 0; i < paramAuctions.length; i += 1) {
        let auctionId = paramAuctions[i];
        auctions.push(auctionId.toString());
    }

    let collections = new Array<string>();
    let paramCollections = event.params.collections;
    for (let i = 0; i < paramCollections.length; i += 1) {
        let collectionId = paramCollections[i];
        collections.push(collectionId.toString());
    }

    let digiBudngle = event.params.digiBundleCollection.toString();

    collectionGroup.auctions = auctions;
    collectionGroup.collections = collections;
    collectionGroup.digiBundle = digiBudngle;

    collectionGroup.save();
}

export function handleCollectionGroupRemoved(event: CollectionGroupRemoved): void {
    store.remove("DigitalaxCollectionGroup", event.params.sid.toString());
}

export function handleCollectionGroupUpdated(event: CollectionGroupUpdated): void {
    let collectionGroupId = event.params.sid;
    let collectionGroup = DigitalaxCollectionGroup.load(collectionGroupId.toString());

    let auctions = new Array<string>();
    let paramAuctions = event.params.auctions;
    for (let i = 0; i < paramAuctions.length; i += 1) {
        let auctionId = paramAuctions[i];
        auctions.push(auctionId.toString());
    }

    let collections = new Array<string>();
    let paramCollections = event.params.collections;
    for (let i = 0; i < paramCollections.length; i += 1) {
        let collectionId = paramCollections[i];
        collections.push(collectionId.toString());
    }

    let digiBudngle = event.params.digiBundleCollection.toString();

    collectionGroup.auctions = auctions;
    collectionGroup.collections = collections;
    collectionGroup.digiBundle = digiBudngle;

    collectionGroup.save();
}

export function handleDesignerGroupRemoved(event: DesignerGroupRemoved): void {
    let designer = DigitalaxDesigner.load(event.params._address.toHexString());
    let collectionIds = designer.collections;
    let auctionIds = designer.auctions;
    for (let i = 0; i < collectionIds.length; i += 1) {
        let collectionId = collectionIds[i];
        let collection = DigitalaxGarmentV2Collection.load(collectionId.toString());
        if (collection) {
            collection.designer = null;
            collection.save();
        }
    }

    for (let i = 0; i < auctionIds.length; i += 1) {
        let auctionId = auctionIds[i];
        let auction = DigitalaxGarmentV2Auction.load(auctionId.toString());
        if (auction) {
            auction.designer = null;
            auction.save();
        }

    }
    store.remove('DigitalaxDesigner', event.params._address.toHexString());
}

export function handleDesignerGroupAdded(event: DesignerGroupAdded): void {
    let designer = loadOrCreateDigitalaxDesigner(event.params._address);
    let collectionIds = event.params.collectionIds;
    let auctionIds = event.params.auctionIds;
    let collections = new Array<string>();
    let auctions = new Array<string>();
    for(let i = 0; i < collectionIds.length; i += 1) {
        let collectionId = collectionIds[i];
        let collection = DigitalaxGarmentV2Collection.load(collectionId.toString());
        if (collection) {
            collection.designer = designer.id;
            collection.save();
            collections.push(collection.id);
        }
    }
    for(let i = 0; i < auctionIds.length; i += 1) {
        let auctionId = auctionIds[i];
        let auction = DigitalaxGarmentV2Auction.load(auctionId.toString());
        if (auction) {
            auction.designer = designer.id;
            auction.save();
            auctions.push(auction.id);
        }
    }
    designer.collections = collections;
    designer.auctions = auctions;

    let designerHash = event.params.uri;
    let designerBytes = ipfs.cat(designerHash);
    if (designerBytes) {
        let data = json.try_fromBytes(designerBytes as Bytes);
        if (data.isOk) {
            if (data.value.kind === JSONValueKind.OBJECT) {
                let res = data.value.toObject();
                if (res.get('Designer ID').kind === JSONValueKind.STRING) {
                    designer.name = res.get('Designer ID').toString();
                }
                if (res.get('description').kind === JSONValueKind.STRING) {
                    designer.description = res.get('description').toString();
                }
                if (res.get('image_url').kind === JSONValueKind.STRING) {
                    designer.image = res.get('image_url').toString();
                }
            }
        }
    }
    designer.save();
}

export function handleDeveloperGroupRemoved(event: DeveloperGroupRemoved): void {
    let developer = DigitalaxDeveloper.load(event.params._address.toHexString());
    let collectionIds = developer.collections;
    let auctionIds = developer.auctions;
    for (let i = 0; i < collectionIds.length; i += 1) {
        let collectionId = collectionIds[i];
        let collection = DigitalaxGarmentV2Collection.load(collectionId);
        if (collection) {
            collection.developer = null;
            collection.save();
        }
    }

    for (let i = 0; i < auctionIds.length; i += 1) {
        let auctionId = auctionIds[i];
        let auction = DigitalaxGarmentV2Auction.load(auctionId);
        if (auction) {
            auction.developer = null;
            auction.save();
        }

    }
    store.remove('DigitalaxDeveloper', event.params._address.toHexString());
}

export function handleDeveloperGroupAdded(event: DesignerGroupAdded): void {
    let developer = loadOrCreateDigitalaxDeveloper(event.params._address);
    let collections = new Array<string>();
    let auctions = new Array<string>();
    let collectionIds = event.params.collectionIds;
    let auctionIds = event.params.auctionIds;
    for(let i = 0; i < collectionIds.length; i += 1) {
        let collectionId = collectionIds[i];
        let collection = DigitalaxGarmentV2Collection.load(collectionId.toString());
        if (collection) {
            collection.developer = developer.id;
            collection.save();
            collections.push(developer.id);
        }
    }
    
    for(let i = 0; i < auctionIds.length; i += 1) {
        let auctionId = auctionIds[i];
        let auction = DigitalaxGarmentV2Auction.load(auctionId.toString());
        if (auction) {
            auction.developer = developer.id;
            auction.save();
            collections.push(developer.id);
        }
    }
    developer.collections = collections;
    developer.auctions = auctions;

    let developerHash = event.params.uri;
    let developerBytes = ipfs.cat(developerHash);
    if (developerBytes) {
        let data = json.try_fromBytes(developerBytes as Bytes);
        if (data.isOk) {
            if (data.value.kind === JSONValueKind.OBJECT) {
                let res = data.value.toObject();
                if (res.get('name').kind === JSONValueKind.STRING) {
                    developer.name = res.get('name').toString();
                }
                if (res.get('description').kind === JSONValueKind.STRING) {
                    developer.description = res.get('description').toString();
                }
                if (res.get('image_url').kind === JSONValueKind.STRING) {
                    developer.image = res.get('image_url').toString();
                }
            }
        }
    }
    developer.save();
}