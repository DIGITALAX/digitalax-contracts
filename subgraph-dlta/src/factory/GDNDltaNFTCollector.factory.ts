import {GDNDltaNFTCollector} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateGDNDltaNFTCollector(collector: Address): GDNDltaNFTCollector {
    let gdnDltaNFTCollector: GDNDltaNFTCollector | null = GDNDltaNFTCollector.load(collector.toHexString());
    if (gdnDltaNFTCollector == null) {
        gdnDltaNFTCollector = new GDNDltaNFTCollector(collector.toHexString())
        gdnDltaNFTCollector.parentsOwned = new Array<string>();
    }
    gdnDltaNFTCollector.save()
    return gdnDltaNFTCollector as GDNDltaNFTCollector;
}
