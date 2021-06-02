import { log, ipfs, JSONValue, Value } from "@graphprotocol/graph-ts/index";
import {
    Staked,
    Unstaked,
    EmergencyUnstake,
    RewardPaid,
    DigitalaxNFTStaking as DigitalaxNFTStakingContract
} from "../generated/DigitalaxNFTStaking/DigitalaxNFTStaking";

import {
    DigitalaxNFTStaker,
    DigitalaxGarmentV2
} from "../generated/schema";
import {ZERO} from "./constants";

export function handleRewardPaid(event: RewardPaid): void {
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.user.toString()
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
    let owner = event.params.owner.toString()
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
    let owner = event.params.owner.toString()
    let token = event.params.amount.toString();
    let staker = DigitalaxNFTStaker.load(owner);
    let garmentsStaked = staker.garments;

    // Find garment and remove it
    let updatedGarmentsStaked = new Array<string>();
    for (let i = 0; i < garmentsStaked.length; i += 1) {
        if (garmentsStaked[i] !== token) {
            updatedGarmentsStaked.push(garmentsStaked[i]);
        }
    }
    staker.garments = updatedGarmentsStaked;
    staker.save();
}

export function handleEmergencyUnstake(event: EmergencyUnstake): void {
    let contract = DigitalaxNFTStakingContract.bind(event.address);
    let owner = event.params.user.toString()
    let token = event.params.tokenId.toString();
    let staker = DigitalaxNFTStaker.load(owner);
    let garmentsStaked = staker.garments;

    // Find garment and remove it
    let updatedGarmentsStaked = new Array<string>();
    for (let i = 0; i < garmentsStaked.length; i += 1) {
        if (garmentsStaked[i] !== token) {
            updatedGarmentsStaked.push(garmentsStaked[i]);
        }
    }
    staker.garments = updatedGarmentsStaked;
    staker.save();
}
