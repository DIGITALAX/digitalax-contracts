import {
  DigitalaxLookNFT as DigitalaxLookNFTContract,
  Transfer,
} from "../generated/DigitalaxLookNFT/DigitalaxLookNFT";
import { ZERO_ADDRESS } from "./constants";
import { DigitalaxLookNFT } from "../generated/schema";
import { store } from "@graphprotocol/graph-ts";

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
