import {
  Address,
  Bytes,
  ipfs,
  json,
  JSONValue,
  JSONValueKind,
  log,
} from "@graphprotocol/graph-ts";
import { ERC721 } from "../generated/NewPodeGuildWhitelistedNFTStaking/ERC721";
import {
  Staked,
  Unstaked,
  EmergencyUnstake,
  RewardPaid,
  GuildWhitelistedNFTStakingV3 as NewPodeGuildWhitelistedNFTStakingContract,
  AddWhitelistedTokens,
} from "../generated/NewPodeGuildWhitelistedNFTStaking/GuildWhitelistedNFTStakingV3";

import { calculateWhitelistedWeights} from "./factory/PodeCalculateWeights.factory";

import { GuildNFTStakingWeightV4 as NewPodeGuildNFTStakingWeightV4Contract } from "../generated/NewPodeGuildWhitelistedNFTStaking/GuildNFTStakingWeightV4";

const GuildNFTSTakingWeightV4Address =
  "0xB574d5843B6898d710addaA409cB43B48b7b06e4";

import {
  NewPodeGuildWhitelistedNFT,
  NewPodeGuildWhitelistedNFTStaker,
  NewPodeGuildWhitelistedToken,
} from "../generated/schema";
import { ZERO } from "./constants";
import {GuildNFTStakingWeightV4 as NewPodeGuildNFTStakingWeightContract} from "../generated/NewPodeGuildNFTStakingWeightV4/GuildNFTStakingWeightV4";
import {calculateWeights} from "./factory/PodeCalculateWeights.factory";

export function handleRewardPaid(event: RewardPaid): void {
  let owner = event.params.user.toHexString();
  let reward = event.params.reward;
  let staker = NewPodeGuildWhitelistedNFTStaker.load(owner);
  if (staker == null) {
    staker = new NewPodeGuildWhitelistedNFTStaker(owner);
    staker.garments = new Array<string>();
    staker.rewardsClaimed = ZERO;
    staker.weight = ZERO;
  }

  staker.rewardsClaimed = staker.rewardsClaimed.plus(reward);

  let weightContract = NewPodeGuildNFTStakingWeightContract.bind(Address.fromString(GuildNFTSTakingWeightV4Address));
  calculateWhitelistedWeights(weightContract,  event.block.timestamp, staker);
  staker.save();
}

export function handleStaked(event: Staked): void {
  log.info("this is event.params.whitelistedNFT ------------ {}", [
    event.params.whitelistedNFT.toString(),
  ]);
  let contract = ERC721.bind(event.params.whitelistedNFT);
  let weightContract = NewPodeGuildNFTStakingWeightV4Contract.bind(
    Address.fromString(GuildNFTSTakingWeightV4Address)
  );
  let tokenUri = contract.tokenURI(event.params.tokenId);
  let owner = event.params.owner.toHexString();
  let token = event.params.tokenId.toString();
  let whitelistedNft = event.params.whitelistedNFT.toHexString();
  let garmentId = whitelistedNft.concat("-").concat(token);
  let garment = new NewPodeGuildWhitelistedNFT(garmentId);
  garment.owner = owner;
  garment.tokenUri = tokenUri;
  garment.tokenAddress = whitelistedNft;
  garment.animation = "";
  garment.description = "";
  garment.name = "";
  garment.image = "";

  let tryWeight = weightContract.try_whitelistedNFTTokenWeight(
    event.params.whitelistedNFT,
    event.params.tokenId
  );
  if (!tryWeight.reverted) {
    garment.weight = tryWeight.value.value0;
  }
  garment.timestamp = event.block.timestamp;

  if (tokenUri) {
    if (tokenUri.includes("ipfs/")) {
      let tokenHash = tokenUri.split("ipfs/")[1];
      let tokenBytes = ipfs.cat(tokenHash);
      if (tokenBytes) {
        let data = json.try_fromBytes(tokenBytes as Bytes);
        if (data.isOk) {
          if (data.value.kind === JSONValueKind.OBJECT) {
            let res = data.value.toObject();
            if (res.get("animation_url").kind === JSONValueKind.STRING) {
              garment.animation = res.get("animation_url").toString();
            }
            if (res.get("description").kind === JSONValueKind.STRING) {
              garment.description = res.get("description").toString();
            }
            if (res.get("name").kind === JSONValueKind.STRING) {
              garment.name = res.get("name").toString();
            }
            if (res.get("image").kind == JSONValueKind.STRING) {
              garment.image = res.get("image").toString();
            }
          }
        }
      }
    }
  }
  garment.save();

  let staker = NewPodeGuildWhitelistedNFTStaker.load(owner);
  if (staker == null) {
    staker = new NewPodeGuildWhitelistedNFTStaker(owner);
    staker.garments = new Array<string>();
    staker.rewardsClaimed = ZERO;
    staker.weight = ZERO;
    // staker.weights = null;
  }

  let garmentsStaked = staker.garments;
  garmentsStaked.push(garmentId);
  staker.garments = garmentsStaked;

  let tryStakerWeight = weightContract.try_calcNewWhitelistedNFTOwnerWeight(
    event.params.owner
  );
  if (!tryStakerWeight.reverted) {
    staker.weight = tryStakerWeight.value;
  }

  // let weightContract2 = NewPodeGuildNFTStakingWeightContract.bind(
  //   Address.fromString(GuildNFTSTakingWeightV4Address)
  // );
  // calculateWhitelistedWeights(weightContract2,  event.block.timestamp, staker);

  staker.save();
}

