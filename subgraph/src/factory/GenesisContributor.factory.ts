import {GenesisContributor} from "../../generated/schema";
import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts/index";

export function loadOrCreateGenesisContributor(buyer: Address, eventBlock: ethereum.Block, totalContributionInWei: BigInt): GenesisContributor {
    let contributor: GenesisContributor | null = GenesisContributor.load(buyer.toHexString());
    if (contributor == null) {
        contributor = new GenesisContributor(buyer.toHexString())
        contributor.contributor = buyer
        contributor.firstContributedTimestamp = eventBlock.timestamp
        contributor.totalContributionInWei = totalContributionInWei
        contributor.lastContributedTimestamp = eventBlock.timestamp
    }
    contributor.save()
    return contributor as GenesisContributor;
}
