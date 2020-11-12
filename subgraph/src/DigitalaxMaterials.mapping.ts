import {log, BigInt, Address} from "@graphprotocol/graph-ts/index";

import {
    ChildCreated,
    TransferBatch,
    DigitalaxMaterials as DigitalaxMaterialsContract
} from "../generated/DigitalaxMaterials/DigitalaxMaterials";

import {
    DigitalaxMaterial
} from "../generated/schema";

//todo: need a handle children created
export function handleChildCreated(event: ChildCreated): void {
    log.info("handleChildCreated @ Child ID {}", [event.params.childId.toString()]);
    let contract = DigitalaxMaterialsContract.bind(event.address);

    let strand = new DigitalaxMaterial(event.params.childId.toString());
    strand.tokenUri = contract.uri(event.params.childId);
    strand.totalSupply = BigInt.fromI32(0);
    strand.save();
}

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
