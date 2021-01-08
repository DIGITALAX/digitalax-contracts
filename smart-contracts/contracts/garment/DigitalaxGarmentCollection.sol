// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../DigitalaxAccessControls.sol";
import "./IDigitalaxMaterials.sol";
import "./IDigitalaxGarmentNFT.sol";

/**
 * @notice Collection contract for Digitalax NFTs
 */
contract DigitalaxGarmentCollection is Context, ReentrancyGuard {
    using SafeMath for uint256;
    using Address for address payable;

    /// @notice Event emitted only on construction. To be used by indexers
    event DigitalaxGarmentCollectionContractDeployed();
    event MintGarmentCollection(
        uint256 collectionId
    );
    event BurnGarmentCollection(
        uint256 collectionId
    );

    /// @notice Parameters of a NFTs Collection
    struct Collection {
        uint256[] garmentTokenIds;
        uint256 garmentAmount;
        string metadata;
        address designer;
    }
    /// @notice Garment ERC721 NFT - the only NFT that can be offered in this contract
    IDigitalaxGarmentNFT public garmentNft;
    /// @notice responsible for enforcing admin access
    DigitalaxAccessControls public accessControls;
    /// @dev Array of garment collections
    Collection[] private garmentCollections;
    /// @notice the child ERC1155 strand tokens
    IDigitalaxMaterials public materials;

    /// @dev max ERC721 Garments a Collection can hold
    /// @dev if admin configuring this value, recommend no higher then 40 garments/collection due to gas
    uint256 public maxGarmentsPerCollection = 10;

    /**
     @param _accessControls Address of the Digitalax access control contract
     @param _garmentNft Garment NFT token address
     */
    constructor(
        DigitalaxAccessControls _accessControls,
        IDigitalaxGarmentNFT _garmentNft,
        IDigitalaxMaterials _materials
    ) public {
        require(address(_accessControls) != address(0), "DigitalaxGarmentCollection: Invalid Access Controls");
        require(address(_garmentNft) != address(0), "DigitalaxGarmentCollection: Invalid NFT");
        require(address(_materials) != address(0), "DigitalaxGarmentCollection: Invalid Child ERC1155 address");
        accessControls = _accessControls;
        garmentNft = _garmentNft;
        materials = _materials;

        emit DigitalaxGarmentCollectionContractDeployed();
    }

    /**
     @notice Method for mint the NFT collection with the same metadata
     @param _beneficiary Recipient of the NFT collection
     @param _tokenUri URI for the metadata
     @param _designer Garment designer address
     @param _amount NFTs amount of the collection
     */
    function mintCollection(
        address _beneficiary,
        string calldata _tokenUri,
        address _designer,
        uint256 _amount,
        uint256[] calldata _childTokenIds,
        uint256[] calldata _childTokenAmounts
    ) external returns (uint256) {
        require(
            accessControls.hasAdminRole(_msgSender()) || accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentCollection.mintCollection: Sender must have the minter or contract role"
        );

        require(
            _amount <= maxGarmentsPerCollection,
            "DigitalaxGarmentCollection.mintCollection: Amount cannot exceed maxGarmentsPerCollection"
        );

        Collection memory _newCollection = Collection(new uint256[](0), _amount, _tokenUri, _designer);
        uint256 _collectionId = garmentCollections.length;
        garmentCollections.push(_newCollection);

        for (uint i = 0; i < _amount; i ++) {
            uint256 _mintedTokenId = garmentNft.mint(_beneficiary, _tokenUri, _designer);

            // Batch mint child tokens and assign to generated 721 token ID
            materials.batchMintChildren(_childTokenIds, _childTokenAmounts, address(garmentNft), abi.encodePacked(_mintedTokenId));
            garmentCollections[_collectionId].garmentTokenIds.push(_mintedTokenId);
        }

        emit MintGarmentCollection(_collectionId);
        return _collectionId;
    }

    /**
     @notice Method for burn the NFT collection by given collection id
     @param _collectionId Id of the collection
     */
    function burnCollection(uint256 _collectionId) external {
        Collection storage collection = garmentCollections[_collectionId];

        for (uint i = 0; i < collection.garmentAmount; i ++) {
            garmentNft.burn(collection.garmentTokenIds[i]);
        }
        emit BurnGarmentCollection(_collectionId);
        delete garmentCollections[_collectionId];
    }

    /**
     @notice Method for updating max nfts garments a collection can hold
     @dev Only admin
     @param _maxGarmentsPerCollection uint256 the max children a token can hold
     */
    function updateMaxGarmentsPerCollection(uint256 _maxGarmentsPerCollection) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxGarmentCollection.updateMaxGarmentsPerCollection: Sender must be admin");
        maxGarmentsPerCollection = _maxGarmentsPerCollection;
    }

    /**
     @notice Method for getting the collection by given collection id
     @param _collectionId Id of the collection
     */
    function getCollection(uint256 _collectionId)
    external
    view
    returns (uint256[] memory _garmentTokenIds, uint256 _amount, string memory _tokenUri, address _designer) {
        Collection memory collection = garmentCollections[_collectionId];
        return (
            collection.garmentTokenIds,
            collection.garmentAmount,
            collection.metadata,
            collection.designer
        );
    }

    /**
     @notice Method for getting NFT tokenIds of the collection.
     @param _collectionId Id of the collection
     */
    function getTokenIds(uint256 _collectionId) external view returns (uint256[] memory _garmentTokenIds) {
        Collection memory collection = garmentCollections[_collectionId];
        return collection.garmentTokenIds;
    }

    /**
     @notice Method for getting max supply of the collection.
     @param _collectionId Id of the collection
     */
    function getSupply(uint256 _collectionId) external view returns (uint256) {
        Collection storage collection = garmentCollections[_collectionId];
        return collection.garmentAmount;
    }

    /**
     @notice Method for getting the NFT amount for the given address and collection id
     @param _collectionId Id of the collection
     @param _address Given address
     */
    function balanceOfAddress(uint256 _collectionId, address _address) external view returns (uint256) {
        return _balanceOfAddress(_collectionId, _address);
    }

    /**
     @notice Method for checking if someone owns the collection
     @param _collectionId Id of the collection
     @param _address Given address
     */
    function hasOwnedOf(uint256 _collectionId, address _address) external view returns (bool) {
        Collection storage collection = garmentCollections[_collectionId];
        uint256 amount = _balanceOfAddress(_collectionId, _address);
        return amount == collection.garmentAmount;
    }

    /**
     @notice Internal method for getting the NFT amount of the collection
     */

    function _balanceOfAddress(uint256 _collectionId, address _address) internal virtual view returns (uint256) {
        Collection storage collection = garmentCollections[_collectionId];
        uint256 _amount;
        for (uint i = 0; i < collection.garmentAmount; i ++) {
            if (garmentNft.ownerOf(collection.garmentTokenIds[i]) == _address) {
                _amount = _amount.add(1);
            }
        }
        return _amount;
    }

    /**
     @notice Method for updating the access controls contract
     @dev Only admin
     @param _accessControls Address of the new access controls contract
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxGarmentCollection.updateAccessControls: Sender must be admin");
        accessControls = _accessControls;
    }
}
