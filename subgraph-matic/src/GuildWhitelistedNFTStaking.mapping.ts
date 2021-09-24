import { Bytes, ipfs, json, JSONValue, JSONValueKind, log } from '@graphprotocol/graph-ts';
import { ERC721 } from '../generated/GuildWhitelistedNFTStaking/ERC721';
import {
    Staked,
    Unstaked,
    EmergencyUnstake,
    RewardPaid,
    GuildWhitelistedNFTStaking as GuildWhitelistedNFTStakingContract,
    AddWhitelistedTokens
} from "../generated/GuildWhitelistedNFTStaking/GuildWhitelistedNFTStaking";

import {
    GuildWhitelistedNFT,
    GuildWhitelistedNFTStaker,
    GuildWhitelistedToken,
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
    log.info('this is event.params.whitelistedNFT ------------ {}', [event.params.whitelistedNFT.toString()]);
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
    garment.animation = '';
    garment.description = '';
    garment.name = '';
    
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
    let owner = event.params.owner.toHexString()
    let staker = GuildWhitelistedNFTStaker.load(owner);
    let oldGarments = staker.garments;
    let newGarments = new Array<string>();
    for (let i = 0; i < oldGarments.length; i += 1) {
        const newId = event.params.whitelistedNFT.toHexString().concat("-").concat(event.params.tokenId.toString());
        if (oldGarments[i] != newId) {
            newGarments.push(oldGarments[i]);
        }
    }
    staker.garments = newGarments;
    staker.save();
}

export function handleEmergencyUnstake(event: EmergencyUnstake): void {
    let owner = event.params.user.toHexString()
    let staker = GuildWhitelistedNFTStaker.load(owner);

    let oldGarments = staker.garments;
    let newGarments = new Array<string>();
    for (let i = 0; i < oldGarments.length; i += 1) {
        const newId = event.params.whitelistedNFT.toHexString().concat("-").concat(event.params.tokenId.toString());
        if (oldGarments[i] != newId) {
            newGarments.push(oldGarments[i]);
        }
    }
    staker.garments = newGarments;
    staker.save();
}

export function handleAddWhitelistedTokens(event: AddWhitelistedTokens): void {
    let addresses = event.params.whitelistedTokens;
    for (let i = 0; i < addresses.length; i += 1) {
        let contract = ERC721.bind(addresses[i]);
        const guildWhitelistedToken = new GuildWhitelistedToken(addresses[i].toHexString());
        const result = contract.try_name();
        if (!result.reverted) {
          guildWhitelistedToken.name = result.value;
          guildWhitelistedToken.save();
        }
    }
}