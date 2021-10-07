// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DigitalaxGarmentNFT.sol";
import "./DigitalaxMaterials.sol";
import "../DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

/**
 * @title Digitalax Garment Factory
 * @dev To facilitate the creation of child and parents NFTs
 * @dev This contract needs to be given the smart contract role in order to be given access to mint tokens
 */
contract DigitalaxMaterialsV2Attacher is Context, ReentrancyGuard, Initializable {

    // @notice event emitted on garment creation
    event GarmentCreated(
        uint256 indexed garmentTokenId
    );

    // @notice the parent ERC721 garment token
    DigitalaxGarmentNFT public garmentToken;

    // @notice the child ERC1155 strand tokens
    DigitalaxMaterials public materials;

    // @notice access controls
    DigitalaxAccessControls public accessControls;

    function initialize (
        DigitalaxGarmentNFT _garmentToken,
        DigitalaxMaterials _materials,
        DigitalaxAccessControls _accessControls
    ) public initializer {
        garmentToken = _garmentToken;
        materials = _materials;
        accessControls = _accessControls;
    }

    /**
     @notice Creates a single ERC721 parent token, along with a batch of assigned child ERC1155 tokens
     @dev Only callable with minter role
     */
    function attachERC1155ToExisting721(
        uint256[] calldata garmentTokenIds,
        uint256[] calldata childTokenIds,
        uint256[] calldata childTokenAmounts
    ) external nonReentrant {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxMaterialsV2Attacher.mintERC721ToExistingTokens: Sender must be minter"
        );

        require(childTokenAmounts.length == childTokenIds.length,
            "DigitalaxMaterialsV2Attacher.mintERC721ToExistingTokens: Requires equal length arrays"
        );

        for(uint i = 0; i < garmentTokenIds.length; i += 1) {
            // Batch mint child tokens and assign to generated 721 token ID
            materials.batchMintChildren(childTokenIds, childTokenAmounts, address(garmentToken), abi.encodePacked(garmentTokenIds[i]));
        }
    }
}
