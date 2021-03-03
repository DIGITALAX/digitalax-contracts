import {log, BigInt, Address, store} from "@graphprotocol/graph-ts/index";

import {
    AuctionSetAdded,
    AuctionSetRemoved,
    AuctionSetUpdated,
    DesignerSetAdded,
    DesignerSetRemoved,
    DesignerSetUpdated,
    DesignerInfoUpdated
} from "../generated/DigitalaxIndex/DigitalaxIndex";

import {
    DigitalaxDesignerIndex,
    DigitalaxAuctionIndex,
    DigitalaxGarment
} from "../generated/schema";
import {loadOrCreateGarmentDesigner} from "./factory/DigitalaxGarmentDesigner.factory";
import {loadOrCreateDigitalaxCollector} from "./factory/DigitalaxCollector.factory";

import {ZERO_ADDRESS} from "./constants";
import {loadOrCreateDigitalaxGarmentChild} from "./factory/DigitalaxGarmentChild.factory";

export function handleAuctionSetAdded(event: AuctionSetAdded): void {
    let auctionId = event.params.sid;
    let auctionIndex = new DigitalaxAuctionIndex(auctionId.toString());
    let auctionGarments = new Array<string>();
    for(let i = 0; i < event.params.tokenIds.length; i ++) {
        let garmentToken = DigitalaxGarment.load(event.params.tokenIds[i].toString());
        auctionGarments.push(garmentToken.id);
    }
    auctionIndex.garments = auctionGarments;
    auctionIndex.save();
}

export function handleAuctionSetRemoved(event: AuctionSetRemoved): void {
    let auctionId = event.params.sid;
    let auctionIndex = DigitalaxAuctionIndex.load(auctionId.toString());
    auctionIndex.garments = null;
    auctionIndex.save();
}

export function handleAuctionSetUpdated(event: AuctionSetUpdated): void {
    let auctionId = event.params.sid;
    let auctionIndex = DigitalaxAuctionIndex.load(auctionId.toString());
    let auctionGarments = new Array<string>();
    for(let i = 0; i < event.params.tokenIds.length; i ++) {
        let garmentToken = DigitalaxGarment.load(event.params.tokenIds[i].toString());
        auctionGarments.push(garmentToken.id);
    }
    auctionIndex.garments = auctionGarments;
    auctionIndex.save();
}

export function handleDesignerSetAdded(event: DesignerSetAdded): void {
    let designerId = event.params.sid;
    let designerIndex = new DigitalaxDesignerIndex(designerId.toString());
    let designerGarments = new Array<string>();
    for(let i = 0; i < event.params.tokenIds.length; i ++) {
        let garmentToken = DigitalaxGarment.load(event.params.tokenIds[i].toString());
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
        let garmentToken = DigitalaxGarment.load(event.params.tokenIds[i].toString());
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