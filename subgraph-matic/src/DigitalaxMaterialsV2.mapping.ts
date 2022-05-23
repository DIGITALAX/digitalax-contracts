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
  DigitalaxMaterialsV2 as DigitalaxMaterialsV2Contract,
  TransferBatch,
  TransferSingle,
} from "../generated/DigitalaxMaterialsV2/DigitalaxMaterialsV2";

import { DigitalaxMaterialV2, GarmentAttribute } from "../generated/schema";

import { ZERO, ZERO_ADDRESS } from "./constants";
import { loadOrCreateDigitalaxCollectorV2 } from "./factory/DigitalaxCollectorV2.factory";
import { isChildInList } from "./ArrayHelpers";
import { loadOrCreateDigitalaxChildV2Owner } from "./factory/DigitalaxChildV2Owner.factory";

export function handleChildCreated(event: ChildCreated): void {
  log.info("handleChildCreated @ Child ID {}", [
    event.params.childId.toString(),
  ]);
  let contract = DigitalaxMaterialsV2Contract.bind(event.address);

  let strand = new DigitalaxMaterialV2(event.params.childId.toString());
  strand.tokenUri = contract.uri(event.params.childId);

  strand.name = "";
  strand.image = "";
  strand.description = "";
  strand.animation = "";
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
            if (res.get("image_url")) {
                if (res.get("image_url")!.kind == JSONValueKind.STRING) {
                  strand.image = res.get("image_url")!.toString();
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
            if (res.get("Designer ID")) {
              if (res.get("Designer ID")!.kind == JSONValueKind.STRING) {
                strand.name = res.get("Designer ID")!.toString();
              }
            }
            if (res.get("Designer_ID")) {
              if (res.get("Designer_ID")!.kind == JSONValueKind.STRING) {
                strand.name = res.get("Designer_ID")!.toString();
              }
            }
            if (res.get("name")) {
              if (res.get("name")!.kind == JSONValueKind.STRING) {
                strand.name = res.get("name")!.toString();
              }
            }
            if (res.get("description")!.kind == JSONValueKind.STRING) {
              strand.description = res.get("description")!.toString();
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
            if(res.get("attributes")) {
              if (res.get("attributes")!.kind == JSONValueKind.ARRAY) {
                let attributes = res.get("attributes")!.toArray();
                for (let i = 0; i < attributes.length; i += 1) {
                  if (attributes[i].kind == JSONValueKind.OBJECT) {
                    let attribute = attributes[i].toObject();
                    log.info("debugging attribute{}", [attribute.get("trait_type")!.toString()]);
                    let garmentAttribute = new GarmentAttribute(
                        "materialv2-" + strand.id + i.toString()
                    );
                    if (attribute.get("trait_type")) {
                      if (attribute.get("trait_type")!.kind == JSONValueKind.STRING) {
                        if (attribute.get("trait_type")!.toString()) {
                          garmentAttribute.type = attribute
                              .get("trait_type")!
                              .toString();
                        }
                      }
                    }
                    if (attribute.get("value")) {
                      if (attribute.get("value")!.kind == JSONValueKind.STRING) {
                        garmentAttribute.value = attribute.get("value")!.toString();
                      }
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
  let contract = DigitalaxMaterialsV2Contract.bind(event.address);

  let childIds = event.params.childIds;
  for (let i = 0; i < event.params.childIds.length; i++) {
    let childId = childIds[i];
    let strand = new DigitalaxMaterialV2(childId.toString());

    strand.tokenUri = contract.uri(childId);

    strand.animation = "";
    strand.name = "";
    strand.description = "";
    strand.image = "";
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
              if (res.get("image_url")) {
                if (res.get("image_url")!.kind == JSONValueKind.STRING) {
                  strand.image = res.get("image_url")!.toString();
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
             if (res.get("Designer ID")) {
              if (res.get("Designer ID")!.kind == JSONValueKind.STRING) {
                strand.name = res.get("Designer ID")!.toString();
              }
            }
              if (res.get("description")!.kind == JSONValueKind.STRING) {
                strand.description = res.get("description")!.toString();
              }
              if (res.get("external_url")) {
                if (res.get("external_url")!.kind == JSONValueKind.STRING) {
                  strand.external = res.get("external_url")!.toString();
                }
              }
              if (res.get("attributes")!.kind == JSONValueKind.ARRAY) {
                let attributes = res.get("attributes")!.toArray();
                for (let i = 0; i < attributes.length; i += 1) {
                  if (attributes[i].kind == JSONValueKind.OBJECT) {
                    let attribute = attributes[i].toObject();
                    let garmentAttribute = new GarmentAttribute(
                      "materialv2-" + strand.id + i.toString()
                    );

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
  let contract = DigitalaxMaterialsV2Contract.bind(
    event.address
  );

  let childId = event.params.id;
  let childToken = DigitalaxMaterialV2.load(
    childId.toString()
  );

  if(childToken) {
    childToken.totalSupply = contract.tokenTotalSupply(childId);
    childToken.save();
  }


 // Update "from" balances
  if (!event.params.from.equals(ZERO_ADDRESS)) {
    let fromCollector = loadOrCreateDigitalaxCollectorV2(event.params.from);
      log.info("8 handle single transfer of child ID {} and balance {}", [
    event.params.id.toString(),
    event.params.value.toString(),
  ]);
    if(fromCollector) {
      let childrenOwned = fromCollector.childrenOwned;
      let totalChildOwned = childrenOwned.length;
      let updatedChildren = childrenOwned;

      // Iterate all children currently owned
      if(totalChildOwned > 0) {
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
            let child = loadOrCreateDigitalaxChildV2Owner(
                event,
                event.params.from,
                id
            );
            if (child) {
              child.amount = child.amount.minus(amount);
              child.save();
            }
            // keep track of child if balance positive
            if (child.amount.equals(ZERO)) {
              updatedChildren.splice(j, 1);
            }
          }
        }
      }

      // assign the newly owned children
      fromCollector.childrenOwned = updatedChildren;
      fromCollector.save();
    }
  }

  // Update "to" balances
  if (!event.params.to.equals(ZERO_ADDRESS)) {

    let toCollector = loadOrCreateDigitalaxCollectorV2(event.params.to);

     if(toCollector) {

      let childrenOwned = toCollector.childrenOwned; // 0x123-123
      let totalChildOwned = childrenOwned.length;
      let updatedChildren = toCollector.childrenOwned;

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

            let child = loadOrCreateDigitalaxChildV2Owner(
                event,
                event.params.to,
                id
            );

            // Load collector and add to its balance
            child.amount = child.amount.plus(amount);
            child.save();

            // TODO REANALYZE THIS LINE OF CODE
            // if(child && k < updatedChildren.length && updatedChildren[k] && child.id) {
            //   updatedChildren[k] = child.id;
            // }

          }
        }
      } else {
        // If we dont already own it, load and increment
        let child = loadOrCreateDigitalaxChildV2Owner(event, event.params.to, id);
        if(child) {

          child.amount = child.amount.plus(amount);
          child.save();

          // TODO REANALYZE THIS LINE OF CODE
          // // keep track of child
          // if(updatedChildren && updatedChildren.length > 0) {
          //   updatedChildren.push(child.id);
          // }
        }
      }

      // assign the newly owned children
       if(updatedChildren && updatedChildren.length > 0) {
         toCollector.childrenOwned = updatedChildren;
         toCollector.save();
       }
    }
  }
}

export function handleBatchTransfer(event: TransferBatch): void {
      log.info("2 handle batch transfer of child ID {} and balance {}", [
    "null", "null"
  ]);
  // log.info("handleBatchTransfer With Batch Size {}", [
  //   BigInt.fromI32(event.params.values.length).toString(),
  // ]);

  // let contract: DigitalaxMaterialsV2Contract = DigitalaxMaterialsV2Contract.bind(
  //   event.address
  // );

  // let allValuesInBatch = event.params.values;
  // let allIdsInBatch = event.params.ids;
  // let totalIdsTransferred = allIdsInBatch.length;

  // // Model total supply - Ensure total supply is correct in cases of birthing or burning
  // for (let i: number = 0; i < totalIdsTransferred; i++) {
  //   let childId: BigInt = allIdsInBatch[i as i32];
  //   let child: DigitalaxMaterialV2 | null = DigitalaxMaterialV2.load(
  //     childId.toString()
  //   );
  //   if (child) {
  //     child!.totalSupply = contract.tokenTotalSupply(childId);
  //     child.save();
  //   }
  // }

  // // Update "from" balances
  // if (!event.params.from.equals(ZERO_ADDRESS)) {
  //   let fromCollector = loadOrCreateDigitalaxCollectorV2(event.params.from);

  //   let childrenOwned = fromCollector.childrenOwned;
  //   let totalChildrenOwned = childrenOwned.length;
  //   let updatedChildren = childrenOwned;

  //   // Iterate all children currently owned
  //   for (let j: number = 0; j < totalChildrenOwned; j++) {
  //     let childTokenId = childrenOwned[j as i32];

  //     // For each ID being transferred
  //     for (let k: number = 0; k < totalIdsTransferred; k++) {
  //       let id: BigInt = allIdsInBatch[k as i32];
  //       let amount: BigInt = allValuesInBatch[k as i32];

  //       // Expected child owner ID
  //       let compositeId = event.params.from.toHexString() + "-" + id.toString();

  //       // Check that we have an entry for the child
  //       if (childTokenId == compositeId) {
  //         // Load collector and reduce balance
  //         let child = loadOrCreateDigitalaxChildV2Owner(
  //           event,
  //           event.params.from,
  //           id
  //         );
  //         child.amount = child.amount.minus(amount);
  //         child.save();

  //         // keep track of child if balance positive
  //         if (child.amount.equals(ZERO)) {
  //           updatedChildren.splice(j as i32, 1);
  //         }
  //       }
  //     }
  //   }

  //   // assign the newly owned children
  //   fromCollector.childrenOwned = updatedChildren;
  //   fromCollector.save();
  // }

  // // Update "to" balances
  // if (!event.params.to.equals(ZERO_ADDRESS)) {
  //   let toCollector = loadOrCreateDigitalaxCollectorV2(event.params.to);
  //   let childrenOwned = toCollector.childrenOwned; // 0x123-123
  //   let totalChildOwned = childrenOwned.length;
  //   let updatedChildren = childrenOwned;

  //   // for each ID being transferred
  //   for (let j: number = 0; j < totalIdsTransferred; j++) {
  //     let id: BigInt = allIdsInBatch[j as i32];
  //     let amount: BigInt = allValuesInBatch[j as i32];

  //     // Expected child owner ID
  //     let compositeId = event.params.to.toHexString() + "-" + id.toString();

  //     // If we already have a child allocated to the collector
  //     if (isChildInList(compositeId, childrenOwned)) {
  //       // Iterate all children currently owned
  //       for (let k: number = 0; k < totalChildOwned; k++) {
  //         // Find the matching child
  //         let currentChildId = childrenOwned[k as i32];
  //         if (currentChildId == compositeId) {
  //           // Load collector and add to its balance
  //           let child = loadOrCreateDigitalaxChildV2Owner(
  //             event,
  //             event.params.to,
  //             id
  //           );
  //           child.amount = child.amount.plus(amount);
  //           child.save();

  //           updatedChildren[k as i32] = child.id;
  //         }
  //       }
  //     } else {
  //       // If we dont already own it, load and increment
  //       let child = loadOrCreateDigitalaxChildV2Owner(
  //         event,
  //         event.params.to,
  //         id
  //       );
  //       child.amount = child.amount.plus(amount);
  //       child.save();

  //       // keep track of child
  //       updatedChildren.push(child.id);
  //     }
  //   }

  //   // assign the newly owned children
  //   toCollector.childrenOwned = updatedChildren;
  //   toCollector.save();
  // }
}
