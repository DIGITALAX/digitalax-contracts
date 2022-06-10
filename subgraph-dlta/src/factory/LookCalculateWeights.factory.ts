import {
    NewLookGuildWhitelistedNFTStaker,
    NewLookNFTv2Staker,
    LookGuildStakerWeight,
    LookGuildWhitelistedStakerWeight
} from "../../generated/schema";
import {Address, BigInt} from "@graphprotocol/graph-ts/index";
import {GuildNFTStakingWeightV4 as NewLookGuildNFTStakingWeightContract} from "../../generated/NewLookGuildNFTStakingWeightV4/GuildNFTStakingWeightV4";
import {ZERO} from "../constants";


export function calculateWeights(contract: NewLookGuildNFTStakingWeightContract, timestamp: BigInt, staker: NewLookNFTv2Staker | null): void {
  if(staker == null){
    return;
  }
  let tryStartTime = contract.try_startTime(
  );
  if (!tryStartTime.reverted) {
    let startTime = tryStartTime.value;
     // Get which day it is
    let secondsPassed = timestamp.minus(startTime);
    // Current time minus start time divided by seconds per day gives us the weighting contract day
    let currentDay = secondsPassed.div(BigInt.fromI32(86400 as i32));
    let currentWeight = ZERO;
    let totalWeight = ZERO;

    let tryWeight = contract.try_calcNewOwnerWeight(Address.fromString(staker.id));
    if (!tryWeight.reverted) {
      currentWeight = tryWeight.value;
    }

    let tryTotalWeight = contract.try_calcNewWeight();
    if (!tryTotalWeight.reverted) {
      totalWeight = tryTotalWeight.value;
    }

    let weightId = staker.id + "-" + currentDay.toString();

    if (staker.weights == null) {
      // No previous weights
      staker.weights = new Array<string>();
      staker.save();
    }

    let stakeWeightDay = LookGuildStakerWeight.load(weightId);
    if(!stakeWeightDay) {
      stakeWeightDay = new LookGuildStakerWeight(weightId);
    }

    stakeWeightDay.day = currentDay;
    stakeWeightDay.lastDailyPersonalWeight = currentWeight;
    stakeWeightDay.lastTotalWeight = totalWeight;
    stakeWeightDay.save();

    if(staker.weights && staker.weights!.length > 0) {
      let index = staker.weights!.length - 1;
      let weights = staker.weights as Array<string>;
      let stakerWeight = weights[index];
      if(stakerWeight == weightId) {
        let dailyWeights = staker.weights!;
        dailyWeights[index]! = stakeWeightDay.id; // Swap for this new one
        staker.weights = dailyWeights;
      } else {
        // This day has not been published on before
        let dailyWeights = staker.weights!;
        dailyWeights.push(stakeWeightDay.id);
        staker.weights = dailyWeights;
      }
    } else {
      // This day has not been published on before
      let dailyWeights = new Array<string>();
      dailyWeights.push(stakeWeightDay.id);
      staker.weights = dailyWeights;
    }
  }
  staker.save();
}

export function calculateWhitelistedWeights(contract: NewLookGuildNFTStakingWeightContract, timestamp: BigInt, staker: NewLookGuildWhitelistedNFTStaker | null): void {
  if(staker == null){
    return;
  }
  let tryStartTime = contract.try_startTime(
  );
  if (!tryStartTime.reverted) {
    let startTime = tryStartTime.value;
     // Get which day it is
    let secondsPassed = timestamp.minus(startTime);
    // Current time minus start time divided by seconds per day gives us the weighting contract day
    let currentDay = secondsPassed.div(BigInt.fromI32(86400 as i32));
    let currentWeight = ZERO;
    let totalWeight = ZERO;

    let tryWeight = contract.try_calcNewWhitelistedNFTOwnerWeight(Address.fromString(staker.id));
    if (!tryWeight.reverted) {
      currentWeight = tryWeight.value;
    }

    let tryTotalWeight = contract.try_calcNewTotalWhitelistedNFTWeight();
    if (!tryTotalWeight.reverted) {
      totalWeight = tryTotalWeight.value;
    }

    let weightId = staker.id + "-" + currentDay.toString();

    if (staker.weights == null) {
      // No previous weights
      staker.weights = new Array<string>();
    }

    let stakeWeightDay = LookGuildWhitelistedStakerWeight.load(weightId);
    if(!stakeWeightDay) {
      stakeWeightDay = new LookGuildWhitelistedStakerWeight(weightId);
    }

    stakeWeightDay.day = currentDay;
    stakeWeightDay.lastDailyPersonalWeight = currentWeight;
    stakeWeightDay.lastTotalWeight = totalWeight;
    stakeWeightDay.save();
    if(staker.weights!.length > 0) {
      let index = staker.weights!.length - 1;
      let weights = staker.weights as Array<string>;
      let stakerWeight = weights[index];
      if(stakerWeight == weightId ) {
        let dailyWeights = staker.weights;
        dailyWeights![index]! = stakeWeightDay.id; // Swap for this new one
        staker.weights = dailyWeights;
      } else {
        // This day has not been published on before
        let dailyWeights = staker.weights;
        dailyWeights!.push(stakeWeightDay.id);
        staker.weights = dailyWeights;
      }
    } else {
      // This day has not been published on before
      let dailyWeights = new Array<string>();
      dailyWeights.push(stakeWeightDay.id);
      staker.weights = dailyWeights;
    }
  }
  staker.save();
}
