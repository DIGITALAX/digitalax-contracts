import {DigitalaxGarmentDesigner} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";

export function loadOrCreateGarmentDesigner(tokenId: string): DigitalaxGarmentDesigner {
    // TODO: We need to re-architecture the current models.
    // We are mapping designer ids in force way now.
    let garmentDesignerId = tokenId;
    if (tokenId == '11') {
        garmentDesignerId = '10';
    } else if (tokenId == '14') {
        garmentDesignerId = '8';
    } else if (tokenId == '16') {
        garmentDesignerId = '15';
    } else if (tokenId == '17') {
        garmentDesignerId = '1';
    } else if (tokenId == '19') {
        garmentDesignerId = '2';
    } else if (tokenId == '26') {
        garmentDesignerId = '18';
    } else if (tokenId == '39') {
        garmentDesignerId = '7';
    } else if (tokenId == '40') {
        garmentDesignerId = '25';
    } else if (tokenId == '41') {
        garmentDesignerId = '2';
    } else if (tokenId == '42') {
        garmentDesignerId = '12';
    }

    let garmentDesigner = DigitalaxGarmentDesigner.load(garmentDesignerId);
    if (garmentDesigner == null) {
        garmentDesigner = new DigitalaxGarmentDesigner(garmentDesignerId);
        garmentDesigner.garments = new Array<string>();
        garmentDesigner.listings = new Array<string>();
    }
    garmentDesigner.save()
    return garmentDesigner as DigitalaxGarmentDesigner
}
