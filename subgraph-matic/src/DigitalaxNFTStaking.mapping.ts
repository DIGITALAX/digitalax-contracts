import { log, ipfs, JSONValue, Value } from "@graphprotocol/graph-ts/index";
import {
    Staked,
    Unstaked,
    EmergencyUnstake,
    RewardPaid,
    DigitalaxNFTStaking as DigitalaxNFTStakingContract, UnstakedByNFT, EmergencyUnstakeByNFT, StakedByNFT
} from "../generated/DigitalaxNFTStaking/DigitalaxNFTStaking";

import {
    DigitalaxNFTStaker,
    DigitalaxGarmentV2, ModelNFTStaker
} from "../generated/schema";
import {ZERO} from "./constants";

export function handleRewardPaid(event: RewardPaid): void {
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.user.toHexString()
    let reward = event.params.reward;
    let staker = DigitalaxNFTStaker.load(owner);
    if (staker == null) {
        staker = new DigitalaxNFTStaker(owner);
        staker.garments = new Array<string>();
        staker.rewardsClaimed = ZERO;
    }

    staker.rewardsClaimed = staker.rewardsClaimed.plus(reward);
    staker.save();
}

export function handleStaked(event: Staked): void {
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.owner.toHexString()
    let token = event.params.amount.toString();
    let staker = DigitalaxNFTStaker.load(owner);
    if (staker == null) {
        staker = new DigitalaxNFTStaker(owner);
        staker.garments = new Array<string>();
        staker.rewardsClaimed = ZERO;
    }
    let garmentsStaked = staker.garments;
    garmentsStaked.push(token);
    staker.garments = garmentsStaked;
    staker.save();
}

export function handleUnstaked(event: Unstaked): void {
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.owner.toHexString()
    let staker = DigitalaxNFTStaker.load(owner);
    if(staker) {
        let currentStaked = contract.getStakedTokens(event.params.owner);
        // Find garment and remove it
        let updatedGarmentsStaked = new Array<string>();
        for (let i = 0; i < currentStaked.length; i += 1) {
            updatedGarmentsStaked.push(currentStaked[i].toString())
        }
        staker.garments = updatedGarmentsStaked;
        staker.save();
    }
}

export function handleEmergencyUnstake(event: EmergencyUnstake): void {
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.user.toHexString()
    let staker = DigitalaxNFTStaker.load(owner);
    if(staker) {

        let currentStaked = contract.getStakedTokens(event.params.user);
        // Find garment and remove it
        let updatedGarmentsStaked = new Array<string>();
        for (let i = 0; i < currentStaked.length; i += 1) {
            updatedGarmentsStaked.push(currentStaked[i].toString())
        }
        staker.garments = updatedGarmentsStaked;
        staker.save();
    }
}

// Only programmed for Models nft currently, if there are more nfts added to the pool this needs to be refactored.
export function handleStakedByNFT(event: StakedByNFT): void {
    if(event.params.token.toHexString() != "0x2ffce9b58a788a54b4466b0d5ccc5c6dd00c1b83"){
        return; // Needs to be models nft
    }
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.owner.toHexString()
    let token = event.params.amount.toString();
    let staker = ModelNFTStaker.load(owner);

    if (staker == null) {
        staker = new ModelNFTStaker(owner);
        staker.garments = new Array<string>();
    }
    if(staker) {
        let garmentsStaked = staker.garments;
        garmentsStaked.push(token);
        staker.garments = garmentsStaked;
        staker.save();
    }
}

export function handleUnstakedByNFT(event: UnstakedByNFT): void {
    if(event.params.token.toHexString() != "0x2ffce9b58a788a54b4466b0d5ccc5c6dd00c1b83"){
        return; // Needs to be models nft
    }
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.owner.toHexString()
    let staker = ModelNFTStaker.load(owner);
    if(staker) {
        let currentStaked = contract.getStakedTokens(event.params.owner);
        // Find garment and remove it
        let updatedGarmentsStaked = new Array<string>();
        for (let i = 0; i < currentStaked.length; i += 1) {
            updatedGarmentsStaked.push(currentStaked[i].toString())
        }
        staker.garments = updatedGarmentsStaked;
        staker.save();
    }
}

export function handleEmergencyUnstakeByNFT(event: EmergencyUnstakeByNFT): void {
    if(event.params.token.toHexString() != "0x2ffce9b58a788a54b4466b0d5ccc5c6dd00c1b83"){
        return; // Needs to be models nft
    }
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.user.toHexString()
    let staker = DigitalaxNFTStaker.load(owner);
    if(staker) {
        let currentStaked = contract.getStakedTokens(event.params.user);
        // Find garment and remove it
        let updatedGarmentsStaked = new Array<string>();
        for (let i = 0; i < currentStaked.length; i += 1) {
            updatedGarmentsStaked.push(currentStaked[i].toString())
        }
        staker.garments = updatedGarmentsStaked;
        staker.save();
    }
}
