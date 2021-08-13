import { Bytes, ipfs, json, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts';
import { ERC721 } from '../generated/GuildWhitelistedNFTStaking/ERC721';
import {
    Staked,
    Unstaked,
    EmergencyUnstake,
    RewardPaid,
    GuildWhitelistedNFTStaking as GuildWhitelistedNFTStakingContract
} from "../generated/GuildWhitelistedNFTStaking/GuildWhitelistedNFTStaking";

import {
    GuildWhitelistedNFT,
    GuildWhitelistedNFTStaker,
} from "../generated/schema";
import {ZERO} from "./constants";

export function handleRewardPaid(event: RewardPaid): void {
    let owner = event.params.user.toHexString()
    let reward = event.params.reward;
    let staker = GuildWhitelistedNFTStaker.load(owner);
    if (staker == null) {
        staker = new GuildWhitelistedNFTStaker(owner);
        staker.garments = new Array<string>();
        staker.rewardsClaimed = ZERO;
    }

    staker.rewardsClaimed = staker.rewardsClaimed.plus(reward);
    staker.save();
}

export function handleStaked(event: Staked): void {
    let contract = ERC721.bind(event.params.whitelistedNFT);
    let tokenUri = contract.tokenURI(event.params.tokenId);
    let owner = event.params.owner.toHexString()
    let token = event.params.tokenId.toString();
    let whitelistedNft = event.params.whitelistedNFT.toHexString();
    let garmentId = whitelistedNft.concat('-').concat(token);
    let garment = new GuildWhitelistedNFT(garmentId);
    garment.owner = owner;
    garment.tokenUri = tokenUri;
    garment.tokenAddress = whitelistedNft;
    if (tokenUri) {
        if (tokenUri.includes('ipfs/')) {
            let tokenHash = tokenUri.split('ipfs/')[1];
            let tokenBytes = ipfs.cat(tokenHash);
            if (tokenBytes) {
                let data = json.try_fromBytes(tokenBytes as Bytes);
                if (data.isOk) {
                    if (data.value.kind === JSONValueKind.OBJECT) {
                        let res = data.value.toObject();
                        if (res.get('animation_url').kind === JSONValueKind.STRING) {
                            garment.animation = res.get('animation_url').toString();
                        }
                        if (res.get('description').kind === JSONValueKind.STRING) {
                            garment.description = res.get('description').toString();
                        }
                        if (res.get('name').kind === JSONValueKind.STRING) {
                            garment.name = res.get('name').toString();
                        }
                    }
                }
            }
        }
    }
    garment.save();

    let staker = GuildWhitelistedNFTStaker.load(owner);
    if (staker == null) {
        staker = new GuildWhitelistedNFTStaker(owner);
        staker.garments = new Array<string>();
        staker.rewardsClaimed = ZERO;
    }
    let garmentsStaked = staker.garments;
    garmentsStaked.push(garmentId);
    staker.garments = garmentsStaked;
    staker.save();
}

export function handleUnstaked(event: Unstaked): void {
    let contract = GuildWhitelistedNFTStakingContract.bind(event.address);
    let owner = event.params.owner.toHexString()
    let staker = GuildWhitelistedNFTStaker.load(owner);
    let currentStaked = contract.getStakedTokens(event.params.owner, event.params.whitelistedNFT);
    // Find garment and remove it
    let updatedGarmentsStaked = new Array<string>();
    for (let i = 0; i < currentStaked.length; i += 1) {
        updatedGarmentsStaked.push(currentStaked[i].toString())
    }
    staker.garments = updatedGarmentsStaked;
    staker.save();
}

export function handleEmergencyUnstake(event: EmergencyUnstake): void {
    let contract = GuildWhitelistedNFTStakingContract.bind(event.address);
    let owner = event.params.user.toHexString()
    let staker = GuildWhitelistedNFTStaker.load(owner);

    let currentStaked = contract.getStakedTokens(event.params.user, event.params.whitelistedNFT);
    // Find garment and remove it
    let updatedGarmentsStaked = new Array<string>();
    for (let i = 0; i < currentStaked.length; i += 1) {
            updatedGarmentsStaked.push(currentStaked[i].toString())
    }
    staker.garments = updatedGarmentsStaked;
    staker.save();
}
