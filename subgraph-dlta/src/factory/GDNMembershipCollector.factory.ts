import {GDNMembershipCollector} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreateGDNMembershipCollector(collector: Address): GDNMembershipCollector {
    let gdnMembershipCollector: GDNMembershipCollector | null = GDNMembershipCollector.load(collector.toHexString());
    if (gdnMembershipCollector == null) {
        gdnMembershipCollector = new GDNMembershipCollector(collector.toHexString())
        gdnMembershipCollector.parentsOwned = new Array<string>();
    }
    gdnMembershipCollector.save()
    return gdnMembershipCollector as GDNMembershipCollector;
}
