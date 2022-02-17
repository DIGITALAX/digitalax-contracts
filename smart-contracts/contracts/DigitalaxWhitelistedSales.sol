pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "./DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

interface IDigiCollection {
    // Might not be needed
//    function getCollection(uint256 _collectionId)
//    external
//    view
//    returns (uint256[] memory _garmentTokenIds, uint256 _amount, string memory _tokenUri, address _designer);

    function mintCollection(
        string calldata _tokenUri,
        address _designer,
        uint256 _amount,
        uint256 _auctionId,
        string calldata _rarity,
        uint256[] calldata _childTokenIds,
        uint256[] calldata _childTokenAmounts
    ) external returns (uint256);
}

interface IDigiMarketplace {
    function createOffer(
        uint256 _garmentCollectionId,
        uint256 _primarySalePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        uint256 _platformFee,
        uint256 _discountToPayERC20,
        uint256 _maxAmount
    ) external;
}

interface IDigiIndex {
    function addCollectionGroup(uint256[] calldata _auctionTokenIds, uint256[] calldata _collectionIds, uint256 digiBundleCollectionId) external;
}
/**
 * @title Digitalax Garment NFT a.k.a. parent NFTs
 * @dev Issues ERC-721 tokens as well as being able to hold child 1155 tokens
 */
contract DigitalaxWhitelistedSales{
    using SafeMath for uint256;
    bool initialized;
    DigitalaxAccessControls accessControls;
    IDigiCollection collection;
    IDigiMarketplace marketplace;
    IDigiIndex index;

    // People that can submit tokens are whitelisters
    mapping(address => uint256) whitelisterIndex;
    address[] public whitelisters;

    event AddWhitelister(
        address user
    );

    event RemoveWhitelister(
        address user
    );

    function initialize(DigitalaxAccessControls _accessControls, IDigiCollection _collection, IDigiMarketplace _marketplace, IDigiIndex _index) public {
        require(!initialized);
        accessControls = _accessControls;
        collection = _collection;
        marketplace = _marketplace;
        index = _index;
        initialized = true;
    }

    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "updateAccessControls: Zero Address");
        accessControls = _accessControls;
    }

    function updateContracts(IDigiCollection _collection, IDigiMarketplace _marketplace, IDigiIndex _index) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "updateAccessControls: Sender must be admin"
        );
        require(address(_collection) != address(0), "Zero Address");
        require(address(_marketplace) != address(0), "Zero Address");
        require(address(_index) != address(0), "Zero Address");
        collection = _collection;
        marketplace = _marketplace;
        index = _index;
    }

    //start here
    function addWhitelister(address _user) public {
        require(_user != address(0), "DigitalaxWhitelistedSales.addWhitelister: Please add valid address");
        require(!checkWhitelister(_user), "DigitalaxWhitelistedSales.removeWhitelister: Whitelister must not exist");
        require(
            accessControls.hasSmartContractRole(msg.sender) || accessControls.hasAdminRole(msg.sender),
            "DigitalaxWhitelistedSales.addWhitelister: Sender must be an authorised contract or admin"
        );

        uint256 index = whitelisters.length;
        whitelisters.push(_user);
        whitelisterIndex[_user] = index;
        emit AddWhitelister(_user);
    }

    function removeWhitelister(address _user) public {
        require(checkWhitelister(_user), "DigitalaxWhitelistedSales.removeWhitelister: Whitelister must already exist");
        require(
            accessControls.hasSmartContractRole(msg.sender) || accessControls.hasAdminRole(msg.sender),
            "DigitalaxWhitelistedSales.removeWhitelister: Sender must be an authorised contract or admin"
        );

        uint256 rowToDelete = whitelisterIndex[_user];
        address keyToMove = whitelisters[whitelisters.length-1];
        whitelisters[rowToDelete] = keyToMove;
        whitelisterIndex[keyToMove] = rowToDelete;
        whitelisters.pop();
        delete(whitelisterIndex[_user]);
        emit RemoveWhitelister(_user);
    }

    function checkWhitelister(address _user) public view returns (bool isAddress) {
        if (whitelisters.length == 0 ) {
            return false;
        }
        if(whitelisterIndex[_user] == 0 && whitelisters[0] != _user){
            return false;
        }
        return (whitelisters[whitelisterIndex[_user]] == _user);
    }

    function getWhitelisters() external view returns (address[] memory _whitelisters){
       return whitelisters;
    }

    function getNumberOfWhitelisters() external view returns (uint256){
       return whitelisters.length;
    }

    // Function that will do all tasks
    function mintAndList(string calldata _tokenUri,
        uint256 _amount,
//        uint256 _auctionId,
//        string calldata _rarity,
        uint256[] calldata _childTokenIds,
        uint256[] calldata _childTokenAmounts,
        uint256 _primarySalePrice) public {
        require(checkWhitelister(msg.sender), "Sender must be whitelisted");
        require(_amount < uint256(21), "Max is 20 items");
        uint256 collectionId = collection.mintCollection(
                    _tokenUri,
                    msg.sender,
                    _amount,
                    uint256(0),
                    "Common", // Need more logic
                    _childTokenIds,
                    _childTokenAmounts);

        marketplace.createOffer(
                    collectionId,
                    _primarySalePrice,
                    _getNow(),
                    _getNow().add(31536000), // Need to configure how long offers will stay
                    150, // Need to configure platform fee
                    0,
                    _amount);

        uint256[] storage empty;
        uint256[] storage collectionIdArray;
        collectionIdArray.push(collectionId);
        index.addCollectionGroup(empty,collectionIdArray, 0);

    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

}
