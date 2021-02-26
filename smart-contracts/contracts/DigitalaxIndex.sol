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
    event AuctionSetAdded(uint256 sid, uint256[] tokenIds);
    event AuctionSetRemoved(uint256 sid);
    event AuctionSetUpdated(uint256 sid, uint256[] tokenIds);
    event DesignerSetAdded(uint256 sid, uint256[] tokenIds);
    event DesignerSetRemoved(uint256 sid);
    event DesignerSetUpdated(uint256 sid, uint256[] tokenIds);
    event DesignerInfoUpdated(uint256 designerId, string uri);

    // Structure for set of token ids
    struct TokenIdSet {
        uint256[] value;
    }

    // Access Controls
    DigitalaxAccessControls public accessControls;

    // Array for auction set
    TokenIdSet[] auctionSet;

    // Array for designer set
    TokenIdSet[] designerSet;

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
    function AuctionSet(uint256 _sid) external view returns (uint256[] memory tokenIds) {
        TokenIdSet memory set = auctionSet[_sid];
        tokenIds = set.value;
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
     * @dev Function for adding auction set
     * @param _tokenIds Array of token ids to be added
     */
    function addAuctionSet(uint256[] calldata _tokenIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.addAuctionSet: Sender must be admin");

        uint256 index = auctionSet.length;
        auctionSet.push(TokenIdSet(_tokenIds));
        emit AuctionSetAdded(index, _tokenIds);
    }

    /**
     * @dev Funtion for removal of auction set
     * @param _sid Id of auction set
     */
    function removeAuctionSet(uint256 _sid) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeAuctionSet: Sender must be admin");
        
        TokenIdSet storage set = auctionSet[_sid];
        delete set.value;
        emit AuctionSetRemoved(_sid);
    }

    /**
     * @dev Function for auction set update
     * @param _sid Id of auction set
     * @param _tokenIds Array of token ids to be updated
     */
    function updateAuctionSet(uint256 _sid, uint256[] calldata _tokenIds) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxIndex.removeAuctionSet: Sender must be admin");
        
        TokenIdSet storage set = auctionSet[_sid];
        set.value = _tokenIds;
        emit AuctionSetUpdated(_sid, _tokenIds);
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