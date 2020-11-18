import {BigInt, log} from "@graphprotocol/graph-ts/index";

import {
    ChildCreated,
    ChildrenCreated,
    DigitalaxMaterials as DigitalaxMaterialsContract,
    TransferBatch,
    TransferSingle
} from "../generated/DigitalaxMaterials/DigitalaxMaterials";

import {DigitalaxMaterial} from "../generated/schema";

import {ZERO, ZERO_ADDRESS} from "./constants";
import {loadOrCreateDigitalaxCollector} from "./factory/DigitalaxCollector.factory";
import {isChildInList} from "./ArrayHelpers";
import {loadOrCreateDigitalaxChildOwner} from "./factory/DigitalaxChildOwner.factory";

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
    for (let i = 0; i < event.params.childIds.length; i++) {
        let childId: BigInt = childIds.pop();
        let strand = new DigitalaxMaterial(childId.toString());
        strand.tokenUri = contract.uri(childId);
        strand.totalSupply = BigInt.fromI32(0);
        strand.save();
    }
}

// Handle a single transfer of either adding or removing children
export function handleSingleTransfer(event: TransferSingle): void {
    log.info("handle single transfer of child ID {} and balance {}",
        [
            event.params.id.toString(),
            event.params.value.toString()
        ]
    );

    // Ensure total supply is correct in cases of birthing or burning
    let contract: DigitalaxMaterialsContract = DigitalaxMaterialsContract.bind(event.address);
    let childId: BigInt = event.params.id;
    let childToken: DigitalaxMaterial | null = DigitalaxMaterial.load(childId.toString());
    childToken.totalSupply = contract.tokenTotalSupply(childId);
    childToken.save();

    // Update "from" balances
    if (!event.params.from.equals(ZERO_ADDRESS)) {
        let fromCollector = loadOrCreateDigitalaxCollector(event.params.from);

        let childrenOwned = fromCollector.childrenOwned;
        let totalChildOwned = childrenOwned.length;
        let updatedChildren = new Array<string>();

        // Iterate all children currently owned
        for (let j: number = 0; j < totalChildOwned; j++) {
            let childTokenId = childrenOwned[j as i32];

            // For each ID being transferred
            let id: BigInt = event.params.id;
            let amount: BigInt = event.params.value;

            // Expected child owner ID
            let compositeId = event.params.from.toHexString() + '-' + id.toString()

            // Check that we have an entry for the child
            if (childTokenId.toString() === compositeId) {

                // Load collector and reduce balance
                let child = loadOrCreateDigitalaxChildOwner(event, event.params.from, id);
                child.amount = child.amount.minus(amount);
                child.save();

                // keep track of child if balance positive
                if (!child.amount.equals(ZERO)) {
                    updatedChildren.push(childTokenId);
                }
            }
        }

        // assign the newly owned children
        fromCollector.childrenOwned = updatedChildren;
        fromCollector.save();
    }

    // Update "to" balances
    if (!event.params.to.equals(ZERO_ADDRESS)) {
        let toCollector = loadOrCreateDigitalaxCollector(event.params.to);
        let childrenOwned = toCollector.childrenOwned; // 0x123-123
        let totalChildOwned = childrenOwned.length;
        let updatedChildren = new Array<string>();

        let id: BigInt = event.params.id;
        let amount: BigInt = event.params.value;

        // Expected child owner ID
        let compositeId = event.params.to.toHexString() + '-' + id.toString()

        // If we already have a child allocated to the collector
        if (isChildInList(compositeId, childrenOwned)) {

            // Iterate all children currently owned
            for (let k: number = 0; k < totalChildOwned; k++) {

                // Find the matching child
                let currentChildId = childrenOwned[k as i32];
                if (currentChildId.toString() === compositeId) {

                    // Load collector and add to its balance
                    let child = loadOrCreateDigitalaxChildOwner(event, event.params.to, id);
                    child.amount = child.amount.plus(amount);
                    child.save();

                    updatedChildren.push(child.id);
                }
            }
        } else {
            // If we dont already own it, load and increment
            let child = loadOrCreateDigitalaxChildOwner(event, event.params.to, id);
            child.amount = child.amount.plus(amount);
            child.save();

            // keep track of child
            updatedChildren.push(child.id);
        }

        // assign the newly owned children
        toCollector.childrenOwned = updatedChildren;
        toCollector.save();
    }
}

