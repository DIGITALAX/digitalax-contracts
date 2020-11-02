// ERC998 side of the contract based on: https://github.com/rocksideio/ERC998-ERC1155-TopDown/blob/695963195606304374015c49d166ab2fbeb42ea9/contracts/ERC998ERC1155TopDown.sol

// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "./ERC1155/ERC1155.sol";
import "./DigitalaxAccessControls.sol";
import "./ERC998/IERC998ERC1155TopDown.sol";

// TODO: secondary sale mechanics need to be built into core NFT twisted sister style - modify 721 to add payable
// TODO: before each hook could also implement do not transfer to self
// TODO: need a burn method returning 1155s to burner
contract DigitalaxGarmentNFT is ERC721("Digitalax", "DTX"), ERC1155Receiver, IERC998ERC1155TopDown {

    // TODO: events for updating token URI and updating access controls

    /// @dev Required to govern who can call certain functions
    DigitalaxAccessControls public accessControls;

    uint256 public tokenIdPointer;

    // TODO: add platform address
    // TODO: add platform percentage of secondary sales

    /// @dev TokenID -> Designer address
    mapping(uint256 => address) public garmentDesigners;

    /// @dev TokenID -> Primary Ether Sale Price in Wei
    mapping(uint256 => uint256) public primarySalePrice;

    //TODO: check whether this should there be last sale price too?

    /// @dev ERC721 Token ID -> ERC1155 ID -> Balance
    mapping(uint256 => mapping(uint256 => uint256)) private balances;

    /// @dev ERC1155 ID -> ERC721 Token IDs that have a balance
    mapping(uint256 => EnumerableSet.UintSet) private holdersOf;

    /// @dev Child ERC1155 contract address
    ERC1155 public childContract;

    /// @dev ERC721 Token ID -> ERC1155 child IDs owned by the token ID
    mapping(uint256 => EnumerableSet.UintSet) private childsForChildContract;

    /**
     @param _accessControls Address of the Digitalax access control contract
     */
    //TODO: new param for 1155 child contract
    constructor(DigitalaxAccessControls _accessControls, ERC1155 _childContract) public {
        accessControls = _accessControls;
        childContract = _childContract;
    }

    /**
     @notice Mints a DigitalaxGarmentNFT AND when minting to a contract checks if the beneficiary is a 721 compatible
     @dev Only senders with either the minter or smart contract role can invoke this method
     @param _beneficiary Recipient of the NFT
     @param _tokenUri URI for the token being minted
     @param _designer Garment designer - will be required for issuing royalties from secondary sales
     @return uint256 The token ID of the token that was minted
     */
    function mint(address _beneficiary, string calldata _tokenUri, address _designer) external returns (uint256) {
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentNFT.mint: Sender must have the minter or contract role"
        );

        assertMintingParamsValid(_tokenUri, _designer);

        tokenIdPointer = tokenIdPointer.add(1);
        uint256 tokenId = tokenIdPointer;
        _safeMint(_beneficiary, tokenId);
        _setTokenURI(tokenId, _tokenUri);

        garmentDesigners[tokenId] = _designer;

        return tokenId;
    }

    //todo: needs to handle no children scenario with test
    function burn(uint256 _tokenId) external {
        require(ownerOf(_tokenId) == _msgSender(), "DigitalaxGarmentNFT.burn: Only Garment Owner");

        address childContractAddress = address(childContract);
        uint256[] memory childIds = childIdsForOn(_tokenId, childContractAddress);
        uint256[] memory balanceOfChilds = new uint256[](childIds.length);

        for(uint i = 0; i < childIds.length; i++) {
            balanceOfChilds[i] = childBalance(_tokenId, childContractAddress, childIds[i]);
        }

        safeBatchTransferChildFrom(
            _tokenId,
            _msgSender(),
            childContractAddress,
            childIds,
            balanceOfChilds,
            abi.encodePacked("")
        );

        _burn(_tokenId);
    }

    function onERC1155Received(address _operator, address _from, uint256 _id, uint256 _amount, bytes memory _data) virtual public override returns(bytes4) {
        require(_data.length == 32, "ERC998: data must contain the unique uint256 tokenId to transfer the child token to");
        _beforeChildTransfer(_operator, 0, address(this), _from, _asSingletonArray(_id), _asSingletonArray(_amount), _data);

        uint256 _receiverTokenId;
        uint256 _index = msg.data.length - 32;
        assembly {_receiverTokenId := calldataload(_index)}

        require(_exists(_receiverTokenId), "Token does not exist");

        _receiveChild(_receiverTokenId, msg.sender, _id, _amount);
        emit ReceivedChild(_from, _receiverTokenId, msg.sender, _id, _amount);

        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address _operator, address _from, uint256[] memory _ids, uint256[] memory _values, bytes memory _data) virtual public override returns(bytes4) {
        require(_data.length == 32, "ERC998: data must contain the unique uint256 tokenId to transfer the child token to");
        //TODO; check this but I believe that with our 1155, this is not a possibility
        //require(_ids.length == _values.length, "ERC1155: ids and values length mismatch");
        _beforeChildTransfer(_operator, 0, address(this), _from, _ids, _values, _data);

        uint256 _receiverTokenId;
        uint256 _index = msg.data.length - 32;
        assembly {_receiverTokenId := calldataload(_index)}

        require(_exists(_receiverTokenId), "Token does not exist");

        for(uint256 i = 0; i < _ids.length; i++) {
            _receiveChild(_receiverTokenId, msg.sender, _ids[i], _values[i]);
            emit ReceivedChild(_from, _receiverTokenId, msg.sender, _ids[i], _values[i]);
        }
        return this.onERC1155BatchReceived.selector;
    }

    //////////
    // Admin /
    //////////

    /**
     @notice Updates the token URI of a given token
     @dev Only admin
     @param _tokenId The ID of the token being updated
     @param _tokenUri The new URI
     */
    function setTokenURI(uint256 _tokenId, string calldata _tokenUri) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxGarmentNFT.setTokenURI: Sender must have the admin role");
        _setTokenURI(_tokenId, _tokenUri);
    }

    /**
     @notice Records the Ether price that a given token was sold for (in WEI)
     @dev Only admin or a smart contract can call this method
     @param _tokenId The ID of the token being updated
     @param _salePrice The primary Ether sale price in WEI
     */
    function setPrimarySalePrice(uint256 _tokenId, uint256 _salePrice) external {
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "DigitalaxGarmentNFT.setPrimarySalePrice: Sender must be an authorised contract or admin"
        );
        require(_exists(_tokenId), "DigitalaxGarmentNFT.setPrimarySalePrice: Token does not exist");
        require(_salePrice > 0, "DigitalaxGarmentNFT.setPrimarySalePrice: Invalid sale price");

        primarySalePrice[_tokenId] = _salePrice;
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxGarmentNFT.updateAccessControls: Sender must be admin");
        accessControls = _accessControls;
    }

    /////////////////
    // View Methods /
    /////////////////

    /**
     @notice View method for checking whether a token has been minted
     @param _tokenId ID of the token being checked
     */
    function exists(uint256 _tokenId) external view returns (bool) {
        return _exists(_tokenId);
    }

    function childBalance(
        uint256 _tokenId,
        address _childContract,
        uint256 _childTokenId
    ) public view override returns(uint256) {
        return _childContract == address(childContract) ?
                balances[_tokenId][_childTokenId] : 0;
    }

    function childContractsFor(uint256 _tokenId) override external view returns (address[] memory) {
        if (!_exists(_tokenId)) {
            return new address[](0);
        }

        address[] memory childContracts = new address[](1);
        childContracts[0] = address(childContract);
        return childContracts;
    }

    function childIdsForOn(uint256 _tokenId, address _childContract) override public view returns (uint256[] memory) {
        if (!_exists(_tokenId) || _childContract != address(childContract)) {
            return new uint256[](0);
        }

        uint256[] memory childTokenIds = new uint256[](childsForChildContract[_tokenId].length());

        for(uint256 i = 0; i < childsForChildContract[_tokenId].length(); i++) {
            childTokenIds[i] = childsForChildContract[_tokenId].at(i);
        }

        return childTokenIds;
    }


    /////////////////////////
    // Internal and Private /
    /////////////////////////

    // TODO; should this function be public?
    function safeTransferChildFrom(uint256 _fromTokenId, address _to, address, uint256 _childTokenId, uint256 _amount, bytes memory _data) public override {
        require(msg.sender == address(this));
        require(_to != address(0), "ERC998: transfer to the zero address");

        address operator = _msgSender();
        require(
            ownerOf(_fromTokenId) == operator ||
            isApprovedForAll(ownerOf(_fromTokenId), operator),
            "ERC998: caller is not owner nor approved"
        );

        // TODO: sender is owner || operator for sender ||  approved Address for sender
        /* require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );
        */
        _beforeChildTransfer(operator, _fromTokenId, _to, address(childContract), _asSingletonArray(_childTokenId), _asSingletonArray(_amount), _data);

        _removeChild(_fromTokenId, address(childContract), _childTokenId, _amount);

        // TODO: maybe check if to == this
        childContract.safeTransferFrom(address(this), _to, _childTokenId, _amount, _data);
        emit TransferSingleChild(_fromTokenId, _to, address(childContract), _childTokenId, _amount);
    }

    // TODO; should this function be public?
    function safeBatchTransferChildFrom(uint256 _fromTokenId, address _to, address, uint256[] memory _childTokenIds, uint256[] memory _amounts, bytes memory _data) public override {
        //TODO: require does not work
        //require(msg.sender == address(this), "Only contract");
        require(_childTokenIds.length == _amounts.length, "ERC998: ids and amounts length mismatch");
        require(_to != address(0), "ERC998: transfer to the zero address");

        address operator = _msgSender();
        require(
            ownerOf(_fromTokenId) == operator ||
            isApprovedForAll(ownerOf(_fromTokenId), operator),
            "ERC998: caller is not owner nor approved"
        );

        _beforeChildTransfer(operator, _fromTokenId, _to, address(childContract), _childTokenIds, _amounts, _data);

        for (uint256 i = 0; i < _childTokenIds.length; ++i) {
            uint256 _childTokenId = _childTokenIds[i];
            uint256 amount = _amounts[i];

            _removeChild(_fromTokenId, address(childContract), _childTokenId, amount);
        }
        childContract.safeBatchTransferFrom(address(this), _to, _childTokenIds, _amounts, _data);
        emit TransferBatchChild(_fromTokenId, _to, address(childContract), _childTokenIds, _amounts);
    }

    function _receiveChild(uint256 _tokenId, address, uint256 _childTokenId, uint256 _amount) private {
        //todo add below check
        //require(_childContract == childContract)

        if(balances[_tokenId][_childTokenId] == 0) {
            childsForChildContract[_tokenId].add(_childTokenId);
        }

        balances[_tokenId][_childTokenId] = balances[_tokenId][_childTokenId].add(_amount);
    }

    function _removeChild(uint256 _tokenId, address, uint256 _childTokenId, uint256 _amount) private {
        require(_amount != 0 || balances[_tokenId][_childTokenId] >= _amount, "ERC998: insufficient child balance for transfer");
        balances[_tokenId][_childTokenId] = balances[_tokenId][_childTokenId].sub(_amount);
        if(balances[_tokenId][_childTokenId] == 0) {
            holdersOf[_childTokenId].remove(_tokenId);
            childsForChildContract[_tokenId].remove(_childTokenId);
        }
    }

    function _beforeChildTransfer(
        address _operator,
        uint256 _fromTokenId,
        address _to,
        address _childContract,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory _data
    )
    internal virtual
    { }

    function _asSingletonArray(uint256 element) private pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = element;

        return array;
    }

    /**
     @notice Checks that the URI is not empty and the designer is a real address
     @param _tokenUri URI supplied on minting
     @param _designer Address supplied on minting
     */
    function assertMintingParamsValid(string calldata _tokenUri, address _designer) pure private {
        require(bytes(_tokenUri).length > 0, "DigitalaxGarmentNFT.assertMintingParamsValid: Token URI is empty");
        require(_designer != address(0), "DigitalaxGarmentNFT.assertMintingParamsValid: Designer is zero address");
    }
}