export function handleUnstaked(event: Unstaked): void {
  let owner = event.params.owner.toHexString();
  let staker = NewPodeGuildWhitelistedNFTStaker.load(owner);
  let weightContract = NewPodeGuildNFTStakingWeightV4Contract.bind(
    Address.fromString(GuildNFTSTakingWeightV4Address)
  );
  let oldGarments = staker.garments;
  let newGarments = new Array<string>();
  for (let i = 0; i < oldGarments.length; i += 1) {
    const newId = event.params.whitelistedNFT
      .toHexString()
      .concat("-")
      .concat(event.params.tokenId.toString());
    if (oldGarments[i] != newId) {
      newGarments.push(oldGarments[i]);
    }
  }

  let tryStakerWeight = weightContract.try_calcNewWhitelistedNFTOwnerWeight(
    event.params.owner
  );
  if (!tryStakerWeight.reverted) {
    staker.weight = tryStakerWeight.value;
  }

  staker.garments = newGarments;

  let weightContract2 = NewPodeGuildNFTStakingWeightContract.bind(
    Address.fromString(GuildNFTSTakingWeightV4Address)
  );
  calculateWhitelistedWeights(weightContract2,  event.block.timestamp, staker);

  staker.save();
}

export function handleEmergencyUnstake(event: EmergencyUnstake): void {
  let owner = event.params.user.toHexString();
  let staker = NewPodeGuildWhitelistedNFTStaker.load(owner);
  let weightContract = NewPodeGuildNFTStakingWeightV4Contract.bind(
    Address.fromString(GuildNFTSTakingWeightV4Address)
  );

  let oldGarments = staker.garments;
  let newGarments = new Array<string>();
  for (let i = 0; i < oldGarments.length; i += 1) {
    const newId = event.params.whitelistedNFT
      .toHexString()
      .concat("-")
      .concat(event.params.tokenId.toString());
    if (oldGarments[i] != newId) {
      newGarments.push(oldGarments[i]);
    }
  }

  let tryStakerWeight = weightContract.try_calcNewWhitelistedNFTOwnerWeight(
    event.params.user
  );
  if (!tryStakerWeight.reverted) {
    staker.weight = tryStakerWeight.value;
  }
  staker.garments = newGarments;

  let weightContract2 = NewPodeGuildNFTStakingWeightContract.bind(
    Address.fromString(GuildNFTSTakingWeightV4Address)
  );
  calculateWhitelistedWeights(weightContract2,  event.block.timestamp, staker);

  staker.save();
}

export function handleAddWhitelistedTokens(event: AddWhitelistedTokens): void {
  let addresses = event.params.whitelistedTokens;
  for (let i = 0; i < addresses.length; i += 1) {
    let contract = ERC721.bind(addresses[i]);
    const guildWhitelistedToken = new NewPodeGuildWhitelistedToken(
      addresses[i].toHexString()
    );
    const result = contract.try_name();
    if (!result.reverted) {
      guildWhitelistedToken.name = result.value;
      guildWhitelistedToken.save();
    }
  }
}
