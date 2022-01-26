import {DigitalaxModelDesigner} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxModelDesigner(address: Address): DigitalaxModelDesigner {
    let digitalaxDesigner: DigitalaxModelDesigner | null = DigitalaxModelDesigner.load(address.toHexString());
    if (digitalaxDesigner == null) {
        digitalaxDesigner = new DigitalaxModelDesigner(address.toHexString())
        digitalaxDesigner.name = '';
        digitalaxDesigner.description = '';
        digitalaxDesigner.image = '';
        digitalaxDesigner.collections = new Array<string>();
    }
    digitalaxDesigner.save()
    return digitalaxDesigner as DigitalaxModelDesigner;
}
