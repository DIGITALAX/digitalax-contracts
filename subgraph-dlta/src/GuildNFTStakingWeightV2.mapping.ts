import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  AppraiseGuildMember,
  GuildNFTStakingWeightV2 as GuildNFTStakingWeightV2Contract,
  WhitelistedNFTReaction,
} from "../generated/GuildNFTStakingWeightV2/GuildNFTStakingWeightV2";
import {
  ClapHistory,
  GuildNFTWeight,
  PodeNFTv2Staker,
} from "../generated/schema";
import { ONE, ZERO } from "./constants";

export function handleAppraiseGuildMember(event: AppraiseGuildMember): void {
  let contract = GuildNFTStakingWeightV2Contract.bind(event.address);
  let podeStaker = PodeNFTv2Staker.load(event.params.guildMember.toHexString());
  if (!podeStaker) {
    podeStaker = new PodeNFTv2Staker(event.params.guildMember.toHexString());
    podeStaker.rewardsClaimed = ZERO;
    podeStaker.totalAppraisals = ZERO;
    podeStaker.totalStaked = ZERO;
    podeStaker.totalFollowed = ZERO;
    podeStaker.totalFavourites = ZERO;
    podeStaker.totalMetaverse = ZERO;
    podeStaker.totalShare = ZERO;
    podeStaker.weight = ZERO;
  }

  let tryWeight = contract.try_calcNewOwnerWeight(event.params.guildMember);
  if (!tryWeight.reverted) {
    podeStaker.weight = tryWeight.value;
  }
  podeStaker.save();
}

export function handleWhitelistedNFTReaction(
  event: WhitelistedNFTReaction
): void {
  let contract = GuildNFTStakingWeightV2Contract.bind(event.address);
  let podeStaker = PodeNFTv2Staker.load(event.transaction.from.toHexString());
  if (
    !event.params.tokenId.toString() ||
    !event.params.whitelistedNFT.toHexString()
  ) {
    return;
  }
  let nftWeights = GuildNFTWeight.load(
    event.params.whitelistedNFT
      .toHexString()
      .concat("-")
      .concat(event.params.tokenId.toString())
  );
  if (!podeStaker) {
    podeStaker = new PodeNFTv2Staker(event.transaction.from.toHexString());
    podeStaker.rewardsClaimed = ZERO;
    podeStaker.totalAppraisals = ZERO;
    podeStaker.totalStaked = ZERO;
    podeStaker.totalFollowed = ZERO;
    podeStaker.totalFavourites = ZERO;
    podeStaker.totalMetaverse = ZERO;
    podeStaker.totalShare = ZERO;
    podeStaker.weight = ZERO;
    podeStaker.clapHistory = null;
  }

  if (!nftWeights) {
    nftWeights = new GuildNFTWeight(
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

  podeStaker.totalAppraisals = podeStaker.totalAppraisals!.plus(ONE);
  let tryWeight = contract.try_calcNewOwnerWeight(event.transaction.from);
  if (!tryWeight.reverted) {
    podeStaker.weight = tryWeight.value;
  }
  nftWeights.totalAppraisals = nftWeights.totalAppraisals.plus(ONE);

  if (event.params.reaction == "Favorite") {
    podeStaker.totalFavourites = podeStaker.totalFavourites!.plus(
      event.params.quantity
    );
    nftWeights.totalFavourites = nftWeights.totalFavourites.plus(
      event.params.quantity
    );
  }
  if (event.params.reaction == "Follow") {
    podeStaker.totalFollowed = podeStaker.totalFollowed!.plus(
      event.params.quantity
    );
    nftWeights.totalFollowed = nftWeights.totalFollowed.plus(
      event.params.quantity
    );
  }
  if (event.params.reaction == "Metaverse") {
    podeStaker.totalMetaverse = podeStaker.totalMetaverse!.plus(
      event.params.quantity
    );
    nftWeights.totalMetaverse = nftWeights.totalMetaverse.plus(
      event.params.quantity
    );
  }
  if (event.params.reaction == "Share") {
    podeStaker.totalShare = podeStaker.totalShare!.plus(event.params.quantity);
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

    if (podeStaker.clapHistory) {
      let oldClapHistory = podeStaker.clapHistory;
      oldClapHistory!.push(newClap.id);
      podeStaker.clapHistory = oldClapHistory!;
    } else {
      let clapHistory = new Array<string>();
      clapHistory.push(newClap.id);
      podeStaker.clapHistory = clapHistory;
    }
    nftWeights.totalClaps = nftWeights.totalClaps.plus(event.params.quantity);
  }
  if (event.params.reaction == "Skip") {
    nftWeights.totalSkips = nftWeights.totalSkips.plus(event.params.quantity);
  }

  nftWeights.save();
  podeStaker.save();
  log.info("this is nftWeights.id ------------ {}", [nftWeights.id]);
  log.info("this is nftWeights.totalAppraisals ------------ {}", [
    nftWeights.totalAppraisals.toString(),
  ]);
}
