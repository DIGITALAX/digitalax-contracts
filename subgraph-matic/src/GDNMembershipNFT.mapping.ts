import {
  Transfer,
  GDNMembershipNFT as GDNMembershipNFTContract,
} from "../generated/GDNMembershipNFT/GDNMembershipNFT";
import { ZERO_ADDRESS } from "./constants";
import { GarmentAttribute, GDNMembershipNFT } from "../generated/schema";
import {
  Bytes,
  ipfs,
  json,
  JSONValueKind,
  store,
} from "@graphprotocol/graph-ts";

export function handleTransfer(event: Transfer): void {
  let contract = GDNMembershipNFTContract.bind(event.address);

  if (event.params.from.equals(ZERO_ADDRESS)) {
    let nftId = event.params.tokenId.toString();
    let gdnNft = new GDNMembershipNFT(nftId);
    gdnNft.tokenUri = contract.tokenURI(event.params.tokenId);
    let owner = contract.try_ownerOf(event.params.tokenId);
    if (!owner.reverted) {
      gdnNft.owner = owner.value;
    }
    gdnNft.name = "";
    gdnNft.description = "";
    gdnNft.image = "";
    gdnNft.animation = "";
    gdnNft.attributes = new Array<string>();

    if (gdnNft.tokenUri) {
      if (gdnNft.tokenUri.includes("ipfs/")) {
        let tokenHash = gdnNft.tokenUri.split("ipfs/")[1];
        let tokenBytes = ipfs.cat(tokenHash);
        if (tokenBytes) {
          let data = json.try_fromBytes(tokenBytes as Bytes);
          if (data.isOk) {
            if (data.value.kind == JSONValueKind.OBJECT) {
              let res = data.value.toObject();
              if (res.get("animation_url")!.kind == JSONValueKind.STRING) {
                gdnNft.animation = res.get("animation_url")!.toString();
              }
              if (res.get("name")!.kind == JSONValueKind.STRING) {
                gdnNft.name = res.get("name")!.toString();
              }
              if (res.get("description")!.kind == JSONValueKind.STRING) {
                gdnNft.description = res.get("description")!.toString();
              }
              if (res.get("attributes")!.kind == JSONValueKind.ARRAY) {
                let attributes = res.get("attributes")!.toArray();
                for (let i = 0; i < attributes.length; i += 1) {
                  if (attributes[i].kind == JSONValueKind.OBJECT) {
                    let attribute = attributes[i].toObject();
                    let garmentAttribute = new GarmentAttribute(
                      "gdn-" + gdnNft.id + i.toString()
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
                    let attrs = gdnNft.attributes;
                    attrs.push(garmentAttribute.id);
                    gdnNft.attributes = attrs;
                  }
                }
              }
            }
          }
        }
      }
    }

    gdnNft.save();
  } else if (event.params.to.equals(ZERO_ADDRESS)) {
    store.remove("GDNMembershipNFT", event.params.tokenId.toString());
  } else {
    let gdnNft = GDNMembershipNFT.load(event.params.tokenId.toString());
    let owner = contract.try_ownerOf(event.params.tokenId);
    if (!owner.reverted) {
      gdnNft.owner = owner.value;
    }
    gdnNft.save();
  }
}
