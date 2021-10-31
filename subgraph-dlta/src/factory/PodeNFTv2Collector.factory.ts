import {PodeNFTv2Collector} from "../../generated/schema";
import {Address} from "@graphprotocol/graph-ts/index";

export function loadOrCreatePodeNFTv2Collector(collector: Address): PodeNFTv2Collector {
    let podeNFTv2Collector: PodeNFTv2Collector | null = PodeNFTv2Collector.load(collector.toHexString());
    if (podeNFTv2Collector == null) {
        podeNFTv2Collector = new PodeNFTv2Collector(collector.toHexString())
        podeNFTv2Collector.parentsOwned = new Array<string>();
    }
    podeNFTv2Collector.save()
    return podeNFTv2Collector as PodeNFTv2Collector;
}
