// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DigitalaxGarmentNFT.sol";
import "./DigitalaxGarmentNFTv2.sol";
import "./DigitalaxMaterials.sol";
import "../DigitalaxAccessControls.sol";
import "../EIP2771/BaseRelayRecipient.sol";

/**
 * @title Digitalax Garment Factory
 * @dev To facilitate the creation of child and parents NFTs
 * @dev This contract needs to be given the smart contract role in order to be given access to mint tokens
 */
contract DigitalaxGarmentUpgrader is ReentrancyGuard, BaseRelayRecipient  {

    // @notice event emitted on garment creation
    event GarmentCreated(
        uint256[] indexed oldGarmentTokenIds,
        uint256[] indexed newGarmentTokenIds
    );

    // @notice the parent ERC721 garment token
    DigitalaxGarmentNFT public garmentToken;

    // @notice the parent ERC721 garment token
    DigitalaxGarmentNFTv2 public garmentTokenV2;

    // @notice access controls
    DigitalaxAccessControls public accessControls;

    constructor(
        DigitalaxGarmentNFT _garmentToken,
        DigitalaxGarmentNFTv2 _garmentTokenV2,
        DigitalaxAccessControls _accessControls,
        address _trustedForwarder
    ) public {
        garmentToken = _garmentToken;
        garmentTokenV2 = _garmentTokenV2;
        accessControls = _accessControls;
        trustedForwarder = _trustedForwarder;
    }


    /**
     * Override this function.
     * This version is to keep track of BaseRelayRecipient you are using
     * in your contract.
     */
    function versionRecipient() external view override returns (string memory) {
        return "1";
    }

    function setTrustedForwarder(address _trustedForwarder) external  {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMaterials.setTrustedForwarder: Sender must be admin"
        );
        trustedForwarder = _trustedForwarder;
    }

    // This is to support Native meta transactions
    // never use msg.sender directly, use _msgSender() instead
    function _msgSender()
    internal
    view
    returns (address payable sender)
    {
        return BaseRelayRecipient.msgSender();
    }

    /**
     @notice Creates a single ERC721 parent token without any linked child tokens
     @dev Only callable with minter role
     */
    function upgrade(
        uint256[] memory tokenIds,
        address beneficiary
    ) external nonReentrant {
        uint256[] memory newTokenIds = new uint[](tokenIds.length);
        for( uint256 i; i< tokenIds.length; i++){
            // Validate the token ids == owner msg sender
            require(garmentToken.ownerOf(tokenIds[i]) == _msgSender(),
                "DigitalaxGarmentUpgrader.upgrade: Token Id is not msg sender");

            // Collect info for each token
            string memory tokenUri = garmentToken.tokenURI(tokenIds[i]);
            address garmentDesigner = garmentToken.garmentDesigners(tokenIds[i]);
            uint256 primarySalePrice = garmentToken.primarySalePrice(tokenIds[i]);

            // Mint them
            uint256 newGarmentTokenId = garmentTokenV2.mint(_msgSender(), tokenUri, garmentDesigner);
            // Set primary price
            garmentTokenV2.setPrimarySalePrice(tokenIds[i], primarySalePrice);

            newTokenIds[i] = newGarmentTokenId;
        }

        // Emit completion event
        emit GarmentCreated(tokenIds, newTokenIds);
    }
}
