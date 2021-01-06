// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DigitalaxGarmentNFT.sol";
import "./DigitalaxMaterials.sol";
import "../DigitalaxAccessControls.sol";

/**
 * @title Digitalax Garment Factory
 * @dev To facilitate the creation of child and parents NFTs
 * @dev This contract needs to be given the smart contract role in order to be given access to mint tokens
 */
contract DigitalaxGarmentFactory is Context, ReentrancyGuard {

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

    constructor(
        DigitalaxGarmentNFT _garmentToken,
        DigitalaxMaterials _materials,
        DigitalaxAccessControls _accessControls
    ) public {
        garmentToken = _garmentToken;
        materials = _materials;
        accessControls = _accessControls;
    }

    /**
     @notice Creates a single child ERC1155 token
     @dev Only callable with minter role
     @return childTokenId the generated child Token ID
     */
    function createNewChild(string calldata _uri) external returns (uint256 childTokenId) {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.createNewChild: Sender must be minter"
        );
        return materials.createChild(_uri);
    }

    /**
     @notice Creates a batch of child ERC1155 tokens
     @dev Only callable with minter role
     @return childTokenIds the generated child Token IDs
     */
    function createNewChildren(string[] calldata _uris) external returns (uint256[] memory childTokenIds) {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.createNewChildren: Sender must be minter"
        );
        return materials.batchCreateChildren(_uris);
    }

    /**
     @notice Creates a child ERC1155 token with balance, assigning them to the beneficiary
     @dev Only callable with verified minter role
     @return childTokenId the generated child Token ID
     */
    function createNewChildWithVerifiedRole(
        string calldata _childTokenUri,
        uint256 _childTokenAmount
    ) external nonReentrant returns (uint256 childTokenId) {
        require(
            accessControls.hasVerifiedMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.createNewChildWithVerifiedRole: Sender must be verified minter"
        );

        // Create new children
        uint256 _childTokenId = materials.createChild(_childTokenUri);

        // Mint balances of children
        materials.mintChild(
            _childTokenId,
            _childTokenAmount,
            _msgSender(),
            abi.encodePacked("")
        );

        return _childTokenId;
    }

    /**
     @notice Creates a batch of child ERC1155 tokens with balances, assigning them to the beneficiary
     @dev Only callable with verified minter role
     */
    function createNewChildrenWithVerifiedRole(
        string[] calldata _childTokenUris,
        uint256[] calldata _childTokenAmounts
    ) external nonReentrant {
        require(
            accessControls.hasVerifiedMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.createNewChildrenWithVerifiedRole: Sender must be a verified minter"
        );

        // Create new children
        uint256[] memory childTokenIds = materials.batchCreateChildren(_childTokenUris);

        // Mint balances of children
        materials.batchMintChildren(childTokenIds, _childTokenAmounts, _msgSender(), abi.encodePacked(""));
    }

    /**
     @notice Creates a batch of child ERC1155 tokens with balances, assigning them to the beneficiary
     @dev Only callable with minter role
     */
    function createNewChildrenWithBalances(
        string[] calldata _childTokenUris,
        uint256[] calldata _childTokenAmounts,
        address _beneficiary
    ) external nonReentrant {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.createNewChildrenWithBalances: Sender must be minter"
        );

        // Create new children
        uint256[] memory childTokenIds = materials.batchCreateChildren(_childTokenUris);

        // Mint balances of children
        materials.batchMintChildren(childTokenIds, _childTokenAmounts, _beneficiary, abi.encodePacked(""));
    }

    /**
     @notice Creates a batch of child ERC1155 tokens with balances, assigning them to a newly minted garment
     @dev Only callable with minter role
     */
    function createNewChildrenWithBalanceAndGarment(
        string calldata _garmentTokenUri,
        address _designer,
        string[] calldata _childTokenUris,
        uint256[] calldata _childTokenAmounts,
        address _beneficiary
    ) external nonReentrant {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.createNewChildrenWithBalanceAndGarment: Sender must be minter"
        );

        // Generate parent 721 token
        uint256 garmentTokenId = garmentToken.mint(_beneficiary, _garmentTokenUri, _designer);

        // Create new children
        uint256[] memory childTokenIds = materials.batchCreateChildren(_childTokenUris);

        // Mint balances of children
        materials.batchMintChildren(childTokenIds, _childTokenAmounts, address(garmentToken), abi.encodePacked(garmentTokenId));
    }

    /**
     @notice Creates a single ERC721 parent token, along with a batch of assigned child ERC1155 tokens
     @dev Only callable with minter role
     */
    function mintParentWithChildren(
        string calldata garmentTokenUri,
        address designer,
        uint256[] calldata childTokenIds,
        uint256[] calldata childTokenAmounts,
        address beneficiary
    ) external nonReentrant {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.mintParentWithChildren: Sender must be minter"
        );
        // Generate parent 721 token
        uint256 garmentTokenId = garmentToken.mint(beneficiary, garmentTokenUri, designer);

        // Batch mint child tokens and assign to generated 721 token ID
        materials.batchMintChildren(childTokenIds, childTokenAmounts, address(garmentToken), abi.encodePacked(garmentTokenId));

        // Emit completion event
        emit GarmentCreated(garmentTokenId);
    }

    /**
     @notice Creates a single ERC721 parent token without any linked child tokens
     @dev Only callable with minter role
     */
    function mintParentWithoutChildren(
        string calldata garmentTokenUri,
        address designer,
        address beneficiary
    ) external nonReentrant {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.mintParentWithoutChildren: Sender must be minter"
        );

        // Generate parent 721 token
        uint256 garmentTokenId = garmentToken.mint(beneficiary, garmentTokenUri, designer);

        // Emit completion event
        emit GarmentCreated(garmentTokenId);
    }
}
