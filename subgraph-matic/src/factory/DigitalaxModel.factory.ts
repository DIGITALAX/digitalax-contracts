import {DigitalaxModel} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxModel(address: Address): DigitalaxModel {
    let digitalaxModel: DigitalaxModel | null = DigitalaxModel.load(address.toHexString());
    if (digitalaxModel == null) {
        digitalaxModel = new DigitalaxModel(address.toHexString())
        digitalaxModel.name = '';
        digitalaxModel.description = '';
        digitalaxModel.image = '';
        digitalaxModel.collections = new Array<string>();
    }
    digitalaxModel.save()
    return digitalaxModel as DigitalaxModel;
}
