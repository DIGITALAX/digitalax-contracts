import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  AppraiseGuildMember,
  GuildNFTStakingWeightV2 as GuildNFTStakingWeightV2Contract,
  WhitelistedNFTReaction,
} from "../generated/GuildNFTStakingWeightV2/GuildNFTStakingWeightV2";
import { ClapHistory, PodeNFTv2Staker } from "../generated/schema";

export function handleAppraiseGuildMember(event: AppraiseGuildMember): void {
  let podeStaker = PodeNFTv2Staker.load(event.params.guildMember.toHexString());
  if (!podeStaker) {
    podeStaker = new PodeNFTv2Staker(event.params.guildMember.toHexString());
    podeStaker.garments = null;
    podeStaker.rewardsClaimed = new BigInt(0);
    podeStaker.totalAppraisals = new BigInt(0);
    podeStaker.totalStaked = new BigInt(0);
    podeStaker.totalFollowed = new BigInt(0);
    podeStaker.totalFavourites = new BigInt(0);
    podeStaker.totalMetaverse = new BigInt(0);
    podeStaker.totalShare = new BigInt(0);
  }
  podeStaker.save();
}

export function handleWhitelistedNFTReaction(event: WhitelistedNFTReaction): void {
  const contract = GuildNFTStakingWeightV2Contract.bind(event.address);
  let podeStaker = PodeNFTv2Staker.load(event.transaction.from.toHexString());
  const stats = contract.appraiserStats(event.transaction.from);
  if (!podeStaker) {
    podeStaker = new PodeNFTv2Staker(event.transaction.from.toHexString());
    podeStaker.garments = null;
    podeStaker.rewardsClaimed = new BigInt(0);
    podeStaker.totalAppraisals = new BigInt(0);
    podeStaker.totalStaked = new BigInt(0);
    podeStaker.totalFollowed = new BigInt(0);
    podeStaker.totalFavourites = new BigInt(0);
    podeStaker.totalMetaverse = new BigInt(0);
    podeStaker.totalShare = new BigInt(0);
    podeStaker.clapHistory = null;
  }

  log.info("this is event.params.reaction ------------ {}", [event.params.reaction]);
  log.info("this is event.params.quantity ------------ {}", [event.params.quantity.toString()]);
  log.info("this is event.params.whitelistedNft ------------ {}", [event.params.whitelistedNFT.toHexString()]);
  log.info("this is event.params.tokenId ------------ {}", [event.params.tokenId.toString()]);

  podeStaker.totalAppraisals = stats.value0;
  
  if (event.params.reaction == 'Favorite') {
    podeStaker.totalFavourites = podeStaker.totalFavourites.plus(event.params.quantity);
  }
  if (event.params.reaction == 'Follow') {
    podeStaker.totalFollowed = podeStaker.totalFollowed.plus(event.params.quantity);
  }
  if (event.params.reaction == 'Metaverse') {
    podeStaker.totalMetaverse = podeStaker.totalMetaverse.plus(event.params.quantity);
  }
  if (event.params.reaction == 'Share') {
    podeStaker.totalShare = podeStaker.totalShare.plus(event.params.quantity);
  }
  if (event.params.reaction == 'Clap') {
    let newClap = new ClapHistory(event.transaction.from.toHexString().concat('-').concat(event.block.timestamp.toString()));
    newClap.claps = event.params.quantity;
    newClap.timestamp = event.block.timestamp;
    newClap.owner = event.transaction.from.toHexString();
    newClap.save();

    if (podeStaker.clapHistory) {
      let oldClapHistory = podeStaker.clapHistory;
      oldClapHistory.push(newClap.id);
      podeStaker.clapHistory = oldClapHistory;
    } else {
      let clapHistory = new Array<string>();
      clapHistory.push(newClap.id);
      podeStaker.clapHistory = clapHistory;
    }
  }

  podeStaker.save();
}