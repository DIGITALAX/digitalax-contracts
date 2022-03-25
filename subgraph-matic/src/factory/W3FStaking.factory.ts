import { W3FStaking } from "../../generated/schema";
import { ZERO } from "../constants";

export function loadOrCreateW3FStaking(): W3FStaking | null {
  let w3fStaking = W3FStaking.load('1');

  if (!w3fStaking) {
    w3fStaking = new W3FStaking('1');
    w3fStaking.totalW3FStaked = ZERO;
    w3fStaking.save();
  }

  return w3fStaking;
}
