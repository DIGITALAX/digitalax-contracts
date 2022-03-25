
import { ethereum } from "@graphprotocol/graph-ts";
import { DigitalaxAccessControlsHistory } from "../../generated/schema";

export function createAccessControlsHistory(event: ethereum.Event, eventName: string): void {
    let entity = new DigitalaxAccessControlsHistory(event.logIndex.toString());
    entity.transactionHash = event.transaction.hash;
    entity.eventName = eventName;
    entity.timestamp = event.block.timestamp;
    entity.beneficiary = event.parameters[0].value.toAddress();
    entity.caller = event.parameters[1].value.toAddress();
    entity.save();
}
