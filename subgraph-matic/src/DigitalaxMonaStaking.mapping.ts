import { DigitalaxMonaStaking as DigitalaxMonaStakingContract, Staked, StakedLP, Unstaked, UnstakedLP } from "../generated/DigitalaxMonaStaking/DigitalaxMonaStaking";
import { loadOrCreateDigitalaxMonaStaking } from "./factory/DigitalaxMonaStaking.factory";

export function handleStaked(event: Staked): void {
  let monaStaking = loadOrCreateDigitalaxMonaStaking();
  let contract = DigitalaxMonaStakingContract.bind(event.address);
  let staked = contract.try_stakedValueTotalForPool()
  if (!staked.reverted) {
    monaStaking.totalMonaStaked = staked.value;
    monaStaking.save();
  }
}

export function handleUnstaked(event: Unstaked): void {
  let monaStaking = loadOrCreateDigitalaxMonaStaking();
  let contract = DigitalaxMonaStakingContract.bind(event.address);
  let staked = contract.try_stakedValueTotalForPool()
  if (!staked.reverted) {
    monaStaking.totalMonaStaked = staked.value;
    monaStaking.save();
  }
}

export function handleStakedLP(event: StakedLP): void {
  let monaStaking = loadOrCreateDigitalaxMonaStaking();
  let contract = DigitalaxMonaStakingContract.bind(event.address);
  let staked = contract.try_stakedValueTotalForPool()
  if (!staked.reverted) {
    monaStaking.totalMonaStaked = staked.value;
    monaStaking.save();
  }
}

export function handleUnstakedLP(event: UnstakedLP): void {
  let monaStaking = loadOrCreateDigitalaxMonaStaking();
  let contract = DigitalaxMonaStakingContract.bind(event.address);
  let staked = contract.try_stakedValueTotalForPool()
  if (!staked.reverted) {
    monaStaking.totalMonaStaked = staked.value;
    monaStaking.save();
  }
}