import {log, BigInt, Address} from "@graphprotocol/graph-ts/index";

import {
    ChildCreated,
    ChildrenCreated,
    TransferBatch,
    TransferSingle,
    DigitalaxMaterials as DigitalaxMaterialsContract
} from "../generated/DigitalaxMaterials/DigitalaxMaterials";

import {
    DigitalaxMaterial
} from "../generated/schema";

import {ZERO_ADDRESS, DigitalaxGarmentNFTContractAddress, ZERO} from "./constants";
import {loadOrCreateDigitalaxCollector} from "./factory/DigitalaxCollector.factory";
import {isChildInList} from "./ArrayHelpers";

export function handleChildCreated(event: ChildCreated): void {
    // log.info("handleChildCreated @ Child ID {}", [event.params.childId.toString()]);
    let contract = DigitalaxMaterialsContract.bind(event.address);

    let strand = new DigitalaxMaterial(event.params.childId.toString());
    strand.tokenUri = contract.uri(event.params.childId);
    strand.totalSupply = BigInt.fromI32(0);
    strand.save();
}

export function handleChildrenCreated(event: ChildrenCreated): void {
    // log.info("handleChildrenCreated", []);
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
export function handleSingleTransfer(event: TransferSingle): void {
    // log.info("handle single transfer of child ID {} and balance {}",
    //     [
    //         event.params.id.toString(),
    //         event.params.value.toString()
    //     ]
    // );

    // Ensure total supply is correct in cases of birthing or burning
    let contract: DigitalaxMaterialsContract = DigitalaxMaterialsContract.bind(event.address);
    let strandId: BigInt = event.params.id;
    let strand: DigitalaxMaterial | null = DigitalaxMaterial.load(strandId.toString());
    strand.totalSupply = contract.tokenTotalSupply(strandId);
    strand.save();

    // If `from` is not zero or the garment NFT, then update the collector that triggered the transfer
    if (!event.params.from.equals(ZERO_ADDRESS)
        ) {
        let fromCollector = loadOrCreateDigitalaxCollector(event.params.from);
        let childrenOwned = fromCollector.childrenOwned;
        childrenOwned = childrenOwned.filter((childId: string) => childId !== event.params.id.toString());
        fromCollector.childrenOwned = childrenOwned;
        fromCollector.save();
    }

    // If `to` is burn or garment NFT address, we can stop here otherwise add the strand to the `to` address
    if (!event.params.to.equals(ZERO_ADDRESS)
        ) {
        let toCollector = loadOrCreateDigitalaxCollector(event.params.to);
        let childrenOwned = toCollector.childrenOwned;
        childrenOwned.push(strandId.toString());
        toCollector.childrenOwned = childrenOwned;
        toCollector.save();
    }
}

export function handleBatchTransfer(event: TransferBatch): void {
    log.info("handleBatchTransfer With Batch Size {}", [
        BigInt.fromI32(event.params.values.length).toString()
    ]);

    let contract: DigitalaxMaterialsContract = DigitalaxMaterialsContract.bind(event.address);
    let strandIds: Array<BigInt> = event.params.ids;
    for(let i = 0; i < event.params.values.length; i++) {
        let strandId: BigInt = strandIds.pop();

        // Ensure total supply is correct in cases of birthing or burning
        let strand: DigitalaxMaterial | null = DigitalaxMaterial.load(strandId.toString());
        strand.totalSupply = contract.tokenTotalSupply(strandId);
        strand.save();

        // If `from` is not zero, then update the collector that triggered the transfer
        if (!event.params.from.equals(ZERO_ADDRESS)
            || !event.params.from.equals(Address.fromString(DigitalaxGarmentNFTContractAddress))) {

            let fromCollector = loadOrCreateDigitalaxCollector(event.params.from);
            let childrenOwned = fromCollector.childrenOwned;

            let updatedChildren = new Array<string>();
            for(let j = 0; j < childrenOwned.length; j++) {
                let strand = childrenOwned.pop();
                if (!isChildInList(strand.toString(), event.params.ids)) {
                    updatedChildren.push(strand);
                }
            }

            fromCollector.childrenOwned = updatedChildren;
            fromCollector.save();
        }

        // If `to` is burn or garment NFT address, we can stop here otherwise add the strand to the `to` address
        if (!event.params.to.equals(ZERO_ADDRESS)
            || !event.params.to.equals(Address.fromString(DigitalaxGarmentNFTContractAddress))) {
            let toCollector = loadOrCreateDigitalaxCollector(event.params.to);
            let childrenOwned = toCollector.childrenOwned;
            childrenOwned.push(strandId.toString());
            toCollector.childrenOwned = childrenOwned;
            toCollector.save();
        }
    }
}
