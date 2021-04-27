import {log, BigInt} from "@graphprotocol/graph-ts/index";

import {
    Staked,
    Unstaked,
    EmergencyUnstake
} from "../generated/DigitalaxNFTStaking/DigitalaxNFTStaking";

import {
    DigitalaxGarmentStakedToken
} from "../generated/schema";

export function handleStaked(event: Staked): void {
    let stakedToken = new DigitalaxGarmentStakedToken(event.params.amount.toString())
    stakedToken.staker = event.params.owner;
    stakedToken.timestamp = event.block.timestamp;
    stakedToken.save();
}

export function handleUnstaked(event: Unstaked): void {
    let token: DigitalaxGarmentStakedToken | null = DigitalaxGarmentStakedToken.load(event.params.amount.toHexString());
    if (token != null) {
        token.staker = null;
        token.timestamp = null;
        token.save();
    }
}

export function handleEmergencyUnstake(event: EmergencyUnstake): void {
    let token: DigitalaxGarmentStakedToken | null = DigitalaxGarmentStakedToken.load(event.params.tokenId.toHexString());
    if (token != null) {
        token.staker = null;
        token.timestamp = null;
        token.save();
    }
}
