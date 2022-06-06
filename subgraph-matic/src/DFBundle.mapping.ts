import {
  BigInt,
  Bytes,
  ipfs,
  json,
  JSONValueKind,
  log,
} from "@graphprotocol/graph-ts/index";

import {
  ChildCreated,
  ChildrenCreated,
  DFBundle as DFBundleContract,
  TransferBatch,
  TransferSingle,
} from "../generated/DFBundle/DFBundle";

import { DigitalaxBundle, GarmentAttribute } from "../generated/schema";

import { ZERO, ZERO_ADDRESS } from "./constants";
import { loadOrCreateDigitalaxSubscriptionCollector } from "./factory/DigitalaxSubscriptionCollector.factory";
import { isChildInList } from "./ArrayHelpers";
import { loadOrCreateDigitalaxBundleOwner } from "./factory/DigitalaxBundleOwner.factory";

export function handleChildCreated(event: ChildCreated): void {
  log.info("handleChildCreated @ Child ID {}", [
    event.params.childId.toString(),
  ]);
  let contract = DFBundleContract.bind(event.address);

  let strand = new DigitalaxBundle(event.params.childId.toString());
  strand.tokenUri = contract.uri(event.params.childId);

  strand.image = "";
  strand.animation = "";
  strand.name = "";
  strand.description = "";
  strand.external = "";
  strand.attributes = new Array<string>();

  if (strand.tokenUri) {
    if (strand.tokenUri.includes("ipfs/")) {
      let tokenHash = strand.tokenUri.split("ipfs/")[1];
      let tokenBytes = ipfs.cat(tokenHash);
      if (tokenBytes) {
        let data = json.try_fromBytes(tokenBytes as Bytes);
        if (data.isOk) {
          if (data.value.kind == JSONValueKind.OBJECT) {
            let res = data.value.toObject();
            if (res.get("image")) {
              if (res.get("image")!.kind == JSONValueKind.STRING) {
                strand.image = res.get("image")!.toString();
              }
            }
            if (res.get("Animation")){
            if (res.get("Animation")!.kind == JSONValueKind.STRING) {
              strand.animation = res.get("Animation")!.toString();
            }
              }
            if (res.get("animation_url")) {
              if (res.get("animation_url")!.kind == JSONValueKind.STRING) {
                strand.animation = res.get("animation_url")!.toString();
              }
            }
            if (res.get("name")) {
              if (res.get("name")!.kind == JSONValueKind.STRING) {
                strand.name = res.get("name")!.toString();
              }
            }
            if (res.get("description")) {
              if (res.get("description")!.kind == JSONValueKind.STRING) {
                strand.description = res.get("description")!.toString();
              }
            }
            if (res.get("external url")) {
                if (res.get("external url")!.kind == JSONValueKind.STRING) {
                  strand.external = res.get("external url")!.toString();
                }
              }
            if (res.get("external_url")) {
                if (res.get("external_url")!.kind == JSONValueKind.STRING) {
                  strand.external = res.get("external_url")!.toString();
                }
              }
            if (res.get("attributes")) {
              if (res.get("attributes")!.kind == JSONValueKind.ARRAY) {
                let attributes = res.get("attributes")!.toArray();
                for (let i = 0; i < attributes.length; i += 1) {
                  if (attributes[i].kind == JSONValueKind.OBJECT) {
                    let attribute = attributes[i].toObject();
                    let garmentAttribute = new GarmentAttribute(
                        "db-bundle-" + strand.id + i.toString()
                    );
                    // garmentAttribute.type = null;
                    // garmentAttribute.value = null;

                    if (
                        attribute.get("trait_type")!.kind == JSONValueKind.STRING
                    ) {
                      garmentAttribute.type = attribute
                          .get("trait_type")!
                          .toString();
                    }
                    if (attribute.get("value")!.kind == JSONValueKind.STRING) {
                      garmentAttribute.value = attribute.get("value")!.toString();
                    }
                    garmentAttribute.save();
                    let attrs = strand.attributes;
                    attrs.push(garmentAttribute.id);
                    strand.attributes = attrs;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  strand.totalSupply = BigInt.fromI32(0);
  strand.save();
}

export function handleChildrenCreated(event: ChildrenCreated): void {
  log.info("handleChildrenCreated", []);
  let contract = DFBundleContract.bind(event.address);

  let childIds = event.params.childIds;
  for (let i = 0; i < event.params.childIds.length; i++) {
    let childId: BigInt = childIds.pop();
    let strand = new DigitalaxBundle(childId.toString());
    strand.tokenUri = contract.uri(childId);

    strand.animation = "";
    strand.image = "";
    strand.name = "";
    strand.description = "";
    strand.external = "";
    strand.attributes = new Array<string>();

    if (strand.tokenUri) {
      if (strand.tokenUri.includes("ipfs/")) {
        let tokenHash = strand.tokenUri.split("ipfs/")[1];
        let tokenBytes = ipfs.cat(tokenHash);
        if (tokenBytes) {
          let data = json.try_fromBytes(tokenBytes as Bytes);
          if (data.isOk) {
            if (data.value.kind == JSONValueKind.OBJECT) {
              let res = data.value.toObject();
              if (res.get("image")){
                if (res.get("image")!.kind == JSONValueKind.STRING) {
                  strand.image = res.get("image")!.toString();
                }
              }
              if (res.get("Animation")) {
                if (res.get("Animation")!.kind == JSONValueKind.STRING) {
                  strand.animation = res.get("Animation")!.toString();
                }
              }
              if (res.get("animation_url")) {
                if (res.get("animation_url")!.kind == JSONValueKind.STRING) {
                  strand.animation = res.get("animation_url")!.toString();
                }
              }
              if (res.get("name")) {
                if (res.get("name")!.kind == JSONValueKind.STRING) {
                  strand.name = res.get("name")!.toString();
                }
              }
              if (res.get("description")) {
                if (res.get("description")!.kind == JSONValueKind.STRING) {
                  strand.description = res.get("description")!.toString();
                }
              }
              if (res.get("external url")) {
                if (res.get("external url")!.kind == JSONValueKind.STRING) {
                  strand.external = res.get("external url")!.toString();
                }
              }
              if (res.get("external_url")) {
                if (res.get("external_url")!.kind == JSONValueKind.STRING) {
                  strand.external = res.get("external_url")!.toString();
                }
              }
              if (res.get("attributes")) {
                if (res.get("attributes")!.kind == JSONValueKind.ARRAY) {
                  let attributes = res.get("attributes")!.toArray();
                  for (let i = 0; i < attributes.length; i += 1) {
                    if (attributes[i].kind == JSONValueKind.OBJECT) {
                      let attribute = attributes[i].toObject();
                      let garmentAttribute = new GarmentAttribute(
                          "db-bundle-" + strand.id + i.toString()
                      );
                      // garmentAttribute.type = null;
                      // garmentAttribute.value = null;

                      if (
                          attribute.get("trait_type")!.kind == JSONValueKind.STRING
                      ) {
                        garmentAttribute.type = attribute
                            .get("trait_type")!
                            .toString();
                      }
                      if (attribute.get("value")!.kind == JSONValueKind.STRING) {
                        garmentAttribute.value = attribute
                            .get("value")!
                            .toString();
                      }
                      garmentAttribute.save();
                      let attrs = strand.attributes;
                      attrs.push(garmentAttribute.id);
                      strand.attributes = attrs;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    strand.totalSupply = BigInt.fromI32(0);
    strand.save();
  }
}

// Handle a single transfer of either adding or removing children
export function handleSingleTransfer(event: TransferSingle): void {
  log.info("handle single transfer of child ID {} and balance {}", [
    event.params.id.toString(),
    event.params.value.toString(),
  ]);

  // Ensure total supply is correct in cases of birthing or burning
  let contract: DFBundleContract = DFBundleContract.bind(event.address);
  let childId = event.params.id;
  let childToken: DigitalaxBundle | null = DigitalaxBundle.load(
    childId.toString()
  );
  childToken!.totalSupply = contract.tokenTotalSupply(childId);
  childToken!.save();

  // Update "from" balances
  if (!event.params.from.equals(ZERO_ADDRESS)) {
    let fromCollector = loadOrCreateDigitalaxSubscriptionCollector(
      event.params.from
    );

    let childrenOwned = fromCollector.childrenOwned;
    let totalChildOwned = childrenOwned.length;
    let updatedChildren = new Array<string>();

    // Iterate all children currently owned
    for (let j = 0; j < totalChildOwned; j++) {
      let childTokenId = childrenOwned[j];

      // For each ID being transferred
      let id = event.params.id;
      let amount = event.params.value;

      // Expected child owner ID
      let compositeId = event.params.from.toHexString() + "-" + id.toString();

      // Check that we have an entry for the child
      if (childTokenId.toString() == compositeId) {
        // Load collector and reduce balance
        let child = loadOrCreateDigitalaxBundleOwner(
          event,
          event.params.from,
          id
        );
        child.amount = child.amount.minus(amount);
        child.save();

        // keep track of child if balance positive
        if (!child.amount.equals(ZERO)) {
          //Error in sync
          // updatedChildren.push(childTokenId);
        }
      }
    }

    // assign the newly owned children
    fromCollector.childrenOwned = updatedChildren;
    fromCollector.save();
  }

  // Update "to" balances
  if (!event.params.to.equals(ZERO_ADDRESS)) {
    let toCollector = loadOrCreateDigitalaxSubscriptionCollector(
      event.params.to
    );

    let updatedChildren = new Array<string>();
    let childrenOwned = toCollector.childrenOwned; // 0x123-123
    let totalChildOwned = childrenOwned.length;

    let id = event.params.id;
    let amount = event.params.value;

    // Expected child owner ID
    let compositeId = event.params.to.toHexString() + "-" + id.toString();

    // If we already have a child allocated to the collector
    if (isChildInList(compositeId, childrenOwned)) {
      // Iterate all children currently owned
      for (let k = 0; k < totalChildOwned; k++) {
        // Find the matching child
        let currentChildId = childrenOwned[k];
        if (currentChildId.toString() == compositeId) {
          // Load collector and add to its balance
          let child = loadOrCreateDigitalaxBundleOwner(
            event,
            event.params.to,
            id
          );
          child.amount = child.amount.plus(amount);
          child.save();

          //Error in sync
         // updatedChildren.push(child.id);
        }
      }
    } else {
      // If we dont already own it, load and increment
      let child = loadOrCreateDigitalaxBundleOwner(event, event.params.to, id);
      child.amount = child.amount.plus(amount);
      child.save();

      // keep track of child
      //Error in sync
    //  updatedChildren.push(child.id);
    }

    // assign the newly owned children
    toCollector.childrenOwned = updatedChildren;
    toCollector.save();
  }
}

export function handleBatchTransfer(event: TransferBatch): void {
  log.info("handleBatchTransfer With Batch Size {}", [
    BigInt.fromI32(event.params.values.length).toString(),
  ]);

  let contract: DFBundleContract = DFBundleContract.bind(event.address);

  let allValuesInBatch = event.params.values;
  let allIdsInBatch = event.params.ids;
  let totalIdsTransferred = allIdsInBatch.length;

  // Model total supply - Ensure total supply is correct in cases of birthing or burning
  for (let i = 0; i < totalIdsTransferred; i++) {
    let childId = allIdsInBatch[i];
    let child: DigitalaxBundle | null = DigitalaxBundle.load(
      childId.toString()
    );
    child!.totalSupply = contract.tokenTotalSupply(childId);
    child!.save();
  }

  // Update "from" balances
  if (!event.params.from.equals(ZERO_ADDRESS)) {
    let fromCollector = loadOrCreateDigitalaxSubscriptionCollector(
      event.params.from
    );

    let childrenOwned = fromCollector.childrenOwned;
    let totalChildrenOwned = childrenOwned.length;
    let updatedChildren = new Array<string>();

    // Iterate all children currently owned
    for (let j = 0; j < totalChildrenOwned; j++) {
      let childTokenId = childrenOwned[j];

      // For each ID being transferred
      for (let k = 0; k < totalIdsTransferred; k++) {
        let id = allIdsInBatch[k];
        let amount = allValuesInBatch[k];

        // Expected child owner ID
        let compositeId = event.params.from.toHexString() + "-" + id.toString();

        // Check that we have an entry for the child
        if (childTokenId == compositeId) {
          // Load collector and reduce balance
          let child = loadOrCreateDigitalaxBundleOwner(
            event,
            event.params.from,
            id
          );
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
    let toCollector = loadOrCreateDigitalaxSubscriptionCollector(
      event.params.to
    );
    let childrenOwned = toCollector.childrenOwned; // 0x123-123
    let totalChildOwned = childrenOwned.length;
    let updatedChildren = new Array<string>();

    // NOTE: THIS HAS BEEN COMMENTED OUT FOR NOW TO ALLOW FOR SUBGRAPH TO PASS WITH UPGRADE
    // for each ID being transferred
    // for (let j = 0; j < totalIdsTransferred; j++) {
    //   if(allIdsInBatch.length == allValuesInBatch.length)
    //     if (j < allIdsInBatch.length) {
    //       let id = allIdsInBatch[j];
    //       if (id) {
    //         let amount = allValuesInBatch[j];
    //         if (amount) {
    //
    //           // Expected child owner ID
    //           let compositeId = event.params.to.toHexString() + "-" + id.toString();
    //
    //           // If we already have a child allocated to the collector
    //           if (isChildInList(compositeId, childrenOwned)) {
    //             // Iterate all children currently owned
    //             if (childrenOwned.length > 0) {
    //               for (let k = 0; k < totalChildOwned; k++) {
    //                 // Find the matching child
    //                 log.info("entering here {}", [
    //                   '123',
    //                 ]);
    //
    //                 //   Removing this piece
    //                 if (childrenOwned[k]) {
    //                   let currentChildId = childrenOwned[k];
    //                   if (currentChildId == compositeId) {
    //                     // Load collector and add to its balance
    //                     let child = loadOrCreateDigitalaxBundleOwner(
    //                         event,
    //                         event.params.to,
    //                         id
    //                     );
    //                     if (child) {
    //                       if (child.id) {
    //                         if (child.amount) {
    //                           child.amount = child.amount.plus(amount);
    //                           child.save();
    //
    //                           // keep track of child
    //                           updatedChildren.push(child.id);
    //                         }
    //                       }
    //                     }
    //                   }
    //                 }
    //               }
    //             }
    //           } else {
    //             // Might remove this piece
    //             // If we dont already own it, load and increment
    //             let child = loadOrCreateDigitalaxBundleOwner(
    //                 event,
    //                 event.params.to,
    //                 id
    //             );
    //             if (child) {
    //               if (child.id) {
    //                 if (child.amount) {
    //                   child.amount = child.amount.plus(amount);
    //                   child.save();
    //
    //                   // keep track of child
    //                   updatedChildren.push(child.id);
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }

    // assign the newly owned children
    toCollector.childrenOwned = updatedChildren;
    toCollector.save();
  }
}
