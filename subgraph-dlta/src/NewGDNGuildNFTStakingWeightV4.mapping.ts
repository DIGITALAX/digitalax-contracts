import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  AppraiseGuildMember,
  GuildNFTStakingWeightV4 as NewGDNGuildNFTStakingWeightContract,
  WhitelistedNFTReaction,
} from "../generated/NewGDNGuildNFTStakingWeightV4/GuildNFTStakingWeightV4";
import {
  ClapHistory,
  NewGDNGuildNFTWeight,
  NewGDNNFTv2Staker,
} from "../generated/schema";
import { ONE, ZERO } from "./constants";

export function handleAppraiseGuildMember(event: AppraiseGuildMember): void {
  let contract = NewGDNGuildNFTStakingWeightContract.bind(event.address);
  let gdnStaker = NewGDNNFTv2Staker.load(event.params.guildMember.toHexString());
  if (!gdnStaker) {
    gdnStaker = new NewGDNNFTv2Staker(event.params.guildMember.toHexString());
    gdnStaker.garments = null;
    gdnStaker.rewardsClaimed = ZERO;
    gdnStaker.totalAppraisals = ZERO;
    gdnStaker.totalStaked = ZERO;
    gdnStaker.totalFollowed = ZERO;
    gdnStaker.totalFavourites = ZERO;
    gdnStaker.totalMetaverse = ZERO;
    gdnStaker.totalShare = ZERO;
    gdnStaker.weight = ZERO;
  }

  let tryWeight = contract.try_calcNewOwnerWeight(event.params.guildMember);
  if (!tryWeight.reverted) {
    gdnStaker.weight = tryWeight.value;
  }
  gdnStaker.save();
}

export function handleWhitelistedNFTReaction(
  event: WhitelistedNFTReaction
): void {
  let contract = NewGDNGuildNFTStakingWeightContract.bind(event.address);
  let gdnStaker = NewGDNNFTv2Staker.load(event.transaction.from.toHexString());
  if (
    !event.params.tokenId.toString() ||
    !event.params.whitelistedNFT.toHexString()
  ) {
    return;
  }
  let nftWeights = NewGDNGuildNFTWeight.load(
    event.params.whitelistedNFT
      .toHexString()
      .concat("-")
      .concat(event.params.tokenId.toString())
  );
  if (!gdnStaker) {
    gdnStaker = new NewGDNNFTv2Staker(event.transaction.from.toHexString());
    gdnStaker.garments = null;
    gdnStaker.rewardsClaimed = ZERO;
    gdnStaker.totalAppraisals = ZERO;
    gdnStaker.totalStaked = ZERO;
    gdnStaker.totalFollowed = ZERO;
    gdnStaker.totalFavourites = ZERO;
    gdnStaker.totalMetaverse = ZERO;
    gdnStaker.totalShare = ZERO;
    gdnStaker.weight = ZERO;
    gdnStaker.clapHistory = null;
  }

  if (!nftWeights) {
    nftWeights = new NewGDNGuildNFTWeight(
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

  gdnStaker.totalAppraisals = gdnStaker.totalAppraisals.plus(ONE);
  let tryWeight = contract.try_calcNewOwnerWeight(event.transaction.from);
  if (!tryWeight.reverted) {
    gdnStaker.weight = tryWeight.value;
  }
  nftWeights.totalAppraisals = nftWeights.totalAppraisals.plus(ONE);

  if (event.params.reaction == "Favorite") {
    gdnStaker.totalFavourites = gdnStaker.totalFavourites.plus(
      event.params.quantity
    );
    nftWeights.totalFavourites = nftWeights.totalFavourites.plus(
      event.params.quantity
    );
  }
  if (event.params.reaction == "Follow") {
    gdnStaker.totalFollowed = gdnStaker.totalFollowed.plus(
      event.params.quantity
    );
    nftWeights.totalFollowed = nftWeights.totalFollowed.plus(
      event.params.quantity
    );
  }
  if (event.params.reaction == "Metaverse") {
    gdnStaker.totalMetaverse = gdnStaker.totalMetaverse.plus(
      event.params.quantity
    );
    nftWeights.totalMetaverse = nftWeights.totalMetaverse.plus(
      event.params.quantity
    );
  }
  if (event.params.reaction == "Share") {
    gdnStaker.totalShare = gdnStaker.totalShare.plus(event.params.quantity);
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

    if (gdnStaker.clapHistory) {
      let oldClapHistory = gdnStaker.clapHistory;
      oldClapHistory.push(newClap.id);
      gdnStaker.clapHistory = oldClapHistory;
    } else {
      let clapHistory = new Array<string>();
      clapHistory.push(newClap.id);
      gdnStaker.clapHistory = clapHistory;
    }
    nftWeights.totalClaps = nftWeights.totalClaps.plus(event.params.quantity);
  }
  if (event.params.reaction == "Skip") {
    nftWeights.totalSkips = nftWeights.totalSkips.plus(event.params.quantity);
  }

  nftWeights.save();
  gdnStaker.save();
  log.info("this is nftWeights.id ------------ {}", [nftWeights.id]);
  log.info("this is nftWeights.totalAppraisals ------------ {}", [
    nftWeights.totalAppraisals.toString(),
  ]);
}
