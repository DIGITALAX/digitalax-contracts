// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DigitalaxAccessControls.sol";

/**
 * @notice Digitalax Index contract
 */
contract DigitalaxIndex is Context {
    using SafeMath for uint256;
    using Address for address;

    // DigitalaxIndex Events
    event CollectionGroupAdded(uint256 indexed sid, uint256[] auctions, uint256[] collections, uint256 digiBundleCollection);
    event CollectionGroupRemoved(uint256 indexed sid);
    event CollectionGroupUpdated(uint256 indexed sid, uint256[] auctions, uint256[] collections, uint256 digiBundleCollection);

    event DesignerGroupAdded(address address, string uri, uint256[] tokenIds);
    event DesignerGroupRemoved(address address, string uri);
    event DesignerGroupUpdated(address address, string uri, uint256[] tokenIds);

    // Structure for set of token ids
    struct TokenIdSet {
        uint256[] value;
    }

    struct CollectionGroup {
        TokenIdSet auctions;
        TokenIdSet collections;
        uint256 digiBundleCollection;
    }

    struct DesignerGroup {
        string uri;
        TokenIdSet tokens;
    }

    // Access Controls
    DigitalaxAccessControls public accessControls;

    // Array for designer set
    TokenIdSet[] designerSet;

    // Mapping for designer group
    mapping(address => DesignerGroup) designerGroupSet;

    // Array for Collection Groups
    CollectionGroup[] collectionGroupSet;


    /**
     * @dev Constructor of DigitalaxIndex contract
     * @param _accessControls AccessControls
     */
    constructor(DigitalaxAccessControls _accessControls) public {
        require(address(_accessControls) != address(0), "DigitalaxIndex: Invalid Access Controls");
        accessControls = _accessControls;
    }

    /**
     * @dev Function to update access controls
     * @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.updateAccessControls: Sender must be admin");
        require(address(_accessControls) != address(0), "DigitalaxIndex.updateAccessControls: Zero Address");
        accessControls = _accessControls;
    }

    /**
     * @dev View function for auction set
     * @param _sid Id of auction set
     */
    function CollectionSet(uint256 _sid) external view returns (uint256[] memory auctionIds, uint256[] memory collectionIds,uint256 digiBundleCollectionId) {
        TokenIdSet memory auctionSet = collectionGroupSet[_sid].auctions;
        auctionIds = auctionSet.value;

        TokenIdSet memory collectionSet = collectionGroupSet[_sid].collections;
        collectionIds = collectionSet.value;

        digiBundleCollectionId = collectionGroupSet[_sid].digiBundleCollection;
    }

    /**
     * @dev View function for designer set
     * @param _sid Designer Id
     */
    function DesignerSet(uint256 _sid) external view returns (uint256[] memory tokenIds) {
        TokenIdSet memory set = designerSet[_sid];
        tokenIds = set.value;
    }

    /**
     * @dev Function for adding set
     * @param _auctionTokenIds Array of token ids to be added
     * @param _collectionIds Array of token ids to be added
     * @param digiBundleCollectionId token id
     */
    function addCollectionGroup(uint256[] calldata _auctionTokenIds, uint256[] calldata _collectionIds, uint256 digiBundleCollectionId) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addAuctionSet: Sender must be admin");

        uint256 index = collectionGroupSet.length;
        collectionGroupSet.push(CollectionGroup(TokenIdSet(_auctionTokenIds), TokenIdSet(_collectionIds), digiBundleCollectionId));
        emit CollectionGroupAdded(index, _auctionTokenIds, _collectionIds, digiBundleCollectionId);
    }

    /**
     * @dev Funtion for removal of set
     * @param _sid Id of auction set
     */
    function removeCollectionGroup(uint256 _sid) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeAuctionSet: Sender must be admin");

        CollectionGroup storage set = collectionGroupSet[_sid];
        delete set.digiBundleCollection;
        delete set.auctions.value;
        delete set.collections.value;
        emit CollectionGroupRemoved(_sid);
    }

    /**
     * @dev Function for auction set update
     * @param _sid Id of set
     * @param _auctionTokenIds Array of token ids to be added
     * @param _collectionIds Array of token ids to be added
     * @param digiBundleCollectionId token id
     */
    function updateAuctionSet(uint256 _sid, uint256[] calldata _auctionTokenIds, uint256[] calldata _collectionIds, uint256 digiBundleCollectionId) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeAuctionSet: Sender must be admin");

        CollectionGroup storage set = collectionGroupSet[_sid];
        set.digiBundleCollection = digiBundleCollectionId;
        set.auctions.value = _auctionTokenIds;
        set.collections.value = _collectionIds;
        emit CollectionGroupUpdated(_sid, _auctionTokenIds, _collectionIds, digiBundleCollectionId);
    }

    /**
     * @dev Function for adding designer token group
     * @param address Address of designer to be added
     * @param _uri ipfs uri for designer to be added
     * @param _tokenIds Array of token ids to be added
     */
    function addDesignerGroup(address address, string _uri, uint256[] calldata _tokenIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addDesignerGroup: Sender must be admin");
        require(address == address(0), "DigitalaxIndex.addDesignerGroup: address must not be zero address.");
        require(designerGroupSet[address].uri, "DigitalaxIndex.addDesignerGroup: designer already exists.");

        designerGroupSet[address] = DesignerGroup(_uri, TokenIdSet(_tokenIds));
        emit DesignerGroupAdded(address, _uri, _tokenIds);
    }

    /**
     * @dev Funtion for removal of designer group
     * @param address Address of designer to be deleted
     */
    function removeDesignerGroup(address address) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeDesignerGroup: Sender must be admin");
        require(!designerGroupSet[address].uri, "DigitalaxIndex.removeDesignerGroup: designer is not existed.");

        delete designerGroupSet[address];

        emit DesignerGroupRemoved(address);
    }

    /**
     * @dev Function for designer group update
     * @param address Address of designer to be updated
     * @param _uri ipfs uri for designer to be updated
     * @param _tokenIds Array of token ids to be updated
     */
    function updateDesignerGroup(address address, string _uri, uint256[] calldata _tokenIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.updateDesignerGroup: Sender must be admin");
        require(!designerGroupSet[address].uri, "DigitalaxIndex.updateDesignerGroup: designer is not existed.");

        designerGroupSet[address] = DesignerGroup(_uri, TokenIdSet(_tokenIds));
        emit DesignerGroupUpdated(address, _uri, _tokenIds);
    }
}
