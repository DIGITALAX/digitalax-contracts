import {
  DigitalaxMonaStaking as DigitalaxW3fStakingContract,
  Staked,
  StakedLP,
  Unstaked,
  UnstakedLP,
} from '../generated/W3FStaking/DigitalaxMonaStaking';
import { loadOrCreateW3FStaking } from './factory/W3FStaking.factory';

export function handleStaked(event: Staked): void {
  let w3fStaking = loadOrCreateW3FStaking();
  let contract = DigitalaxW3fStakingContract.bind(event.address);
  let staked = contract.try_stakedValueTotalForPool();
  if (!staked.reverted) {
    w3fStaking.totalW3FStaked = staked.value;
    w3fStaking.save();
  }
}

export function handleUnstaked(event: Unstaked): void {
  let w3fStaking = loadOrCreateW3FStaking();
  let contract = DigitalaxW3fStakingContract.bind(event.address);
  let staked = contract.try_stakedValueTotalForPool();
  if (!staked.reverted) {
    w3fStaking.totalW3FStaked = staked.value;
    w3fStaking.save();
  }
}

export function handleStakedLP(event: StakedLP): void {
  let w3fStaking = loadOrCreateW3FStaking();
  let contract = DigitalaxW3fStakingContract.bind(event.address);
  let staked = contract.try_stakedValueTotalForPool();
  if (!staked.reverted) {
    w3fStaking.totalW3FStaked = staked.value;
    w3fStaking.save();
  }
}

export function handleUnstakedLP(event: UnstakedLP): void {
  let w3fStaking = loadOrCreateW3FStaking();
  let contract = DigitalaxW3fStakingContract.bind(event.address);
  let staked = contract.try_stakedValueTotalForPool();
  if (!staked.reverted) {
    w3fStaking.totalW3FStaked = staked.value;
    w3fStaking.save();
  }
}
