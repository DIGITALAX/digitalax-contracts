import {
  log,
  BigInt,
  ipfs,
  json,
  Bytes,
  JSONValueKind,
  store,
} from "@graphprotocol/graph-ts/index";
import { ZERO_ADDRESS } from "../../subgraph-matic/src/constants";

import {
  ContributionIncreased,
  GenesisPurchased,
  DigitalaxGenesisNFTContractDeployed,
  DigitalaxGenesisNFT as DigitalaxGenesisNFTContract,
  Transfer,
} from "../generated/DigitalaxGenesisNFT/DigitalaxGenesisNFT";

import {
  GenesisContributor,
  DigitalaxGenesisContract,
  DigitalaxGenesisNFT,
  GarmentAttribute,
} from "../generated/schema";

export function handleGenesisPurchased(event: GenesisPurchased): void {
  //log.info('handleGenesisPurchased() @ hash: {}', [event.transaction.hash.toHexString()])

  //     event GenesisPurchased(
  //         address indexed buyer,
  //         uint256 contribution
  //     );

  let genesisContributor = new GenesisContributor(
    event.params.buyer.toHexString()
  );
  genesisContributor.contributor = event.params.buyer;
  genesisContributor.firstContributedTimestamp = event.block.timestamp;
  genesisContributor.totalContributionInWei = event.params.contribution;
  genesisContributor.lastContributedTimestamp = event.block.timestamp;

  genesisContributor.save();

  // update contract info
  let digitalaxGenesis = DigitalaxGenesisContract.load(
    event.address.toHexString()
  );
  digitalaxGenesis.totalContributions = DigitalaxGenesisNFTContract.bind(
    event.address
  ).totalContributions();
  digitalaxGenesis.save();

  let contract = DigitalaxGenesisNFTContract.bind(event.address);

  let tokenId = event.params.tokenId.toString();
  let digitalaxGenesisNft = new DigitalaxGenesisNFT(tokenId);
  digitalaxGenesisNft.tokenUri = contract.tokenURI(event.params.tokenId);
  digitalaxGenesisNft.contribution = event.params.contribution;
  let owner = contract.try_ownerOf(event.params.tokenId);
  if (!owner.reverted) {
    digitalaxGenesisNft.owner = owner.value;
  }
  digitalaxGenesisNft.image = "";
  digitalaxGenesisNft.attributes = new Array<string>();
  digitalaxGenesisNft.name = "";
  digitalaxGenesisNft.description = "";
  digitalaxGenesisNft.animation = "";

  if (digitalaxGenesisNft.tokenUri) {
    if (digitalaxGenesisNft.tokenUri.includes("ipfs/")) {
      let tokenHash = digitalaxGenesisNft.tokenUri.split("ipfs/")[1];
      let tokenBytes = ipfs.cat(tokenHash);
      if (tokenBytes) {
        let data = json.try_fromBytes(tokenBytes as Bytes);
        if (data.isOk) {
          if (data.value.kind === JSONValueKind.OBJECT) {
            let res = data.value.toObject();
            if (res.get("image").kind === JSONValueKind.STRING) {
              digitalaxGenesisNft.image = res.get("image").toString();
            }
            if (res.get("animation_url").kind === JSONValueKind.STRING) {
              digitalaxGenesisNft.animation = res
                .get("animation_url")
                .toString();
            }
            if (res.get("name").kind === JSONValueKind.STRING) {
              digitalaxGenesisNft.name = res.get("name").toString();
            }
            if (res.get("description").kind === JSONValueKind.STRING) {
              digitalaxGenesisNft.description = res
                .get("description")
                .toString();
            }
            if (res.get("attributes").kind === JSONValueKind.ARRAY) {
              let attributes = res.get("attributes").toArray();
              for (let i = 0; i < attributes.length; i += 1) {
                if (attributes[i].kind === JSONValueKind.OBJECT) {
                  let attribute = attributes[i].toObject();
                  let garmentAttribute = new GarmentAttribute(
                    digitalaxGenesisNft.id + i.toString()
                  );
                  garmentAttribute.type = null;
                  garmentAttribute.value = null;

                  if (
                    attribute.get("trait_type").kind === JSONValueKind.STRING
                  ) {
                    garmentAttribute.type = attribute
                      .get("trait_type")
                      .toString();
                  }
                  if (attribute.get("value").kind === JSONValueKind.STRING) {
                    garmentAttribute.value = attribute.get("value").toString();
                  }
                  garmentAttribute.save();
                  let attrs = digitalaxGenesisNft.attributes;
                  attrs.push(garmentAttribute.id);
                  digitalaxGenesisNft.attributes = attrs;
                }
              }
            }
          }
        }
      }
    }
  }

  digitalaxGenesisNft.save();
}

export function handleContributionIncreased(
  event: ContributionIncreased
): void {
  // log.info('handleContributionIncreased() @ hash: {}', [event.transaction.hash.toHexString()]);

  let genesisContributor: GenesisContributor | null = GenesisContributor.load(
    event.params.buyer.toHexString()
  );
  genesisContributor.totalContributionInWei = genesisContributor.totalContributionInWei.plus(
    event.params.contribution
  );
  genesisContributor.lastContributedTimestamp = event.block.timestamp;
  genesisContributor.save();

  // update contract info
  let digitalaxGenesis = DigitalaxGenesisContract.load(
    event.address.toHexString()
  );
  digitalaxGenesis.totalContributions = DigitalaxGenesisNFTContract.bind(
    event.address
  ).totalContributions();
  digitalaxGenesis.save();
}

