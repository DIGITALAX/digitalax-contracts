pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "../DigitalaxAccessControls.sol";

interface IDigiCollection {
    function getCollection(uint256 _collectionId)
    external
    view
    returns (uint256[] memory _garmentTokenIds, uint256 _amount, string memory _tokenUri, address _designer);

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
    bool initialized;
    DigitalaxAccessControls accessControls;
    IDigiCollection collection;
    IDigiMarketplace marketplace;
    IDigiIndex index;

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
        require(_user != address(0), "ESPADEV.addWhitelister: Please add valid address");
        require(!checkWhitelister(_user), "ESPADEV.removeWhitelister: Whitelister must not exist");
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "ESPADEV.addWhitelister: Sender must be an authorised contract or admin"
        );

        uint256 index = whitelisters.length;
        whitelisters.push(_user);
        whitelisterIndex[_user] = index;
        emit AddWhitelister(_user);
    }

    function removeWhitelister(address _user) public {
        require(checkWhitelister(_user), "ESPADEV.removeWhitelister: Whitelister must already exist");
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "ESPADEV.removeWhitelister: Sender must be an authorised contract or admin"
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

    // Function that will do all tasks for th
    function mintAndList(address_designers) public {
//        require(accessControls.hasMinterRole(msg.sender), "Sender must be minter");
//        require(_beneficiaries.length == _tokenUris.length);
//        require(_beneficiaries.length == _designers.length);
//        for( uint256 i; i< _beneficiaries.length; i++){
//            IDigiNFT(nft).mint(_beneficiaries[i], _tokenUris[i], _designers[i]);
//        }
    }

}
