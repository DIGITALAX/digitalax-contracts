import {
  Bytes,
  ipfs,
  json,
  JSONValueKind,
  log,
  store,
} from "@graphprotocol/graph-ts/index";

import {
  CollectionGroupAdded,
  CollectionGroupRemoved,
  CollectionGroupUpdated,
  DesignerGroupAdded,
  DesignerGroupRemoved,
  DeveloperGroupRemoved,
} from "../generated/DigitalaxCC0Index/DigitalaxCC0Index";

import {
  DigitalaxResident,
  DigitalaxCC0CollectionGroup,
  DigitalaxDeveloper,
  // DigitalaxGarmentV2Auction,
  DigitalaxCC0NFTCollection,
} from "../generated/schema";
import { loadOrCreateDigitalaxResident } from "./factory/DigitalaxResident.factory";
// import { loadOrCreateDigitalaxDeveloper } from "./factory/DigitalaxDeveloper.factory";

export function handleCollectionGroupAdded(event: CollectionGroupAdded): void {
  let collectionGroupId = event.params.sid;
  let collectionGroup = new DigitalaxCC0CollectionGroup(
    collectionGroupId.toString()
  );

  let auctions = new Array<string>();
  let paramAuctions = event.params.auctions;
  for (let i = 0; i < paramAuctions.length; i++) {
    let auctionId = paramAuctions[i];
    auctions.push(auctionId.toString());
  }

  let collections = new Array<string>();
  let paramCollections = event.params.collections;
  log.info("this is collection ids length {}", ["test"]);
  for (let i = 0; i < paramCollections.length; i++) {
    let collectionId = paramCollections[i];
    collections.push(collectionId.toString());
  }

  let digiBudngle = event.params.digiBundleCollection.toString();

  // collectionGroup.auctions = auctions;
  collectionGroup.collections = collections;
  // collectionGroup.digiBundle = digiBudngle;

  collectionGroup.save();
}

export function handleCollectionGroupRemoved(
  event: CollectionGroupRemoved
): void {
  store.remove("DigitalaxCC0CollectionGroup", event.params.sid.toString());
}

export function handleCollectionGroupUpdated(
  event: CollectionGroupUpdated
): void {
  let collectionGroupId = event.params.sid;
  let collectionGroup = DigitalaxCC0CollectionGroup.load(
    collectionGroupId.toString()
  );
  if (collectionGroup) {
    // let auctions = new Array<string>();
    // let paramAuctions = event.params.auctions;
    // for (let i = 0; i < paramAuctions.length; i += 1) {
    //   let auctionId = paramAuctions[i];
    //   auctions.push(auctionId.toString());
    // }

    let collections = new Array<string>();
    let paramCollections = event.params.collections;
    for (let i = 0; i < paramCollections.length; i += 1) {
      let collectionId = paramCollections[i];
      collections.push(collectionId.toString());
    }

    let digiBudngle = event.params.digiBundleCollection.toString();

    // collectionGroup.auctions = auctions;
    collectionGroup.collections = collections;
    // collectionGroup.digiBundle = digiBudngle;

    collectionGroup.save();
  }
}

export function handleDesignerGroupRemoved(event: DesignerGroupRemoved): void {
  let designer = DigitalaxResident.load(event.params._address.toHexString());
  if (designer) {
    let collectionIds = designer.collections;
    // let auctionIds = designer.auctions;
    for (let i = 0; i < collectionIds.length; i += 1) {
      let collectionId = collectionIds[i];
      let collection = DigitalaxCC0NFTCollection.load(collectionId.toString());
      if (collection) {
        collection.resident = null;
        collection.save();
      }
    }

    // for (let i = 0; i < auctionIds.length; i += 1) {
    //   let auctionId = auctionIds[i];
    //   let auction = DigitalaxGarmentV2Auction.load(auctionId.toString());
    //   if (auction) {
    //     auction.designer = null;
    //     auction.save();
    //   }
    // }
    store.remove("DigitalaxResident", event.params._address.toHexString());
  }
}

