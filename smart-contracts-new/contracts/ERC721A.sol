pragma solidity ^0.8.7;

import "./extensions/ERC721AQueryableUpgradeable.sol";
import "./IERC998ERC1155TopDown.sol";
import "./OwnableUpgradeable.sol";
import "./IDigitalaxMaterialsV2.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// Todo name
contract ERC721A is ERC721AQueryableUpgradeable, IERC998ERC1155TopDown, OwnableUpgradeable {
    using EnumerableSet for EnumerableSet.UintSet;
    struct ChildNftInventory {
        uint256[] garmentTokenIds;
        uint256[] garmentAmounts;
    }
    /*
     * bytes4(keccak256('supportsInterface(bytes4)')) == 0x01ffc9a7
     */
    bytes4 private constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;
    /// @dev Child ERC1155 contract address
    IDigitalaxMaterialsV2 public childContract;

    uint256 public currentSalePrice;

    uint256 public maxTotalSupply;
    uint256 public maxPerPurchase;

    string public baseUri;

    /// @dev ERC721 Token ID -> ERC1155 ID -> Balance
    mapping(uint256 => mapping(uint256 => uint256)) private balances;

    /// @dev ERC721 Token ID -> ERC1155 child IDs owned by the token ID
    mapping(uint256 => EnumerableSet.UintSet) private parentToChildMapping;

    /// @dev max children NFTs a single 721 can hold
    uint256 public maxChildrenPerToken;

     // @notice event emitted when a tokens primary sale occurs
    event TokenPrimarySalePriceSet(
        uint256 indexed _tokenId,
        uint256 _salePrice
    );

  function initialize(string memory _symbol, string memory _name, IDigitalaxMaterialsV2 _childContract, uint256 _maxTotalSupply, uint256 _currentSalePrice) initializerERC721A public {
        __ERC721A_init(_name, _symbol);
        __Context_init();
        __Ownable_init();
        childContract = _childContract;
        maxTotalSupply = _maxTotalSupply;
        currentSalePrice = _currentSalePrice;
        maxPerPurchase = 10; // Todo we need to confirm this value
  }

  function teamMint(uint256 quantity) external onlyOwner {
    require(totalSupply() + quantity <= maxTotalSupply, "No tokens left to mint");
    _safeMint(msg.sender, quantity);
  }

  function buy(uint256 quantity) external payable {
    require(totalSupply() + quantity <= maxTotalSupply, "No tokens left to mint");
    require(msg.value == (quantity * currentSalePrice), "Wrong amount of ETH sent to contract");
    require(quantity > uint256(0), "Cannot buy 0");
    require(quantity <= maxPerPurchase, "Cannot buy more than MAX per purchase");
    _safeMint(msg.sender, quantity);

   (bool success, ) = owner().call{ value: msg.value }("");
   require(success, "Failed to widthdraw Ether");
  }

  function burn(uint256 _tokenId) public {
        _burn(_tokenId, true);

         // If there are any children tokens then send them as part of the burn
        if (parentToChildMapping[_tokenId].length() > 0) {
            // Transfer children to the burner
            _extractAndTransferChildrenFromParent(_tokenId, _msgSender());
        }
    }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721AUpgradeable, IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == _INTERFACE_ID_ERC165 ||
            interfaceId == 0x01ffc9a7 || // ERC165 interface ID for ERC165.
            interfaceId == 0x80ac58cd || // ERC165 interface ID for ERC721.
            interfaceId == 0x5b5e139f; // ERC165 interface ID for ERC721Metadata.;
    }

    /**
     @dev Get the child token balances held by the contract, assumes caller knows the correct child contract
     */
    function childBalance(uint256 _tokenId, address _childContract, uint256 _childTokenId)
    public
    view
    override
    returns (uint256) {
        return _childContract == address(childContract) ? balances[_tokenId][_childTokenId] : 0;
    }

     /**
     @dev Get list of supported child contracts, always a list of 0 or 1 in our case
     */
    function childContractsFor(uint256 _tokenId) override external view returns (address[] memory) {
        if (!_exists(_tokenId)) {
            return new address[](0);
        }

        address[] memory childContracts = new address[](1);
        childContracts[0] = address(childContract);
        return childContracts;
    }

    /**
     @dev Gets mapped IDs for child tokens
     */
    function childIdsForOn(uint256 _tokenId, address _childContract) override public view returns (uint256[] memory) {
        if (!_exists(_tokenId) || _childContract != address(childContract)) {
            return new uint256[](0);
        }

        uint256[] memory childTokenIds = new uint256[](parentToChildMapping[_tokenId].length());

        for (uint256 i = 0; i < parentToChildMapping[_tokenId].length(); i++) {
            childTokenIds[i] = parentToChildMapping[_tokenId].at(i);
        }

        return childTokenIds;
    }

    /**
     @dev Gets mapped URIs for child tokens
     */
    function childURIsForOn(uint256 _tokenId, address _childContract) public view returns (string[] memory) {
        if (!_exists(_tokenId) || _childContract != address(childContract)) {
            return new string[](0);
        }
        uint256 mappingLength = parentToChildMapping[_tokenId].length();
        string[] memory childTokenURIs = new string[](mappingLength);

        for (uint256 i = 0; i < mappingLength; i++) {
            childTokenURIs[i] = childContract.uri(parentToChildMapping[_tokenId].at(i));
        }

        return childTokenURIs;
    }

    /**
     @notice Single ERC1155 receiver callback hook, used to enforce children token binding to a given parent token
     */
    function onERC1155Received(address _operator, address _from, uint256 _id, uint256 _amount, bytes memory _data)
    virtual
    external
    override
    returns (bytes4) {
        require(_data.length == 32, "ERC998: data must contain the unique uint256 tokenId to transfer the child token to");

        uint256 _receiverTokenId = _extractIncomingTokenId();
        _validateReceiverParams(_receiverTokenId, _operator, _from);

        _receiveChild(_receiverTokenId, _msgSender(), _id, _amount);

        emit ReceivedChild(_from, _receiverTokenId, _msgSender(), _id, _amount);

        // Check total tokens do not exceed maximum
        require(
            parentToChildMapping[_receiverTokenId].length() <= maxChildrenPerToken,
            "Cannot exceed max child token allocation"
        );

        return IERC1155Receiver.onERC1155Received.selector;
    }

    /**
     @notice Batch ERC1155 receiver callback hook, used to enforce child token bindings to a given parent token ID
     */
    function onERC1155BatchReceived(address _operator, address _from, uint256[] memory _ids, uint256[] memory _values, bytes memory _data)
    virtual
    external
    override
    returns (bytes4) {
         require(_data.length == 32, "ERC998: data must contain the unique uint256 tokenId to transfer the child token to");

        uint256 _receiverTokenId = _extractIncomingTokenId();
        _validateReceiverParams(_receiverTokenId, _operator, _from);

        // Note: be mindful of GAS limits
        for (uint256 i = 0; i < _ids.length; i++) {
            _receiveChild(_receiverTokenId, _msgSender(), _ids[i], _values[i]);
            emit ReceivedChild(_from, _receiverTokenId, _msgSender(), _ids[i], _values[i]);
        }

        // Check total tokens do not exceed maximum
        require(
            parentToChildMapping[_receiverTokenId].length() <= maxChildrenPerToken,
            "Cannot exceed max child token allocation"
        );

        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function _extractIncomingTokenId() internal pure returns (uint256) {
        // Extract out the embedded token ID from the sender
        uint256 _receiverTokenId;
        uint256 _index = msg.data.length - 32;
        assembly {_receiverTokenId := calldataload(_index)}
        return _receiverTokenId;
    }

      function _validateReceiverParams(uint256 _receiverTokenId, address _operator, address _from) internal view {
        require(_exists(_receiverTokenId), "Token does not exist");

        // We only accept children from the Digitalax child contract
        require(_msgSender() == address(childContract), "Invalid child token contract");

        // check the sender is the owner of the token or its just been birthed to this token
        if (_from != address(0)) {
            require(
                ownerOf(_receiverTokenId) == _from,
                "Cannot add children to tokens you dont own"
            );

            // Check the operator is also the owner, preventing an approved address adding tokens on the holders behalf
            require(_operator == _from, "Operator is not owner");
        }
    }

     /**
     @notice Method for updating max children a token can hold
     @dev Only admin
     @param _maxChildrenPerToken uint256 the max children a token can hold
     */
    function updateMaxChildrenPerToken(uint256 _maxChildrenPerToken) external onlyOwner {
        maxChildrenPerToken = _maxChildrenPerToken;
    }

    function updateChildContract(IDigitalaxMaterialsV2 _childContract) external onlyOwner {
        childContract = _childContract;
    }

    function updateMaxTotalSupply(uint256 _maxTotalSupply) external onlyOwner {
        maxTotalSupply = _maxTotalSupply;
    }

    function updateMaxPerPurchase(uint256 _maxPerPurchase) external onlyOwner {
        maxPerPurchase = _maxPerPurchase;
    }

    function updateCurrentSalePrice(uint256 _currentSalePrice) external onlyOwner {
        currentSalePrice = _currentSalePrice;
    }

    function updateBaseUri(string _baseUriString) external onlyOwner {
        baseUri = _baseUriString;
    }

 /////////////////////////
    // Internal and Private /
    /////////////////////////

    function _extractAndTransferChildrenFromParent(uint256 _fromTokenId, address _to) internal {
        uint256[] memory _childTokenIds = childIdsForOn(_fromTokenId, address(childContract));
        uint256[] memory _amounts = new uint256[](_childTokenIds.length);

        for (uint256 i = 0; i < _childTokenIds.length; ++i) {
            uint256 _childTokenId = _childTokenIds[i];
            uint256 amount = childBalance(_fromTokenId, address(childContract), _childTokenId);

            _amounts[i] = amount;

            _removeChild(_fromTokenId, address(childContract), _childTokenId, amount);
        }

        childContract.safeBatchTransferFrom(address(this), _to, _childTokenIds, _amounts, abi.encodePacked(""));

        emit TransferBatchChild(_fromTokenId, _to, address(childContract), _childTokenIds, _amounts);
    }

    function _receiveChild(uint256 _tokenId, address, uint256 _childTokenId, uint256 _amount) private {
        if (balances[_tokenId][_childTokenId] == 0) {
           parentToChildMapping[_tokenId].add(_childTokenId);
        }
        balances[_tokenId][_childTokenId] = balances[_tokenId][_childTokenId] + _amount;
    }

    function _removeChild(uint256 _tokenId, address, uint256 _childTokenId, uint256 _amount) private {
        require(_amount != 0 || balances[_tokenId][_childTokenId] >= _amount, "ERC998: insufficient child balance for transfer");
        balances[_tokenId][_childTokenId] = balances[_tokenId][_childTokenId] - _amount;
        if (balances[_tokenId][_childTokenId] == 0) {
            parentToChildMapping[_tokenId].remove(_childTokenId);
        }
    }


    function batchTokenURI(uint256[] memory tokenIds) external view returns (string[] memory) {
        uint256 length = tokenIds.length;

        string[] memory _tokenUris = new string[](length);
        for( uint256 i; i< length; i++){
            _tokenUris[i] = tokenURI(tokenIds[i]);
        }
        return _tokenUris;
    }

    function batchPrimarySalePrice(uint256[] memory tokenIds) external view returns (uint256[] memory) {
        uint256 length = tokenIds.length;

        uint256[] memory _primarySalePrices = new uint256[](length);
        for( uint256 i; i< length; i++){
            _primarySalePrices[i] = primarySalePrice[tokenIds[i]];
        }
        return _primarySalePrices;
    }

        /**
     @notice Records the Ether price that a given token was sold for (in WEI)
     @dev Only admin or a smart contract can call this method
     @param _tokenIds The ID of the token being updated
     @param _salePrices The primary Ether sale price in WEI
     */
    function batchSetPrimarySalePrice(uint256[] memory _tokenIds, uint256[] memory _salePrices) external onlyOwner {
        require(
            _tokenIds.length == _salePrices.length,
            "BatchSetPrimarySalePrice: Must have equal length arrays"
        );
        for( uint256 i; i< _tokenIds.length; i++){
            _setPrimarySalePrice(_tokenIds[i], _salePrices[i]);
        }
    }

    function ownerWithdraw(address _address, uint256 _amount) onlyOwner external {
        _withdraw(_address, _amount);
    }

    /**
    * Helper method to allow ETH withdraws.
    */
    function _withdraw(address _address, uint256 _amount) internal {
        (bool success, ) = _address.call{ value: _amount }("");
        require(success, "Failed to widthdraw Ether");
    }

    function _baseURI() internal view override returns (string memory) {
        return baseUri;
    }


    // contract can recieve Ether
    receive() external payable { }

}
