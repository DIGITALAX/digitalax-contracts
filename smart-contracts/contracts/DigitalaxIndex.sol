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

    event DesignerSetAdded(uint256 indexed sid, uint256[] tokenIds);
    event DesignerSetRemoved(uint256 indexed sid);
    event DesignerSetUpdated(uint256 indexed sid, uint256[] tokenIds);
    event DesignerInfoUpdated(uint256 indexed designerId, string uri);

    // Structure for set of token ids
    struct TokenIdSet {
        uint256[] value;
    }

    struct CollectionGroup {
        TokenIdSet auctions;
        TokenIdSet collections;
        uint256 digiBundleCollection;
    }

    // Access Controls
    DigitalaxAccessControls public accessControls;

    // Array for designer set
    TokenIdSet[] designerSet;

    // Array for Collection Groups
    CollectionGroup[] collectionGroupSet;

    // Mapping for designer info
    mapping(uint256 => string) public designerInfo;

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
     * @dev Function for adding designer token set
     * @param _tokenIds Array of token ids to be added
     */
    function addDesignerSet(uint256[] calldata _tokenIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addDesignerSet: Sender must be admin");

        uint256 index = designerSet.length;
        designerSet.push(TokenIdSet(_tokenIds));
        emit DesignerSetAdded(index, _tokenIds);
    }

    /**
     * @dev Funtion for removal of designer set
     * @param _sid Id of designer set
     */
    function removeDesignerSet(uint256 _sid) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeDesignerSet: Sender must be admin");

        TokenIdSet storage set = designerSet[_sid];
        delete set.value;
        emit DesignerSetRemoved(_sid);
    }

    /**
     * @dev Function for designer set update
     * @param _sid Id of designer set
     * @param _tokenIds Array of token ids to be updated
     */
    function updateDesignerSet(uint256 _sid, uint256[] calldata _tokenIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.updateDesignerSet: Sender must be admin");

        TokenIdSet storage set = designerSet[_sid];
        set.value = _tokenIds;
        emit DesignerSetUpdated(_sid, _tokenIds);
    }

    /**
     * @dev Function to update designer info
     * @param _designerId Designer Id
     * @param _uri IPFS uri for designer info
     */
    function updateDesignerInfo(uint256 _designerId, string memory _uri) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.updateDesignerInfo: Sender must be admin");

        designerInfo[_designerId] = _uri;
        emit DesignerInfoUpdated(_designerId, _uri);
    }
}
