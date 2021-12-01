import {DigitalaxGenesisV2OGHolder} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";

export function loadOrCreateDigitalaxGenesisV2OGHolder(tokenId: string): DigitalaxGenesisV2OGHolder {
    let DigitalaxGenesisV2DeveloperId = tokenId;
    let digitalaxGenesisV2OGHolder = DigitalaxGenesisV2OGHolder.load(DigitalaxGenesisV2DeveloperId);
    if (digitalaxGenesisV2OGHolder == null) {
        digitalaxGenesisV2OGHolder = new DigitalaxGenesisV2OGHolder(DigitalaxGenesisV2DeveloperId);
        digitalaxGenesisV2OGHolder.garments = new Array<string>();
    }
    digitalaxGenesisV2OGHolder.save()
    return digitalaxGenesisV2OGHolder as DigitalaxGenesisV2OGHolder
}
