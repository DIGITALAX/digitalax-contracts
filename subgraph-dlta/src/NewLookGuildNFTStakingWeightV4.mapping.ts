import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  AppraiseGuildMember,
  GuildNFTStakingWeightV4 as NewLookGuildNFTStakingWeightContract,
  WhitelistedNFTReaction,
} from "../generated/NewLookGuildNFTStakingWeightV4/GuildNFTStakingWeightV4";
import {
  ClapHistory,
  NewLookGuildNFTWeight,
  NewLookNFTv2Staker,
} from "../generated/schema";
import { ONE, ZERO } from "./constants";

export function handleAppraiseGuildMember(event: AppraiseGuildMember): void {
  let contract = NewLookGuildNFTStakingWeightContract.bind(event.address);
  let lookStaker = NewLookNFTv2Staker.load(event.params.guildMember.toHexString());
  if (!lookStaker) {
    lookStaker = new NewLookNFTv2Staker(event.params.guildMember.toHexString());
    lookStaker.garments = null;
    lookStaker.rewardsClaimed = ZERO;
    lookStaker.totalAppraisals = ZERO;
    lookStaker.totalStaked = ZERO;
    lookStaker.totalFollowed = ZERO;
    lookStaker.totalFavourites = ZERO;
    lookStaker.totalMetaverse = ZERO;
    lookStaker.totalShare = ZERO;
    lookStaker.weight = ZERO;
  }

  let tryWeight = contract.try_calcNewOwnerWeight(event.params.guildMember);
  if (!tryWeight.reverted) {
    lookStaker.weight = tryWeight.value;
  }
  lookStaker.save();
}

export function handleWhitelistedNFTReaction(
  event: WhitelistedNFTReaction
): void {
  let contract = NewLookGuildNFTStakingWeightContract.bind(event.address);
  let lookStaker = NewLookNFTv2Staker.load(event.transaction.from.toHexString());
  if (
    !event.params.tokenId.toString() ||
    !event.params.whitelistedNFT.toHexString()
  ) {
    return;
  }
  let nftWeights = NewLookGuildNFTWeight.load(
    event.params.whitelistedNFT
      .toHexString()
      .concat("-")
      .concat(event.params.tokenId.toString())
  );
  if (!lookStaker) {
    lookStaker = new NewLookNFTv2Staker(event.transaction.from.toHexString());
    lookStaker.garments = null;
    lookStaker.rewardsClaimed = ZERO;
    lookStaker.totalAppraisals = ZERO;
    lookStaker.totalStaked = ZERO;
    lookStaker.totalFollowed = ZERO;
    lookStaker.totalFavourites = ZERO;
    lookStaker.totalMetaverse = ZERO;
    lookStaker.totalShare = ZERO;
    lookStaker.weight = ZERO;
    lookStaker.clapHistory = null;
  }

  if (!nftWeights) {
    nftWeights = new NewLookGuildNFTWeight(
      event.params.whitelistedNFT
        .toHexString()
        .concat("-")
        .concat(event.params.tokenId.toString())
    );
    nftWeights.totalAppraisals = ZERO;
    nftWeights.totalFollowed = ZERO;
    nftWeights.totalFavourites = ZERO;
    nftWeights.totalShare = ZERO;
    nftWeights.totalSkips = ZERO;
    nftWeights.totalClaps = ZERO;
    nftWeights.totalMetaverse = ZERO;
  }

  lookStaker.totalAppraisals = lookStaker.totalAppraisals.plus(ONE);
  let tryWeight = contract.try_calcNewOwnerWeight(event.transaction.from);
  if (!tryWeight.reverted) {
    lookStaker.weight = tryWeight.value;
  }
  nftWeights.totalAppraisals = nftWeights.totalAppraisals.plus(ONE);

  if (event.params.reaction == "Favorite") {
    lookStaker.totalFavourites = lookStaker.totalFavourites.plus(
      event.params.quantity
    );
    nftWeights.totalFavourites = nftWeights.totalFavourites.plus(
      event.params.quantity
    );
  }
  if (event.params.reaction == "Follow") {
    lookStaker.totalFollowed = lookStaker.totalFollowed.plus(
      event.params.quantity
    );
    nftWeights.totalFollowed = nftWeights.totalFollowed.plus(
      event.params.quantity
    );
  }
  if (event.params.reaction == "Metaverse") {
    lookStaker.totalMetaverse = lookStaker.totalMetaverse.plus(
      event.params.quantity
    );
    nftWeights.totalMetaverse = nftWeights.totalMetaverse.plus(
      event.params.quantity
    );
  }
  if (event.params.reaction == "Share") {
    lookStaker.totalShare = lookStaker.totalShare.plus(event.params.quantity);
    nftWeights.totalShare = nftWeights.totalShare.plus(event.params.quantity);
  }
  if (event.params.reaction == "Clap") {
    let newClap = new ClapHistory(
      event.transaction.from
        .toHexString()
        .concat("-")
        .concat(event.block.timestamp.toString())
    );
    newClap.claps = event.params.quantity;
    newClap.timestamp = event.block.timestamp;
    newClap.owner = event.transaction.from.toHexString();
    newClap.save();

    if (lookStaker.clapHistory) {
      let oldClapHistory = lookStaker.clapHistory;
      oldClapHistory.push(newClap.id);
      lookStaker.clapHistory = oldClapHistory;
    } else {
      let clapHistory = new Array<string>();
      clapHistory.push(newClap.id);
      lookStaker.clapHistory = clapHistory;
    }
    nftWeights.totalClaps = nftWeights.totalClaps.plus(event.params.quantity);
  }
  if (event.params.reaction == "Skip") {
    nftWeights.totalSkips = nftWeights.totalSkips.plus(event.params.quantity);
  }

  nftWeights.save();
  lookStaker.save();
  log.info("this is nftWeights.id ------------ {}", [nftWeights.id]);
  log.info("this is nftWeights.totalAppraisals ------------ {}", [
    nftWeights.totalAppraisals.toString(),
  ]);
}