export function handleDesignerGroupAdded(event: DesignerGroupAdded): void {
  let resident = loadOrCreateDigitalaxResident(event.params._address);
  let collectionIds = event.params.collectionIds;
  // let auctionIds = event.params.auctionIds;
  let collections = new Array<string>();
  // let auctions = new Array<string>();
  for (let i = 0; i < collectionIds.length; i += 1) {
    let collectionId = collectionIds[i];
    let collection = DigitalaxCC0NFTCollection.load(collectionId.toString());
    if (collection) {
      collection.resident = resident.id;
      collection.save();
      collections.push(collection.id);
    }
  }
  // for (let i = 0; i < auctionIds.length; i += 1) {
  //   let auctionId = auctionIds[i];
  //   let auction = DigitalaxGarmentV2Auction.load(auctionId.toString());
  //   if (auction) {
  //     auction.resident = resident.id;
  //     auction.save();
  //     auctions.push(auction.id);
  //   }
  // }
  resident.collections = collections;
  // resident.auctions = auctions;

  let residentHash = event.params.uri;
  let residentBytes = ipfs.cat(residentHash);
  if (residentBytes) {
    let data = json.try_fromBytes(residentBytes as Bytes);
    if (data.isOk) {
      if (data.value.kind == JSONValueKind.OBJECT) {
        let res = data.value.toObject();
        if (res.get("Resident ID")) {
          if (res.get("Resident ID")!.kind == JSONValueKind.STRING) {
            resident.name = res.get("Resident ID")!.toString();
          }
        }
        if (res.get("description")) {
          if (res.get("description")!.kind == JSONValueKind.STRING) {
            resident.description = res.get("description")!.toString();
          }
        }
        if (res.get("image_url")) {
          if (res.get("image_url")!.kind == JSONValueKind.STRING) {
            resident.image = res.get("image_url")!.toString();
          }
        }
        if (res.get("instagram")) {
          if (res.get("instagram")!.kind == JSONValueKind.STRING) {
            resident.instagram = res.get("instagram")!.toString();
          }
        }
        if (res.get("twitter")) {
          if (res.get("twitter")!.kind == JSONValueKind.STRING) {
            resident.twitter = res.get("twitter")!.toString();
          }
        }
      }
    }
  }
  resident.save();
}

export function handleDeveloperGroupRemoved(
  event: DeveloperGroupRemoved
): void {
  let developer = DigitalaxDeveloper.load(event.params._address.toHexString());
  if (developer) {
    // let collectionIds = developer.collections;
    // let auctionIds = developer.auctions;
    // for (let i = 0; i < collectionIds.length; i += 1) {
    //   let collectionId = collectionIds[i];
    //   let collection = DigitalaxCC0NFTCollection.load(collectionId);
    //   if (collection) {
    //     collection.developer = null;
    //     collection.save();
    //   }
    // }

    // for (let i = 0; i < auctionIds.length; i += 1) {
    //   let auctionId = auctionIds[i];
    //   let auction = DigitalaxGarmentV2Auction.load(auctionId);
    //   if (auction) {
    //     auction.developer = null;
    //     auction.save();
    //   }
    // }
    store.remove("DigitalaxDeveloper", event.params._address.toHexString());
  }
}

export function handleDeveloperGroupAdded(event: DesignerGroupAdded): void {
  // let developer = loadOrCreateDigitalaxDeveloper(event.params._address);
  let auctions = new Array<string>();
  let collections = new Array<string>();
  let collectionIds = event.params.collectionIds;
  let auctionIds = event.params.auctionIds;
  // for (let i = 0; i < collectionIds.length; i += 1) {
  //   let collectionId = collectionIds[i];
  //   let collection = DigitalaxCC0NFTCollection.load(collectionId.toString());
  //   if (collection) {
  //     collection.developer = developer.id;
  //     collection.save();
  //     collections.push(developer.id);
  //   }
  // }

  // for (let i = 0; i < auctionIds.length; i += 1) {
  //   let auctionId = auctionIds[i];
  //   let auction = DigitalaxGarmentV2Auction.load(auctionId.toString());
  //   if (auction) {
  //     auction.developer = developer.id;
  //     auction.save();
  //     collections.push(developer.id);
  //   }
  // }
  // developer.collections = collections;
  // developer.auctions = auctions;

  // let developerHash = event.params.uri;
  // let developerBytes = ipfs.cat(developerHash);
  // if (developerBytes) {
  //   let data = json.try_fromBytes(developerBytes as Bytes);
  //   if (data.isOk) {
  //     if (data.value.kind == JSONValueKind.OBJECT) {
  //       let res = data.value.toObject();
  //       if (res.get("name")!.kind == JSONValueKind.STRING) {
  //         developer.name = res.get("name")!.toString();
  //       }
  //       if (res.get("description")!.kind == JSONValueKind.STRING) {
  //         developer.description = res.get("description")!.toString();
  //       }
  //       if (res.get("image_url")!.kind == JSONValueKind.STRING) {
  //         developer.image = res.get("image_url").toString();
  //       }
  //     }
  //   }
  // }
  // developer.save();
}
