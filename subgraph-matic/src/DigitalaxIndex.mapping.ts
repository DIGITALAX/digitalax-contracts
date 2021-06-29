import {store} from "@graphprotocol/graph-ts/index";

import {
    CollectionGroupAdded,
    CollectionGroupRemoved,
    CollectionGroupUpdated,
    DesignerSetAdded,
    DesignerSetRemoved,
    DesignerSetUpdated,
    DesignerInfoUpdated
} from "../generated/DigitalaxIndex/DigitalaxIndex";

import {
    DigitalaxDesignerIndex,
    DigitalaxGarment,
    DigitalaxCollectionGroup,
} from "../generated/schema";

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

export function handleDesignerSetAdded(event: DesignerSetAdded): void {
    let designerId = event.params.sid;
    let designerIndex = new DigitalaxDesignerIndex(designerId.toString());
    let designerGarments = new Array<string>();
    for(let i = 0; i < event.params.tokenIds.length; i ++) {
        let tokenId = event.params.tokenIds.pop();
        let garmentToken = DigitalaxGarment.load(tokenId.toString());
        designerGarments.push(garmentToken.id);
    }
    designerIndex.garments = designerGarments;
    designerIndex.infoUrl = '';
    designerIndex.save();
}

export function handleDesignerSetRemoved(event: DesignerSetRemoved): void {
    let designerId = event.params.sid;
    let designerIndex = DigitalaxDesignerIndex.load(designerId.toString());
    designerIndex.garments = null;
    designerIndex.infoUrl = null;
    designerIndex.save();
}

export function handleDesignerSetUpdated(event: DesignerSetUpdated): void {
    let designerId = event.params.sid;
    let designerIndex = DigitalaxDesignerIndex.load(designerId.toString());
    let designerGarments = new Array<string>();
    for(let i = 0; i < event.params.tokenIds.length; i ++) {
        let tokenId = event.params.tokenIds.pop();
        let garmentToken = DigitalaxGarment.load(tokenId.toString());
        designerGarments.push(garmentToken.id);
    }
    designerIndex.garments = designerGarments;
    designerIndex.save();
}

export function handleDesignerInfoUpdated(event: DesignerInfoUpdated): void {
    let designerId = event.params.designerId;
    let designerIndex = DigitalaxDesignerIndex.load(designerId.toString());
    designerIndex.infoUrl = event.params.uri;
    designerIndex.save();
}