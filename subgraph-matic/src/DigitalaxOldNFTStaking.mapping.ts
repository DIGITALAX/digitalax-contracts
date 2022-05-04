import { log, ipfs, JSONValue, Value } from "@graphprotocol/graph-ts/index";
import {
    Staked,
    Unstaked,
    EmergencyUnstake,
    RewardPaid,
    DigitalaxOldNFTStaking as DigitalaxNFTStakingContract
} from "../generated/DigitalaxOldNFTStaking/DigitalaxOldNFTStaking";

import {
    DigitalaxOldNFTStaker,
    DigitalaxGarmentV2
} from "../generated/schema";
import {ZERO} from "./constants";

export function handleRewardPaid(event: RewardPaid): void {
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.user.toHexString()
    let reward = event.params.reward;
    let staker = DigitalaxOldNFTStaker.load(owner);
    if (staker == null) {
        staker = new DigitalaxOldNFTStaker(owner);
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
    let staker = DigitalaxOldNFTStaker.load(owner);
    if (staker == null) {
        staker = new DigitalaxOldNFTStaker(owner);
        staker.garments = new Array<string>();
        staker.rewardsClaimed = ZERO;
    }
    if(staker) {
        let garmentsStaked = staker.garments;
        garmentsStaked.push(token);
        staker.garments = garmentsStaked;
        staker.save();
    }
}

export function handleUnstaked(event: Unstaked): void {
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.owner.toHexString()
    let staker = DigitalaxOldNFTStaker.load(owner);
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
    let staker = DigitalaxOldNFTStaker.load(owner);
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
