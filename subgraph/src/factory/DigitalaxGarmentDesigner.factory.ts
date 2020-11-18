import {DigitalaxGarmentDesigner} from "../../generated/schema";

export function loadOrCreateGarmentDesigner(garmentDesignerId: string): DigitalaxGarmentDesigner {
    let garmentDesigner = DigitalaxGarmentDesigner.load(garmentDesignerId);
    if (garmentDesigner == null) {
        garmentDesigner = new DigitalaxGarmentDesigner(garmentDesignerId);
        garmentDesigner.garments = new Array<string>();
        garmentDesigner.listings = new Array<string>();
    }
    garmentDesigner.save()
    return garmentDesigner as DigitalaxGarmentDesigner
}
