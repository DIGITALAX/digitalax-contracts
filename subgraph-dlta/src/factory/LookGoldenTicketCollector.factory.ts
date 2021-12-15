import {LookGoldenTicketCollector} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateLookGoldenTicketCollector(collector: Address): LookGoldenTicketCollector {
    let lookGoldenTicketCollector: LookGoldenTicketCollector | null = LookGoldenTicketCollector.load(collector.toHexString());
    if (lookGoldenTicketCollector == null) {
        lookGoldenTicketCollector = new LookGoldenTicketCollector(collector.toHexString())
        lookGoldenTicketCollector.parentsOwned = new Array<string>();
    }
    lookGoldenTicketCollector.save()
    return lookGoldenTicketCollector as LookGoldenTicketCollector;
}
