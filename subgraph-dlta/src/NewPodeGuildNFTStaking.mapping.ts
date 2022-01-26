import {
    Staked,
    Unstaked,
    EmergencyUnstake,
    RewardPaid,
    GuildNFTStakingV3 as NewPodeGuildNFTStakingContract
} from "../generated/NewPodeGuildNFTStaking/GuildNFTStakingV3";

import { Address } from "@graphprotocol/graph-ts";

import { calculateWeights } from "./factory/PodeCalculateWeights.factory";

const GuildNFTSTakingWeightV4Address =
  "0xB574d5843B6898d710addaA409cB43B48b7b06e4";
import {
    NewPodeNFTv2Staker,
} from "../generated/schema";
import {ZERO} from "./constants";
import {GuildNFTStakingWeightV4 as NewPodeGuildNFTStakingWeightContract} from "../generated/NewPodeGuildNFTStakingWeightV4/GuildNFTStakingWeightV4";

export function handleRewardPaid(event: RewardPaid): void {
     let owner = event.params.user.toHexString()
    let reward = event.params.reward;
    let staker = NewPodeNFTv2Staker.load(owner);
    if (staker == null) {
        staker = new NewPodeNFTv2Staker(owner);
        staker.garments = new Array<string>();
        staker.rewardsClaimed = ZERO;
    }

    let contract = NewPodeGuildNFTStakingWeightContract.bind(Address.fromString(GuildNFTSTakingWeightV4Address));
    calculateWeights(contract,  event.block.timestamp, staker);

    staker.rewardsClaimed = staker.rewardsClaimed.plus(reward);
    staker.save();
}

export function handleStaked(event: Staked): void {
    let owner = event.params.owner.toHexString()
    let token = event.params.tokenId.toString();
    let staker = NewPodeNFTv2Staker.load(owner);
    if (staker == null) {
        staker = new NewPodeNFTv2Staker(owner);
        staker.garments = new Array<string>();
        staker.rewardsClaimed = ZERO;
        staker.weights = null;
    }
    let garmentsStaked = staker.garments;
    garmentsStaked.push(token);
    staker.garments = garmentsStaked;

    let contract = NewPodeGuildNFTStakingWeightContract.bind(Address.fromString(GuildNFTSTakingWeightV4Address));
    calculateWeights(contract,  event.block.timestamp, staker);

    staker.save();
}

export function handleUnstaked(event: Unstaked): void {
    let contract = NewPodeGuildNFTStakingContract.bind(event.address);
    let owner = event.params.owner.toHexString()
    let staker = NewPodeNFTv2Staker.load(owner);
    let currentStaked = contract.getStakedTokens(event.params.owner);
    // Find garment and remove it
    let updatedGarmentsStaked = new Array<string>();
    for (let i = 0; i < currentStaked.length; i += 1) {
        updatedGarmentsStaked.push(currentStaked[i].toString())
    }
    staker.garments = updatedGarmentsStaked;

    let weightContract = NewPodeGuildNFTStakingWeightContract.bind(Address.fromString(GuildNFTSTakingWeightV4Address));
    calculateWeights(weightContract,  event.block.timestamp, staker);

    staker.save();
}

export function handleEmergencyUnstake(event: EmergencyUnstake): void {
    let contract = NewPodeGuildNFTStakingContract.bind(event.address);
    let owner = event.params.user.toHexString()
    let staker = NewPodeNFTv2Staker.load(owner);

    let currentStaked = contract.getStakedTokens(event.params.user);
    // Find garment and remove it
    let updatedGarmentsStaked = new Array<string>();
    for (let i = 0; i < currentStaked.length; i += 1) {
            updatedGarmentsStaked.push(currentStaked[i].toString())
    }
    staker.garments = updatedGarmentsStaked;

    let weightContract = NewPodeGuildNFTStakingWeightContract.bind(Address.fromString(GuildNFTSTakingWeightV4Address));
    calculateWeights(weightContract,  event.block.timestamp, staker);

    staker.save();
}
