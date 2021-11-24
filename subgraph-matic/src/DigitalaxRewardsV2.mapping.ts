import { store } from "@graphprotocol/graph-ts";
import { AddRewardTokens, RemoveRewardTokens } from "../generated/DigitalaxRewardsV2/DigitalaxRewardsV2";
import { ERC20 } from "../generated/DigitalaxRewardsV2/ERC20";
import { DigitalaxRewardV2Token } from "../generated/schema";

export function handleAddRewardTokens(event: AddRewardTokens): void {
  const tokens = event.params.rewardTokens;
  for (let i = 0; i < tokens.length; i += 1) {
    let rewardV2Token = DigitalaxRewardV2Token.load(tokens[i].toHexString());
    if (!rewardV2Token) {
      rewardV2Token = new DigitalaxRewardV2Token(tokens[i].toHexString());
      const contract = ERC20.bind(tokens[i]);
      rewardV2Token.name = contract.name();
      rewardV2Token.symbol = contract.symbol();
      rewardV2Token.save();
    }
  }
}

export function handleRemoveRewardTokens(event: RemoveRewardTokens): void {
  const tokens = event.params.rewardTokens;
  for (let i = 0; i < tokens.length; i += 1) {
    let rewardV2Token = DigitalaxRewardV2Token.load(tokens[i].toHexString());
    if (rewardV2Token) {
      store.remove('DigitalaxRewardV2Tokens', tokens[i].toHexString());
    }
  }
}
