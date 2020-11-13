import {log, BigInt, Address} from "@graphprotocol/graph-ts/index";

import {
    ChildCreated,
    ChildrenCreated,
    TransferBatch,
    DigitalaxMaterials as DigitalaxMaterialsContract
} from "../generated/DigitalaxMaterials/DigitalaxMaterials";

import {
    DigitalaxMaterial
} from "../generated/schema";

export function handleChildCreated(event: ChildCreated): void {
    log.info("handleChildCreated @ Child ID {}", [event.params.childId.toString()]);
    let contract = DigitalaxMaterialsContract.bind(event.address);

    let strand = new DigitalaxMaterial(event.params.childId.toString());
    strand.tokenUri = contract.uri(event.params.childId);
    strand.totalSupply = BigInt.fromI32(0);
    strand.save();
}

export function handleChildrenCreated(event: ChildrenCreated): void {
    log.info("handleChildrenCreated", []);
    let contract = DigitalaxMaterialsContract.bind(event.address);

    let childIds = event.params.childIds;
    for(let i = 0; i < event.params.childIds.length; i++) {
        let childId: BigInt = childIds.pop();
        let strand = new DigitalaxMaterial(childId.toString());
        strand.tokenUri = contract.uri(childId);
        strand.totalSupply = BigInt.fromI32(0);
        strand.save();
    }
}

// TODO add single transfer hook and handle adding/removing strands

export function handleBatchTransfer(event: TransferBatch): void {
    log.info("handleBatchTransfer With Batch Size {} @ Hash {}", [
        BigInt.fromI32(event.params.values.length).toString(),
        event.transaction.hash.toHexString()
    ]);

    let contract: DigitalaxMaterialsContract = DigitalaxMaterialsContract.bind(event.address);
    let strandIds: Array<BigInt> = event.params.ids;
    for(let i = 0; i < event.params.values.length; i++) {
        let strandId: BigInt = strandIds.pop();

        let strand: DigitalaxMaterial | null = DigitalaxMaterial.load(strandId.toString());
        strand.totalSupply = contract.tokenTotalSupply(strandId);
        strand.save();
    }
}
