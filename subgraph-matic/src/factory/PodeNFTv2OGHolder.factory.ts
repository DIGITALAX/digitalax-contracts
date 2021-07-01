import {PodeNFTv2OGHolder} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";

export function loadOrCreatePodeNFTv2OGHolder(tokenId: string): PodeNFTv2OGHolder {
    let PodeNFTv2DeveloperId = tokenId;
    let podeNFTv2Developer = PodeNFTv2OGHolder.load(PodeNFTv2DeveloperId);
    if (podeNFTv2Developer == null) {
        podeNFTv2Developer = new PodeNFTv2OGHolder(PodeNFTv2DeveloperId);
        podeNFTv2Developer.garments = new Array<string>();
    }
    podeNFTv2Developer.save()
    return podeNFTv2Developer as PodeNFTv2OGHolder
}