export function handleGenesisDeployed(
  event: DigitalaxGenesisNFTContractDeployed
): void {
  // log.info('handleGenesisDeployed() @ hash: {}', [event.transaction.hash.toHexString()])

  let contract = DigitalaxGenesisNFTContract.bind(event.address);

  let digitalaxGenesis = new DigitalaxGenesisContract(
    event.address.toHexString()
  );
  digitalaxGenesis.accessControls = contract.accessControls();
  digitalaxGenesis.fundsMultisig = contract.fundsMultisig();
  digitalaxGenesis.genesisStart = contract.genesisStartTimestamp();
  digitalaxGenesis.genesisEnd = contract.genesisEndTimestamp();
  digitalaxGenesis.minimumContributionAmount = contract.minimumContributionAmount();
  digitalaxGenesis.maximumContributionAmount = contract.maximumContributionAmount();
  digitalaxGenesis.totalContributions = contract.totalContributions();
  digitalaxGenesis.save();
}

export function handleTransfer(event: Transfer): void {
  let contract = DigitalaxGenesisNFTContract.bind(event.address);

  if (event.params.from.equals(ZERO_ADDRESS)) {
    let tokenId = event.params.tokenId.toString();
    let digitalaxGenesisNft = new DigitalaxGenesisNFT(tokenId);
    digitalaxGenesisNft.tokenUri = contract.tokenURI(event.params.tokenId);
    let owner = contract.try_ownerOf(event.params.tokenId);
    if (!owner.reverted) {
      digitalaxGenesisNft.owner = owner.value;
      digitalaxGenesisNft.contribution = contract.contribution(owner.value);
    }
    digitalaxGenesisNft.image = "";
    digitalaxGenesisNft.attributes = new Array<string>();
    digitalaxGenesisNft.name = "";
    digitalaxGenesisNft.description = "";
    digitalaxGenesisNft.animation = "";

    if (digitalaxGenesisNft.tokenUri) {
      if (digitalaxGenesisNft.tokenUri.includes("ipfs/")) {
        let tokenHash = digitalaxGenesisNft.tokenUri.split("ipfs/")[1];
        let tokenBytes = ipfs.cat(tokenHash);
        if (tokenBytes) {
          let data = json.try_fromBytes(tokenBytes as Bytes);
          if (data.isOk) {
            if (data.value.kind === JSONValueKind.OBJECT) {
              let res = data.value.toObject();
              if (res.get("image").kind === JSONValueKind.STRING) {
                digitalaxGenesisNft.image = res.get("image").toString();
              }
              if (res.get("animation_url").kind === JSONValueKind.STRING) {
                digitalaxGenesisNft.animation = res
                  .get("animation_url")
                  .toString();
              }
              if (res.get("name").kind === JSONValueKind.STRING) {
                digitalaxGenesisNft.name = res.get("name").toString();
              }
              if (res.get("description").kind === JSONValueKind.STRING) {
                digitalaxGenesisNft.description = res
                  .get("description")
                  .toString();
              }
              if (res.get("attributes").kind === JSONValueKind.ARRAY) {
                let attributes = res.get("attributes").toArray();
                for (let i = 0; i < attributes.length; i += 1) {
                  if (attributes[i].kind === JSONValueKind.OBJECT) {
                    let attribute = attributes[i].toObject();
                    let garmentAttribute = new GarmentAttribute(
                      digitalaxGenesisNft.id + i.toString()
                    );
                    garmentAttribute.type = null;
                    garmentAttribute.value = null;

                    if (
                      attribute.get("trait_type").kind === JSONValueKind.STRING
                    ) {
                      garmentAttribute.type = attribute
                        .get("trait_type")
                        .toString();
                    }
                    if (attribute.get("value").kind === JSONValueKind.STRING) {
                      garmentAttribute.value = attribute
                        .get("value")
                        .toString();
                    }
                    garmentAttribute.save();
                    let attrs = digitalaxGenesisNft.attributes;
                    attrs.push(garmentAttribute.id);
                    digitalaxGenesisNft.attributes = attrs;
                  }
                }
              }
            }
          }
        }
      }
    }

    digitalaxGenesisNft.save();
  } else if (event.params.to.equals(ZERO_ADDRESS)) {
    store.remove("DigitalaxGenesisNFT", event.params.tokenId.toString());
  } else {
    let digitalaxGenesisNft = DigitalaxGenesisNFT.load(
      event.params.tokenId.toString()
    );
    if (digitalaxGenesisNft) {
      let owner = contract.try_ownerOf(event.params.tokenId);
      if (!owner.reverted) {
        digitalaxGenesisNft.owner = owner.value;
        digitalaxGenesisNft.contribution = contract.contribution(owner.value);
      }
      digitalaxGenesisNft.save();
    }
  }
}
