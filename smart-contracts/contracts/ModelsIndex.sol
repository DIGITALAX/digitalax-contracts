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
contract ModelsIndex is Context {
    using SafeMath for uint256;
    using Address for address;

    // DigitalaxIndex Events
    event CollectionGroupAdded(uint256 indexed sid, uint256[] auctions, uint256[] collections, uint256 digiBundleCollection);
    event CollectionGroupRemoved(uint256 indexed sid);
    event CollectionGroupUpdated(uint256 indexed sid, uint256[] auctions, uint256[] collections, uint256 digiBundleCollection);

    event DesignerGroupAdded(address _address, string uri, uint256[] collectionIds, uint256[] auctionIds);
    event ModelGroupAdded(address _address, string uri, uint256[] collectionIds, uint256[] auctionIds);
    event DeveloperGroupAdded(address _address, string uri, uint256[] collectionIds, uint256[] auctionIds);

    event DesignerGroupRemoved(address _address);
    event ModelGroupRemoved(address _address);
    event DeveloperGroupRemoved(address _address);


    // Structure for set of token ids
    struct TokenIdSet {
        uint256[] value;
    }

    struct CollectionIdSet {
        uint256[] value;
    }

    struct CollectionGroup {
        TokenIdSet auctions;
        TokenIdSet collections;
        uint256 digiBundleCollection;
    }

    struct DesignerGroup {
        string uri;
        CollectionIdSet collectionIds;
        CollectionIdSet auctionIds;
    }

    struct DeveloperGroup {
        string uri;
        CollectionIdSet collectionIds;
        CollectionIdSet auctionIds;
    }

    struct ModelGroup {
        string uri;
        CollectionIdSet collectionIds;
        CollectionIdSet auctionIds;
    }

    // Access Controls
    DigitalaxAccessControls public accessControls;

    // Mapping for designer group
    mapping(address => DesignerGroup) designerGroupSet;

    // Mapping for developer group
    mapping(address => DeveloperGroup) developerGroupSet;

    // Mapping for model group
    mapping(address => ModelGroup) modelGroupSet;

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
     * @dev View function for designer group
     * @param _address Designer address
     */
    function DesignerGroupSet(address _address) external view returns (string memory  _uri, uint256[] memory collectionIds, uint256[] memory auctionIds) {
        DesignerGroup memory designerGroup = designerGroupSet[_address];
        _uri = designerGroup.uri;
        collectionIds = designerGroup.collectionIds.value;
        auctionIds = designerGroup.auctionIds.value;
    }

    /**
     * @dev View function for model group
     * @param _address Model address
     */
    function ModelGroupSet(address _address) external view returns (string memory  _uri, uint256[] memory collectionIds, uint256[] memory auctionIds) {
        ModelGroup memory modelGroup = modelGroupSet[_address];
        _uri = modelGroup.uri;
        collectionIds = modelGroup.collectionIds.value;
        auctionIds = modelGroup.auctionIds.value;
    }

    /**
     * @dev View function for developer group
     * @param _address Developer address
     */
    function DeveloperGroupSet(address _address) external view returns (string memory  _uri, uint256[] memory collectionIds, uint256[] memory auctionIds) {
        DeveloperGroup memory developerGroup = developerGroupSet[_address];
        _uri = developerGroup.uri;
        collectionIds = developerGroup.collectionIds.value;
        auctionIds = developerGroup.auctionIds.value;
    }

    /**
     * @dev Function for adding set
     * @param _auctionTokenIds Array of token ids to be added
     * @param _collectionIds Array of token ids to be added
     * @param digiBundleCollectionId token id
     */
    function addCollectionGroup(uint256[] calldata _auctionTokenIds, uint256[] calldata _collectionIds, uint256 digiBundleCollectionId) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addCollectionGroup: Sender must be admin");

        uint256 index = collectionGroupSet.length;
        collectionGroupSet.push(CollectionGroup(TokenIdSet(_auctionTokenIds), TokenIdSet(_collectionIds), digiBundleCollectionId));
        emit CollectionGroupAdded(index, _auctionTokenIds, _collectionIds, digiBundleCollectionId);
    }

    /**
     * @dev Funtion for removal of set
     * @param _sid Id of auction set
     */
    function removeCollectionGroup(uint256 _sid) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeCollectionGroup: Sender must be admin");

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
    function updateCollectionGroup(uint256 _sid, uint256[] calldata _auctionTokenIds, uint256[] calldata _collectionIds, uint256 digiBundleCollectionId) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.updateCollectionGroup: Sender must be admin");

        CollectionGroup storage set = collectionGroupSet[_sid];
        set.digiBundleCollection = digiBundleCollectionId;
        set.auctions.value = _auctionTokenIds;
        set.collections.value = _collectionIds;
        emit CollectionGroupUpdated(_sid, _auctionTokenIds, _collectionIds, digiBundleCollectionId);
    }

    /**
     * @dev Function for adding designer token group
     * @param _address Address of designer to be added
     * @param _uri ipfs uri for designer to be added
     * @param _collectionIds Array of collection ids to be added
     */
    function addDesignerGroup(address _address, string calldata _uri, uint256[] calldata _collectionIds, uint256[] calldata _auctionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addDesignerGroup: Sender must be admin");

        designerGroupSet[_address] = DesignerGroup(_uri, CollectionIdSet(_collectionIds), CollectionIdSet(_auctionIds));
        emit DesignerGroupAdded(_address, _uri, _collectionIds, _auctionIds);
    }

    /**
     * @dev Funtion for removal of designer group
     * @param _address Address of designer to be deleted
     */
    function removeDesignerGroup(address _address) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeDesignerGroup: Sender must be admin");

        delete designerGroupSet[_address];

        emit DesignerGroupRemoved(_address);
    }

    /**
     * @dev Function for adding model token group
     * @param _address Address of model to be added
     * @param _uri ipfs uri for model to be added
     * @param _collectionIds Array of collection ids to be added
     */
    function addModelGroup(address _address, string calldata _uri, uint256[] calldata _collectionIds, uint256[] calldata _auctionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addModelGroup: Sender must be admin");

        modelGroupSet[_address] = ModelGroup(_uri, CollectionIdSet(_collectionIds), CollectionIdSet(_auctionIds));
        emit ModelGroupAdded(_address, _uri, _collectionIds, _auctionIds);
    }

    /**
     * @dev Funtion for removal of model group
     * @param _address Address of model to be deleted
     */
    function removeModelGroup(address _address) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeModelGroup: Sender must be admin");

        delete modelGroupSet[_address];

        emit ModelGroupRemoved(_address);
    }

    /**
     * @dev Function for adding developer token group
     * @param _address Address of developer to be added
     * @param _uri ipfs uri for developer to be added
     * @param _collectionIds Array of collection ids to be added
     */
    function addDeveloperGroup(address _address, string calldata _uri, uint256[] calldata _collectionIds, uint256[] calldata _auctionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addDeveloperGroup: Sender must be admin");

        developerGroupSet[_address] = DeveloperGroup(_uri, CollectionIdSet(_collectionIds), CollectionIdSet(_auctionIds));

        emit DeveloperGroupAdded(_address, _uri, _collectionIds, _auctionIds);
    }

    /**
     * @dev Funtion for removal of developer group
     * @param _address Address of developer to be deleted
     */
    function removeDeveloperGroup(address _address) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeDeveloperGroup: Sender must be admin");

        delete developerGroupSet[_address];

        emit DeveloperGroupRemoved(_address);
    }
}
