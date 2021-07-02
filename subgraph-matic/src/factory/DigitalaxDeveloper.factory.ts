import {DigitalaxDeveloper} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxDeveloper(address: Address): DigitalaxDeveloper {
    let digitalaxDeveloper: DigitalaxDeveloper | null = DigitalaxDeveloper.load(address.toHexString());
    if (digitalaxDeveloper == null) {
        digitalaxDeveloper = new DigitalaxDeveloper(address.toHexString())
        digitalaxDeveloper.name = '';
        digitalaxDeveloper.description = '';
        digitalaxDeveloper.image = '';
        digitalaxDeveloper.auctions = new Array<string>();
        digitalaxDeveloper.collections = new Array<string>();
    }
    digitalaxDeveloper.save()
    return digitalaxDeveloper as DigitalaxDeveloper;
}
