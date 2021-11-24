import { DigitalaxMonaStaking } from "../../generated/schema";
import { ZERO } from "../constants";

export function loadOrCreateDigitalaxMonaStaking(): DigitalaxMonaStaking | null {
  let monaStaking = DigitalaxMonaStaking.load('1');

  if (!monaStaking) {
    monaStaking = new DigitalaxMonaStaking('1');
    monaStaking.totalMonaStaked = ZERO;
    monaStaking.save();
  }

  return monaStaking;
}