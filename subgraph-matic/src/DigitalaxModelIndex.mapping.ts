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
  ModelGroupAdded,
  ModelGroupRemoved,
  DesignerGroupAdded,
  DesignerGroupRemoved,
} from "../generated/DigitalaxModelIndex/DigitalaxModelIndex";

import {
  DigitalaxModel,
  DigitalaxModelCollectionGroup,
  DigitalaxModelCollection,
  DigitalaxModelDesigner,
} from "../generated/schema";
import { loadOrCreateDigitalaxModel } from "./factory/DigitalaxModel.factory";
import { loadOrCreateDigitalaxModelDesigner } from "./factory/DigitalaxModelDesigner.factory";

export function handleCollectionGroupAdded(event: CollectionGroupAdded): void {
  let collectionGroupId = event.params.sid;
  let collectionGroup = new DigitalaxModelCollectionGroup(
    collectionGroupId.toString()
  );

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
  collectionGroup.digiBundle = digiBudngle;

  collectionGroup.save();
}

export function handleCollectionGroupRemoved(
  event: CollectionGroupRemoved
): void {
  store.remove("DigitalaxModelCollectionGroup", event.params.sid.toString());
}

export function handleCollectionGroupUpdated(
  event: CollectionGroupUpdated
): void {
  let collectionGroupId = event.params.sid;
  let collectionGroup = DigitalaxModelCollectionGroup.load(
    collectionGroupId.toString()
  );

  let collections = new Array<string>();
  let paramCollections = event.params.collections;
  for (let i = 0; i < paramCollections.length; i += 1) {
    let collectionId = paramCollections[i];
    collections.push(collectionId.toString());
  }

  let digiBundle = event.params.digiBundleCollection.toString();

  if(collectionGroup) {
    collectionGroup.collections = collections;
    collectionGroup.digiBundle = digiBundle;

    collectionGroup.save();
  }
}

export function handleDesignerGroupRemoved(event: DesignerGroupRemoved): void {
  let designer = DigitalaxModelDesigner.load(
    event.params._address.toHexString()
  );
  let collectionIds = designer!.collections;
  for (let i = 0; i < collectionIds.length; i += 1) {
    let collectionId = collectionIds[i];
    let collection = DigitalaxModelCollection.load(collectionId.toString());
    if (collection) {
      collection.designer = null;
      collection.save();
    }
  }

  store.remove("DigitalaxModelDesigner", event.params._address.toHexString());
}

export function handleDesignerGroupAdded(event: DesignerGroupAdded): void {
  let designer = loadOrCreateDigitalaxModelDesigner(event.params._address);
  let collectionIds = event.params.collectionIds;
  let collections = new Array<string>();
  for (let i = 0; i < collectionIds.length; i += 1) {
    let collectionId = collectionIds[i];
    let collection = DigitalaxModelCollection.load(collectionId.toString());
    if (collection) {
      collection.designer = designer.id;
      collection.save();
      collections.push(collection.id);
    }
  }
  designer.collections = collections;

  let designerHash = event.params.uri;
  let designerBytes = ipfs.cat(designerHash);
  if (designerBytes) {
    let data = json.try_fromBytes(designerBytes as Bytes);
    if (data.isOk) {
      if (data.value.kind == JSONValueKind.OBJECT) {
        let res = data.value.toObject();
        if (res.get("Designer ID")!.kind == JSONValueKind.STRING) {
          designer.name = res.get("Designer ID")!.toString();
        }
        if (res.get("description")!.kind == JSONValueKind.STRING) {
          designer.description = res.get("description")!.toString();
        }
        if (res.get("image_url")!.kind == JSONValueKind.STRING) {
          designer.image = res.get("image_url")!.toString();
        }
        if (res.get("instagram")!.kind == JSONValueKind.STRING) {
          designer.instagram = res.get("instagram")!.toString();
        }
        if (res.get("twitter")!.kind == JSONValueKind.STRING) {
          designer.twitter = res.get("twitter")!.toString();
        }
      }
    }
  }
  designer.save();
}

export function handleModelGroupRemoved(event: ModelGroupRemoved): void {
  let designer = DigitalaxModel.load(event.params._address.toHexString());
  let collectionIds = designer!.collections;
  for (let i = 0; i < collectionIds.length; i += 1) {
    let collectionId = collectionIds[i];
    let collection = DigitalaxModelCollection.load(collectionId.toString());
    if (collection) {
      collection.designer = null;
      collection.save();
    }
  }

  store.remove("DigitalaxModel", event.params._address.toHexString());
}

export function handleModelGroupAdded(event: ModelGroupAdded): void {
  let model = loadOrCreateDigitalaxModel(event.params._address);
  let collectionIds = event.params.collectionIds;
  let collections = new Array<string>();
  log.info("this is inside handlemodelgroupadded {}", [
    event.params._address.toHexString(),
  ]);
  for (let i = 0; i < collectionIds.length; i += 1) {
    let collectionId = collectionIds[i];
    let collection = DigitalaxModelCollection.load(collectionId.toString());
    if (collection) {
      collection.model = model.id;
      collection.save();
      collections.push(collection.id);
    }
  }
  model.collections = collections;

  let modelHash = event.params.uri;
  let modelBytes = ipfs.cat(modelHash);
  if (modelBytes) {
    let data = json.try_fromBytes(modelBytes as Bytes);
    if (data.isOk) {
      if (data.value.kind == JSONValueKind.OBJECT) {
        let res = data.value.toObject();
        if (res.get("Model ID")!.kind == JSONValueKind.STRING) {
          model.name = res.get("Model ID")!.toString();
        }
        if (res.get("description")!.kind == JSONValueKind.STRING) {
          model.description = res.get("description")!.toString();
        }
        if (res.get("image_url")!.kind == JSONValueKind.STRING) {
          model.image = res.get("image_url")!.toString();
        }
        if (res.get("instagram")!.kind == JSONValueKind.STRING) {
          model.instagram = res.get("instagram")!.toString();
        }
        if (res.get("twitter")!.kind == JSONValueKind.STRING) {
          model.twitter = res.get("twitter")!.toString();
        }
      }
    }
  }
  model.save();
}