export function handleBatchTransfer(event: TransferBatch): void {
    log.info("handleBatchTransfer With Batch Size {}", [
        BigInt.fromI32(event.params.values.length).toString()
    ]);

    let contract: DigitalaxMaterialsContract = DigitalaxMaterialsContract.bind(event.address);

    let allValuesInBatch = event.params.values;
    let allIdsInBatch = event.params.ids;
    let totalIdsTransferred = allIdsInBatch.length;

    // Model total supply - Ensure total supply is correct in cases of birthing or burning
    for (let i: number = 0; i < totalIdsTransferred; i++) {
        let childId: BigInt = allIdsInBatch[i as i32];
        let child: DigitalaxMaterial | null = DigitalaxMaterial.load(childId.toString());
        child.totalSupply = contract.tokenTotalSupply(childId);
        child.save();
    }

    // Update "from" balances
    if (!event.params.from.equals(ZERO_ADDRESS)) {
        let fromCollector = loadOrCreateDigitalaxCollector(event.params.from);

        let childrenOwned = fromCollector.childrenOwned;
        let totalChildrenOwned = childrenOwned.length;
        let updatedChildren = new Array<string>();

        // Iterate all children currently owned
        for (let j: number = 0; j < totalChildrenOwned; j++) {
            let childTokenId = childrenOwned[j as i32];

            // For each ID being transferred
            for (let k: number = 0; k < totalIdsTransferred; k++) {
                let id: BigInt = allIdsInBatch[k as i32];
                let amount: BigInt = allValuesInBatch[k as i32];

                // Expected child owner ID
                let compositeId = event.params.from.toHexString() + '-' + id.toString()

                // Check that we have an entry for the child
                if (childTokenId === compositeId) {

                    // Load collector and reduce balance
                    let child = loadOrCreateDigitalaxChildOwner(event, event.params.from, id);
                    child.amount = child.amount.minus(amount);
                    child.save();

                    // keep track of child if balance positive
                    if (!child.amount.equals(ZERO)) {
                        updatedChildren.push(childTokenId);
                    }
                }
            }
        }

        // assign the newly owned children
        fromCollector.childrenOwned = updatedChildren;
        fromCollector.save();
    }

    // Update "to" balances
    if (!event.params.to.equals(ZERO_ADDRESS)) {
        let toCollector = loadOrCreateDigitalaxCollector(event.params.to);
        let childrenOwned = toCollector.childrenOwned; // 0x123-123
        let totalChildOwned = childrenOwned.length;
        let updatedChildren = new Array<string>();

        // for each ID being transferred
        for (let j: number = 0; j < totalIdsTransferred; j++) {
            let id: BigInt = allIdsInBatch[j as i32];
            let amount: BigInt = allValuesInBatch[j as i32];

            // Expected child owner ID
            let compositeId = event.params.to.toHexString() + '-' + id.toString()

            // If we already have a child allocated to the collector
            if (isChildInList(compositeId, childrenOwned)) {

                // Iterate all children currently owned
                for (let k: number = 0; k < totalChildOwned; k++) {

                    // Find the matching child
                    let currentChildId = childrenOwned[k as i32];
                    if (currentChildId === compositeId) {

                        // Load collector and add to its balance
                        let child = loadOrCreateDigitalaxChildOwner(event, event.params.to, id);
                        child.amount = child.amount.plus(amount);
                        child.save();

                        updatedChildren.push(child.id);
                    }
                }
            } else {
                // If we dont already own it, load and increment
                let child = loadOrCreateDigitalaxChildOwner(event, event.params.to, id);
                child.amount = child.amount.plus(amount);
                child.save();

                // keep track of child
                updatedChildren.push(child.id);
            }
        }

        // assign the newly owned children
        toCollector.childrenOwned = updatedChildren;
        toCollector.save();
    }
}
