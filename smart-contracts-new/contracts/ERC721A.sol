pragma solidity ^0.8.7;

import "./extensions/ERC721AQueryableUpgradeable.sol";
import "./IERC998ERC1155TopDown.sol";
import "./IDigitalaxMaterialsV2.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract ERC721A is ERC721AQueryableUpgradeable, IERC998ERC1155TopDown {

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


    /// @dev TokenID -> Primary Ether Sale Price in Wei
    mapping(uint256 => uint256) public primarySalePrice;


    /// @dev ERC721 Token ID -> ERC1155 ID -> Balance
    mapping(uint256 => mapping(uint256 => uint256)) private balances;

    /// @dev ERC1155 ID -> ERC721 Token IDs that have a balance
    mapping(uint256 => EnumerableSet.UintSet) private childToParentMapping;

    /// @dev ERC721 Token ID -> ERC1155 child IDs owned by the token ID
    mapping(uint256 => EnumerableSet.UintSet) private parentToChildMapping;

    /// @dev max children NFTs a single 721 can hold
    uint256 public maxChildrenPerToken;

     // @notice event emitted when a tokens primary sale occurs
    event TokenPrimarySalePriceSet(
        uint256 indexed _tokenId,
        uint256 _salePrice
    );




  function initialize() initializerERC721A public {
        __ERC721A_init('Something', 'SMTH');
      __Ownable_init(); // todo figure out ownership

      // todo set child contract
  }

  function mint(uint256 quantity) external payable {
    // _safeMint's second argument now takes in a quantity, not a tokenId.
    _safeMint(msg.sender, quantity);
  }

  function burn(uint256 tokenId) public {
        _burn(tokenId, true);

      // todo check
         // If there are any children tokens then send them as part of the burn
        if (parentToChildMapping[_tokenId].length() > 0) {
            // Transfer children to the burner
            _extractAndTransferChildrenFromParent(_tokenId, _msgSender());
        }
    }

  function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return
            interfaceId == type(IERC1155).interfaceId ||
            interfaceId == _INTERFACE_ID_ERC165;
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

        // todo check
        return IERC1155Receiver.onERC1155Received.selector;
    }

    /**
     @notice Batch ERC1155 receiver callback hook, used to enforce child token bindings to a given parent token ID
     */
    function onERC1155BatchReceived(address _operator, address _from, uint256[] memory _ids, uint256[] memory _values, bytes memory _data)
    virtual
    external
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

        // todo check
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
    function updateMaxChildrenPerToken(uint256 _maxChildrenPerToken) external {
       // todo
        // require(accessControls.hasAdminRole(_msgSender()), "DigitalaxGarmentNFT.updateMaxChildrenPerToken: Sender must be admin");
        maxChildrenPerToken = _maxChildrenPerToken;
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
        balances[_tokenId][_childTokenId] = balances[_tokenId][_childTokenId].add(_amount);
    }

    function _removeChild(uint256 _tokenId, address, uint256 _childTokenId, uint256 _amount) private {
        require(_amount != 0 || balances[_tokenId][_childTokenId] >= _amount, "ERC998: insufficient child balance for transfer");
        balances[_tokenId][_childTokenId] = balances[_tokenId][_childTokenId].sub(_amount);
        if (balances[_tokenId][_childTokenId] == 0) {
            childToParentMapping[_childTokenId].remove(_tokenId);
            parentToChildMapping[_tokenId].remove(_childTokenId);
        }
    }

    // todo check
//
//    function batchTokenURI(uint256[] memory tokenIds) external view returns (string[] memory) {
//        uint256 length = tokenIds.length;
//
//        string[] memory _tokenUris = new string[](length);
//        for( uint256 i; i< length; i++){
//            _tokenUris[i] = _tokenURIs[tokenIds[i]];
//        }
//        return _tokenUris;
//    }

    function batchPrimarySalePrice(uint256[] memory tokenIds) external view returns (uint256[] memory) {
        uint256 length = tokenIds.length;

        uint256[] memory _primarySalePrices = new uint256[](length);
        for( uint256 i; i< length; i++){
            _primarySalePrices[i] = primarySalePrice[tokenIds[i]];
        }
        return _primarySalePrices;
    }
}
