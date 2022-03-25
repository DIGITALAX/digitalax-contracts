import {
  DigitalaxLookNFT as DigitalaxLookNFTContract,
  Transfer,
} from "../generated/DigitalaxLookNFT/DigitalaxLookNFT";
import { ZERO_ADDRESS } from "./constants";
import { DigitalaxLookNFT } from "../generated/schema";
import { store, BigInt, log} from "@graphprotocol/graph-ts";

export function handleTransfer(event: Transfer): void {
  let contract = DigitalaxLookNFTContract.bind(event.address);

  if (event.params.from.equals(ZERO_ADDRESS)) {
    let tokenId = event.params.tokenId.toString();
    let digitalaxLookNft = new DigitalaxLookNFT(tokenId);
    let owner = contract.try_ownerOf(event.params.tokenId);
    if (!owner.reverted) {
      digitalaxLookNft.owner = owner.value;
    }
    digitalaxLookNft.name = contract.name();
    digitalaxLookNft.shape = contract.getShape(event.params.tokenId);
    digitalaxLookNft.pattern = contract.getPattern(event.params.tokenId);
    digitalaxLookNft.background = contract.getBackgroundColour(
      event.params.tokenId
    );
    digitalaxLookNft.texture = contract.getTexture(event.params.tokenId);
    digitalaxLookNft.flare = contract.getFlare(event.params.tokenId);
    digitalaxLookNft.form = contract.getForm(event.params.tokenId);
    digitalaxLookNft.line = contract.getLine(event.params.tokenId);
    digitalaxLookNft.element = contract.getElement(event.params.tokenId);
    digitalaxLookNft.tokenUri = contract.tokenURI(event.params.tokenId);
    digitalaxLookNft.color = contract.getColour(event.params.tokenId);
    digitalaxLookNft.save();
    // Just for fixing the case where tokens were claimed before randomness drawn
   if( event.block.timestamp > BigInt.fromI32(1633278600) && event.block.timestamp < BigInt.fromI32(1633691504)) // this basically just will be called for 1 transaction that happened 4 days ago.
     {
       log.info("Resyncing @ timestamp", [event.block.timestamp.toString()]);
      for(let i = 1; i< 3001; i++){
        const j = BigInt.fromI32(i);
        let owner = contract.try_ownerOf(j);
        if (!owner.reverted) {
        let digitalaxLookNftUpdate = DigitalaxLookNFT.load(j.toString());
          digitalaxLookNftUpdate.name = contract.name();
          digitalaxLookNftUpdate.shape = contract.getShape(j);
          digitalaxLookNftUpdate.pattern = contract.getPattern(j);
          digitalaxLookNftUpdate.background = contract.getBackgroundColour(
              j
          );
          digitalaxLookNftUpdate.texture = contract.getTexture(j);
          digitalaxLookNftUpdate.flare = contract.getFlare(j);
          digitalaxLookNftUpdate.form = contract.getForm(j);
          digitalaxLookNftUpdate.line = contract.getLine(j);
          digitalaxLookNftUpdate.element = contract.getElement(j);
          digitalaxLookNftUpdate.tokenUri = contract.tokenURI(j);
          digitalaxLookNftUpdate.color = contract.getColour(j);
          digitalaxLookNftUpdate.save();
        }
      }
    }
  } else if (event.params.to.equals(ZERO_ADDRESS)) {
    store.remove("DigitalaxLookNFT", event.params.tokenId.toString());
  } else {
    let digitalaxLookNft = DigitalaxLookNFT.load(
      event.params.tokenId.toString()
    );
    if (digitalaxLookNft) {
      let owner = contract.try_ownerOf(event.params.tokenId);
      if (!owner.reverted) {
        digitalaxLookNft.owner = owner.value;
      }
    }
    digitalaxLookNft.save();
  }
}
