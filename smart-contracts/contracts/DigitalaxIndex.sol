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

    event DesignerGroupAdded(address _address, string uri, uint256[] collectionIds);
    event DesignerGroupRemoved(address _address);
    event DesignerGroupUpdated(address _address, string uri, uint256[] collectionIds);

    event DeveloperGroupAdded(address _address, string uri, uint256[] collectionIds);
    event DeveloperGroupRemoved(address _address);
    event DeveloperGroupUpdated(address _address, string uri, uint256[] collectionIds);

    event AuctionDeveloperGroupAdded(address _address, string uri, uint256[] auctionIds);
    event AuctionDeveloperGroupRemoved(address _address);
    event AuctionDeveloperGroupUpdated(address _address, string uri, uint256[] auctionIds);

    event AuctionDesignerGroupAdded(address _address, string uri, uint256[] auctionIds);
    event AuctionDesignerGroupRemoved(address _address);
    event AuctionDesignerGroupUpdated(address _address, string uri, uint256[] auctionIds);

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
    }

    struct DeveloperGroup {
        string uri;
        CollectionIdSet collectionIds;
    }

    struct AuctionDesignerGroup {
        string uri;
        CollectionIdSet auctionIds;
    }

    struct AuctionDeveloperGroup {
        string uri;
        CollectionIdSet auctionIds;
    }

    // Access Controls
    DigitalaxAccessControls public accessControls;

    // Mapping for designer group
    mapping(address => DesignerGroup) designerGroupSet;

    // Mapping for developer group
    mapping(address => DeveloperGroup) developerGroupSet;

    // Mapping for designer group
    mapping(address => AuctionDesignerGroup) auctionDesignerGroupSet;

    // Mapping for developer group
    mapping(address => AuctionDeveloperGroup) auctionDeveloperGroupSet;

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
    function DesignerGroupSet(address _address) external view returns (string memory  _uri, uint256[] memory collectionIds) {
        DesignerGroup memory designerGroup = designerGroupSet[_address];
        _uri = designerGroup.uri;
        collectionIds = designerGroup.collectionIds.value;
    }

    /**
     * @dev View function for developer group
     * @param _address Developer address
     */
    function DeveloperGroupSet(address _address) external view returns (string memory  _uri, uint256[] memory collectionIds) {
        DeveloperGroup memory developerGroup = developerGroupSet[_address];
        _uri = developerGroup.uri;
        collectionIds = developerGroup.collectionIds.value;
    }

    /**
     * @dev View function for developer group
     * @param _address Developer address
     */
    function AuctionDeveloperGroupSet(address _address) external view returns (string memory  _uri, uint256[] memory auctionIds) {
        AuctionDeveloperGroup memory auctionDeveloperGroup = auctionDeveloperGroupSet[_address];
        _uri = auctionDeveloperGroup.uri;
        auctionIds = auctionDeveloperGroup.auctionIds.value;
    }

    /**
     * @dev View function for designer group
     * @param _address Designer address
     */
    function AuctionDesignerGroupSet(address _address) external view returns (string memory  _uri, uint256[] memory auctionIds) {
        AuctionDesignerGroup memory auctionDesignerGroup = auctionDesignerGroupSet[_address];
        _uri = auctionDesignerGroup.uri;
        auctionIds = auctionDesignerGroup.auctionIds.value;
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
    function addDesignerGroup(address _address, string calldata _uri, uint256[] calldata _collectionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addDesignerGroup: Sender must be admin");

        designerGroupSet[_address] = DesignerGroup(_uri, CollectionIdSet(_collectionIds));
        emit DesignerGroupAdded(_address, _uri, _collectionIds);
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
     * @dev Function for designer group update
     * @param _address Address of designer to be updated
     * @param _uri ipfs uri for designer to be updated
     * @param _collectionIds Array of collection ids to be updated
     */
    function updateDesignerGroup(address _address, string calldata _uri, uint256[] calldata _collectionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.updateDesignerGroup: Sender must be admin");

        designerGroupSet[_address] = DesignerGroup(_uri, CollectionIdSet(_collectionIds));
        emit DesignerGroupUpdated(_address, _uri, _collectionIds);
    }

    /**
     * @dev Function for adding developer token group
     * @param _address Address of developer to be added
     * @param _uri ipfs uri for developer to be added
     * @param _collectionIds Array of collection ids to be added
     */
    function addDeveloperGroup(address _address, string calldata _uri, uint256[] calldata _collectionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addDeveloperGroup: Sender must be admin");

        developerGroupSet[_address] = DeveloperGroup(_uri, CollectionIdSet(_collectionIds));
        emit DeveloperGroupAdded(_address, _uri, _collectionIds);
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

    /**
     * @dev Function for developer group update
     * @param _address Address of developer to be updated
     * @param _uri ipfs uri for developer to be updated
     * @param _collectionIds Array of collection ids to be updated
     */
    function updateDeveloperGroup(address _address, string calldata _uri, uint256[] calldata _collectionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.updateDeveloperGroup: Sender must be admin");

        developerGroupSet[_address] = DeveloperGroup(_uri, CollectionIdSet(_collectionIds));
        emit DeveloperGroupUpdated(_address, _uri, _collectionIds);
    }

    /**
     * @dev Function for adding developer token group
     * @param _address Address of developer to be added
     * @param _uri ipfs uri for developer to be added
     * @param _auctionIds Array of auction ids to be added
     */
    function addAuctionDeveloperGroup(address _address, string calldata _uri, uint256[] calldata _auctionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addAuctionDeveloperGroup: Sender must be admin");

        auctionDeveloperGroupSet[_address] = AuctionDeveloperGroup(_uri, CollectionIdSet(_auctionIds));
        emit AuctionDeveloperGroupAdded(_address, _uri, _auctionIds);
    }

    /**
     * @dev Funtion for removal of developer group
     * @param _address Address of developer to be deleted
     */
    function removeAuctionDeveloperGroup(address _address) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeAuctionDeveloperGroup: Sender must be admin");

        delete auctionDeveloperGroupSet[_address];

        emit AuctionDeveloperGroupRemoved(_address);
    }

    /**
     * @dev Function for developer group update
     * @param _address Address of developer to be updated
     * @param _uri ipfs uri for developer to be updated
     * @param _auctionIds Array of auction ids to be updated
     */
    function updateAuctionDeveloperGroup(address _address, string calldata _uri, uint256[] calldata _auctionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.updateAuctionDeveloperGroup: Sender must be admin");

        auctionDeveloperGroupSet[_address] = AuctionDeveloperGroup(_uri, CollectionIdSet(_auctionIds));
        emit AuctionDeveloperGroupUpdated(_address, _uri, _auctionIds);
    }

    /**
     * @dev Function for adding designer token group
     * @param _address Address of designer to be added
     * @param _uri ipfs uri for designer to be added
     * @param _auctionIds Array of auction ids to be added
     */
    function addAuctionDesignerGroup(address _address, string calldata _uri, uint256[] calldata _auctionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addAuctionDesignerGroup: Sender must be admin");

        auctionDesignerGroupSet[_address] = AuctionDesignerGroup(_uri, CollectionIdSet(_auctionIds));
        emit AuctionDesignerGroupAdded(_address, _uri, _auctionIds);
    }

    /**
     * @dev Funtion for removal of designer group
     * @param _address Address of designer to be deleted
     */
    function removeAuctionDesignerGroup(address _address) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeAuctionDesignerGroup: Sender must be admin");

        delete auctionDesignerGroupSet[_address];

        emit AuctionDesignerGroupRemoved(_address);
    }

    /**
     * @dev Function for designer group update
     * @param _address Address of designer to be updated
     * @param _uri ipfs uri for designer to be updated
     * @param _auctionIds Array of auction ids to be updated
     */
    function updateAuctionDesignerGroup(address _address, string calldata _uri, uint256[] calldata _auctionIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.updateAuctionDesignerGroup: Sender must be admin");

        auctionDesignerGroupSet[_address] = AuctionDesignerGroup(_uri, CollectionIdSet(_auctionIds));
        emit AuctionDesignerGroupUpdated(_address, _uri, _auctionIds);
    }
}
