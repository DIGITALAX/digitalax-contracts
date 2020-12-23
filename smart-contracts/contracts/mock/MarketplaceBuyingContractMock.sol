// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "../DigitalaxMarketplace.sol";
contract MarketplaceBuyingContractMock {
    DigitalaxMarketplace public marketplaceContract;
    constructor(DigitalaxMarketplace _marketplaceContract) public {
        marketplaceContract = _marketplaceContract;
    }
    function buyOfferWithEth(uint256 _garmentTokenId) external payable {
        marketplaceContract.buyOffer{value: msg.value}(_garmentTokenId, false);
    }
}
