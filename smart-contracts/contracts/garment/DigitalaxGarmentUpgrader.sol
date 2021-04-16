// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DigitalaxGarmentNFT.sol";
import "./DigitalaxGarmentNFTv2.sol";
import "./DigitalaxMaterials.sol";
import "../DigitalaxAccessControls.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

/**
 * @title Digitalax Garment Factory
 * @dev To facilitate the creation of child and parents NFTs
 * @dev This contract needs to be given the smart contract role in order to be given access to mint tokens
 */
contract DigitalaxGarmentUpgrader is ReentrancyGuard, BaseRelayRecipient, Initializable  {

    // @notice event emitted on garment creation
    event GarmentUpgraded(
        uint256[] indexed oldGarmentTokenIds,
        uint256[] indexed newGarmentTokenIds
    );
    event UpdateAccessControls(
        address indexed accessControls
    );
    // @notice the parent ERC721 garment token
    DigitalaxGarmentNFT public garmentToken;

    // @notice the parent ERC721 garment token
    DigitalaxGarmentNFTv2 public garmentTokenV2;

    // @notice access controls
    DigitalaxAccessControls public accessControls;

    function initialize(
        DigitalaxGarmentNFT _garmentToken,
        DigitalaxGarmentNFTv2 _garmentTokenV2,
        DigitalaxAccessControls _accessControls,
        address _trustedForwarder
    ) public initializer {
        require(address(_accessControls) != address(0), "DigitalaxGarmentUpgrader: Invalid Access Controls");
        require(address(_garmentToken) != address(0), "DigitalaxGarmentUpgrader: Invalid NFT");
        require(address(_garmentTokenV2) != address(0), "DigitalaxGarmentUpgrader: Invalid NFT V2");
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
            "DigitalaxGarmentUpgrader.setTrustedForwarder: Sender must be admin"
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
        uint256[] memory tokenIds
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
            if(primarySalePrice > 0) {
                garmentTokenV2.setPrimarySalePrice(newGarmentTokenId, primarySalePrice);
            }

            newTokenIds[i] = newGarmentTokenId;

            // Need to setApprovalForAll before calling this method.
            garmentToken.burn(tokenIds[i]);
        }

        // Emit completion event
        emit GarmentUpgraded(tokenIds, newTokenIds);
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMarketplace.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "DigitalaxMarketplace.updateAccessControls: Zero Address");
        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }
}
