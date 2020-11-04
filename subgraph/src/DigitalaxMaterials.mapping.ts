import {log, BigInt, Address} from "@graphprotocol/graph-ts/index";

import {
    StrandCreated,
    TransferBatch,
    DigitalaxMaterials as DigitalaxMaterialsContract
} from "../generated/DigitalaxMaterials/DigitalaxMaterials";

import {
    DigitalaxMaterials
} from "../generated/schema";

export function handleStrandCreated(event: StrandCreated): void {
    log.info("handleStrandCreated @ Strand ID {}", [event.params.strandId.toString()]);
    let contract = DigitalaxMaterialsContract.bind(event.address);

    let strand = new DigitalaxMaterials(event.params.strandId.toString());
    strand.tokenUri = contract.uri(event.params.strandId);
    strand.totalSupply = BigInt.fromI32(0);
    strand.save();
}

export function handleBatchTransfer(event: TransferBatch): void {
    log.info("handleBatchTransfer With Batch Size {}", ['1']);
    let strandIds = event.params.ids;
    for(let i = 0; i < strandIds.length; i++) {
        let strandId = strandIds.pop();

        let strand = DigitalaxMaterials.load(strandId.toString());

        let amount = event.params.values.pop();
        strand.totalSupply = strand.totalSupply + amount;
        strand.save();
    }
}
