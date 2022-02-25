pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "./DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

interface IDigiCollection {
    function mintCollection(
        string calldata _tokenUri,
        address _designer,
        address _model,
        uint256 _amount,
        uint256 _auctionId,
        string calldata _rarity,
        uint256[] calldata _childTokenIds,
        uint256[] calldata _childTokenAmounts
    ) external returns (uint256);

    function getTokenIds(uint256 _collectionId) external view returns (uint256[] memory _garmentTokenIds);
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

    function cancelOffer(uint256 _garmentCollectionId) external;
}

interface IDigiIndex {
   function removeCollectionGroup(uint256 _sid) external;
    function addCollectionGroup(uint256[] calldata _auctionTokenIds, uint256[] calldata _collectionIds, uint256 digiBundleCollectionId) external;
}

interface IDigiNFT {
    function batchTransferFrom(address _from, address _to, uint256[] memory _tokenIds) external;
    function burn(uint256 _tokenId) external;
    function setApprovalForAll(address operator, bool _approved) external;
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
/**
 * @title Digitalax Garment NFT a.k.a. parent NFTs
 * @dev Issues ERC-721 tokens as well as being able to hold child 1155 tokens
 */
contract ModelsWhitelistedSales{
    using SafeMath for uint256;
    bool initialized;
    DigitalaxAccessControls accessControls;
    IDigiCollection collection;
    IDigiMarketplace marketplace;
    IDigiIndex index;
    uint256 platformFee;
    IDigiNFT nft;
    uint256 defaultMarketplaceDurationSeconds;
    uint256 minPrimarySalePrice;
    string constant common = "Common";
    string constant semirare = "Semi-Rare";
    string constant rare = "Rare";

    // People that can submit tokens are whitelisters
    mapping(address => uint256) whitelisterIndex;
    address[] public whitelisters;

    event AddWhitelister(
        address user
    );

    event RemoveWhitelister(
        address user
    );

    function initialize(DigitalaxAccessControls _accessControls, IDigiCollection _collection, IDigiMarketplace _marketplace, IDigiIndex _index, IDigiNFT _nft) public {
        require(!initialized);
        accessControls = _accessControls;
        collection = _collection;
        marketplace = _marketplace;
        index = _index;
        nft = _nft;
        platformFee = 150;
        defaultMarketplaceDurationSeconds = 31557000;
        minPrimarySalePrice = 1; // Program actual value

        nft.setApprovalForAll(address(marketplace), true);
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

    function updatePlatformFee(uint256 _fee) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "updatePlatformFee: Sender must be admin"
        );

        platformFee = _fee;
    }

    function updateDefaultMarketplaceDuration(uint256 _duration) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "updateDefaultMarketplaceDuration: Sender must be admin"
        );

        defaultMarketplaceDurationSeconds = _duration;
    }

    function updateMinPrimarySalePrice(uint256 _price) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "updateMinPrimarySalePrice: Sender must be admin"
        );

        minPrimarySalePrice = _price;
    }

    function updateContracts(IDigiCollection _collection, IDigiMarketplace _marketplace, IDigiIndex _index) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "updateContracts: Sender must be admin"
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
        address _designer,
        uint256 _amount,
        uint256[] calldata _childTokenIds,
        uint256 _primarySalePrice) public {
        require(checkWhitelister(msg.sender), "Sender must be whitelisted");
        require(_amount < uint256(21) && _amount > uint256(0), "Min is 1, Max is 15");
        require(_primarySalePrice >= minPrimarySalePrice, "There is a minimum sale price");
        uint256[] memory childTokenAmounts = new uint256[](_childTokenIds.length);
        for( uint256 j; j< _childTokenIds.length; j++){
            childTokenAmounts[j] = uint256(1);
        }
        // string memory rarity;
        uint256 collectionId = collection.mintCollection(
                    _tokenUri,
                    _designer,
                    msg.sender,
                    _amount,
                    uint256(0),
                     getRarity(_amount),
                    _childTokenIds,
                    childTokenAmounts);

        marketplace.createOffer(
                    collectionId,
                    _primarySalePrice,
                    _getNow().add(uint256(1)),
                    _getNow().add(defaultMarketplaceDurationSeconds), // Need to configure how long offers will stay
                    platformFee, // Need to configure platform fee
                    0,
                    _amount);
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    function getRarity(uint256 _amount) public view returns (string memory rarity) {
        if(_amount == 1){
            return rare;
        } else if(_amount < 7){
           return semirare;
        } else {
           return common;
        }
    }

    // Allow to batch transfer back from this contract
    function transfer(uint256[] memory _tokenIds) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "transfer: Sender must be admin"
        );
        nft.batchTransferFrom(address(this), msg.sender, _tokenIds);
    }

    // Allow to delist and burn direct from this contract
    function burn(uint256[] memory _collectionIds) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "transfer: Sender must be admin"
        );
        for( uint256 i; i< _collectionIds.length; i++){
            index.removeCollectionGroup(_collectionIds[i]);
            marketplace.cancelOffer(_collectionIds[i]);
            uint256[] memory _garmentTokenIds = collection.getTokenIds(_collectionIds[i]);
            for( uint256 j; j< _garmentTokenIds.length; j++){
                nft.burn(_garmentTokenIds[j]);
            }
        }
    }

    /**
    * @notice Reclaims ERC20 Compatible tokens for entire balance
    * @dev Only access controls admin
    * @param _tokenContract The address of the token contract
    */
    function reclaimERC20(address _tokenContract) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxMarketplace.reclaimERC20: Sender must be admin"
        );
        require(_tokenContract != address(0), "Invalid address");
        IERC20 token = IERC20(_tokenContract);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(msg.sender, balance), "Transfer failed");
    }

    /**
     @notice Single ERC721 receiver callback hook
     */
    function onERC721Received(address operator, address from, uint256 tokenId, bytes memory data)
    public
    returns (bytes4) {
        return this.onERC721Received.selector;
    }

}
