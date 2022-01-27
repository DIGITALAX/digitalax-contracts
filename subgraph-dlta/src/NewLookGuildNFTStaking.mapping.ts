import {
    Staked,
    Unstaked,
    EmergencyUnstake,
    RewardPaid,
    GuildNFTStakingV3 as NewLookGuildNFTStakingContract
} from "../generated/NewLookGuildNFTStaking/GuildNFTStakingV3";

import {
    NewLookNFTv2Staker,
} from "../generated/schema";
import {ZERO} from "./constants";

import { Address } from "@graphprotocol/graph-ts";

import { calculateWeights } from "./factory/LookCalculateWeights.factory";

const GuildNFTSTakingWeightV4Address =
  "0x0eAE037c3fB4e02eac70b0Af331a34a30E30d730";

import {GuildNFTStakingWeightV4 as NewLookGuildNFTStakingWeightContract} from "../generated/NewLookGuildNFTStakingWeightV4/GuildNFTStakingWeightV4";

export function handleRewardPaid(event: RewardPaid): void {
    let owner = event.params.user.toHexString()
    let reward = event.params.reward;
    let staker = NewLookNFTv2Staker.load(owner);
    if (staker == null) {
        staker = new NewLookNFTv2Staker(owner);
        staker.garments = new Array<string>();
        staker.rewardsClaimed = ZERO;
    }

    let contract = NewLookGuildNFTStakingWeightContract.bind(Address.fromString(GuildNFTSTakingWeightV4Address));
    calculateWeights(contract,  event.block.timestamp, staker);

    staker.rewardsClaimed = staker.rewardsClaimed.plus(reward);
    staker.save();
}

export function handleStaked(event: Staked): void {
    let owner = event.params.owner.toHexString()
    let token = event.params.tokenId.toString();
    let staker = NewLookNFTv2Staker.load(owner);
    if (staker == null) {
        staker = new NewLookNFTv2Staker(owner);
        staker.garments = new Array<string>();
        staker.rewardsClaimed = ZERO;
    }
    let garmentsStaked = staker.garments;
    garmentsStaked.push(token);
    staker.garments = garmentsStaked;
    staker.save();
}

export function handleUnstaked(event: Unstaked): void {
    let contract = NewLookGuildNFTStakingContract.bind(event.address);
    let owner = event.params.owner.toHexString()
    let staker = NewLookNFTv2Staker.load(owner);
    let currentStaked = contract.getStakedTokens(event.params.owner);
    // Find garment and remove it
    let updatedGarmentsStaked = new Array<string>();
    for (let i = 0; i < currentStaked.length; i += 1) {
        updatedGarmentsStaked.push(currentStaked[i].toString())
    }
    staker.garments = updatedGarmentsStaked;

    let weightContract = NewLookGuildNFTStakingWeightContract.bind(Address.fromString(GuildNFTSTakingWeightV4Address));
    calculateWeights(weightContract,  event.block.timestamp, staker);

    staker.save();
}

export function handleEmergencyUnstake(event: EmergencyUnstake): void {
    let contract = NewLookGuildNFTStakingContract.bind(event.address);
    let owner = event.params.user.toHexString()
    let staker = NewLookNFTv2Staker.load(owner);

    let currentStaked = contract.getStakedTokens(event.params.user);
    // Find garment and remove it
    let updatedGarmentsStaked = new Array<string>();
    for (let i = 0; i < currentStaked.length; i += 1) {
            updatedGarmentsStaked.push(currentStaked[i].toString())
    }
    staker.garments = updatedGarmentsStaked;

    let weightContract = NewLookGuildNFTStakingWeightContract.bind(Address.fromString(GuildNFTSTakingWeightV4Address));
    calculateWeights(weightContract,  event.block.timestamp, staker);

    staker.save();
}
