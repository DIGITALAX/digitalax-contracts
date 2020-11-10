// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "./ERC1155/ERC1155.sol";
import "./DigitalaxAccessControls.sol";
import "./ERC998/IERC998ERC1155TopDown.sol";

// TODO use _msgSender() where possible

contract DigitalaxGarmentNFT is ERC721("DigitalaxNFT", "DTX"), ERC1155Receiver, IERC998ERC1155TopDown {

    // @notice event emitted upon construction of this contract, used to bootstrap external indexers
    event DigitalaxGarmentNFTContractDeployed();

    // @notice event emitted when token URI is updated
    event DigitalaxGarmentTokenUriUpdate(
        uint256 indexed _tokenId,
        string _tokenUri
    );

    /// @dev Required to govern who can call certain functions
    DigitalaxAccessControls public accessControls;

    /// @dev Child ERC1155 contract address
    ERC1155 public childContract;

    /// @dev current max tokenId
    uint256 public tokenIdPointer;

    /// @dev TokenID -> Designer address
    mapping(uint256 => address) public garmentDesigners;

    /// @dev TokenID -> Primary Ether Sale Price in Wei
    mapping(uint256 => uint256) public primarySalePrice;

    /// @dev ERC721 Token ID -> ERC1155 ID -> Balance
    mapping(uint256 => mapping(uint256 => uint256)) private balances;

    /// @dev ERC1155 ID -> ERC721 Token IDs that have a balance
    mapping(uint256 => EnumerableSet.UintSet) private childToParentMapping;

    /// @dev ERC721 Token ID -> ERC1155 child IDs owned by the token ID
    mapping(uint256 => EnumerableSet.UintSet) private parentToChildMapping;

    // TODO only the 721 can accept 1155s from our code
    // TODO only the 1155 can work with the 721 from us

    // TODO facilitate a user to "top-up" there parent with other children tokens - up to the max

    // TODO scenario 1:
    //         -> Create parent with embedded children via factory
    //         -> Setup auction and result it
    //         -> user takes ownership of both child and parent NFTs
    //         -> user burns it and extracts out children tokens

    // TODO scenario 2:
    //         -> Create parent with embedded children via factory
    //         -> Setup auction and result it
    //         -> user can top up more tokens of the same type
    //         -> only the owner can top them up

    // TODO scenario 3:
    //         -> Create parent with embedded children via factory
    //         -> Setup auction and result it
    //         -> user can top up with new tokens IDs - up to be the mxChildren limit
    //         -> only the owner can top them up

    // TODO introduce max child NFT cap - configurable by admin default is 10 - with test
    /// @dev max children NFTs a single 721 can hold
    uint256 public maxChildren = 10;

    /**
     @param _accessControls Address of the Digitalax access control contract
     @param _childContract ERC1155 the Digitalax child NFT contract
     */
    constructor(DigitalaxAccessControls _accessControls, ERC1155 _childContract) public {
        accessControls = _accessControls;
        childContract = _childContract;
        emit DigitalaxGarmentNFTContractDeployed();
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

        // Valid args
        assertMintingParamsValid(_tokenUri, _designer);

        tokenIdPointer = tokenIdPointer.add(1);
        uint256 tokenId = tokenIdPointer;

        // Mint token and set token URI
        _safeMint(_beneficiary, tokenId);
        _setTokenURI(tokenId, _tokenUri);

        // Associate garment designer
        garmentDesigners[tokenId] = _designer;

        return tokenId;
    }

    // TODO What happens if the receiver/caller is a contract - can they re-enter and what are the implications?
    function burn(uint256 _tokenId) external {
        require(ownerOf(_tokenId) == _msgSender(), "DigitalaxGarmentNFT.burn: Only garment owner");

        address childContractAddress = address(childContract);
        uint256[] memory childIds = childIdsForOn(_tokenId, childContractAddress);

        // If there are any children tokens then send them as part of the burn
        if (childIds.length > 0) {

            uint256[] memory balanceOfChildren = new uint256[](childIds.length);

            // Get balances for children tokens
            for (uint i = 0; i < childIds.length; i++) {
                balanceOfChildren[i] = childBalance(_tokenId, childContractAddress, childIds[i]);
            }

            // Transfer children to the burner
            safeBatchTransferChildFrom(
                _tokenId,
                _msgSender(),
                childContractAddress,
                childIds,
                balanceOfChildren,
                abi.encodePacked("")
            );
        }

        // Destroy token mappings
        _burn(_tokenId);

        // Clean up designer mapping
        delete garmentDesigners[_tokenId];
    }

    function onERC1155Received(address _operator, address _from, uint256 _id, uint256 _amount, bytes memory _data)
    virtual
    public override
    returns (bytes4) {
        // TODO have to got a test for this
        require(_data.length == 32, "ERC998: data must contain the unique uint256 tokenId to transfer the child token to");

        uint256 _receiverTokenId;
        uint256 _index = msg.data.length - 32;
        assembly {_receiverTokenId := calldataload(_index)}

        // Check token received is valid
        require(_exists(_receiverTokenId), "Token does not exist");

        // We only accept children from the Digitalax child contract
        require(msg.sender == address(childContract), "Invalid child token contract");

        // check the sender is the owner of the token or its just been birthed to this token
        require(
            ownerOf(_receiverTokenId) == _from || _from == address(0),
            "Cannot add children to tokens you dont own"
        );

        _receiveChild(_receiverTokenId, msg.sender, _id, _amount);

        emit ReceivedChild(_from, _receiverTokenId, msg.sender, _id, _amount);

        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address _operator, address _from, uint256[] memory _ids, uint256[] memory _values, bytes memory _data)
    virtual public
    override returns (bytes4) {
        require(_data.length == 32, "ERC998: data must contain the unique uint256 tokenId to transfer the child token to");
        //TODO; check this but I believe that with our 1155, this is not a possibility
        require(_ids.length == _values.length, "ERC1155: ids and values length mismatch");

        uint256 _receiverTokenId;
        // TODO add tests for different types of size 32 to see if handles it
        uint256 _index = msg.data.length - 32;
        assembly {_receiverTokenId := calldataload(_index)}

        require(_exists(_receiverTokenId), "Token does not exist");

        // We only accept children from the Digitalax child contract
        require(msg.sender == address(childContract), "Invalid child token contract");

        // check the sender is the owner of the token or its just been birthed to this token
        require(
            ownerOf(_receiverTokenId) == _from || _from == address(0),
            "Cannot add children to tokens you dont own"
        );

        // TODO whats the max number of tokens we can receive due to GAS constraints?
        for (uint256 i = 0; i < _ids.length; i++) {
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
     @dev Only admin or smart contract
     @param _tokenId The ID of the token being updated
     @param _tokenUri The new URI
     */
    function setTokenURI(uint256 _tokenId, string calldata _tokenUri) external {
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "DigitalaxGarmentNFT.setPrimarySalePrice: Sender must be an authorised contract or admin"
        );
        _setTokenURI(_tokenId, _tokenUri);
        emit DigitalaxGarmentTokenUriUpdate(_tokenId, _tokenUri);
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

        // todo do we need an event ... can add transfer hook?
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

    /**
     @notice Method for updating max children a token can hold
     @dev Only admin
     @param _maxChildren uint256 the max children a token can hold
     */
    function updateMaxChildren(uint256 _maxChildren) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxGarmentNFT.updateMaxChildren: Sender must be admin");
        maxChildren = _maxChildren;
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

    function childBalance(uint256 _tokenId, address _childContract, uint256 _childTokenId)
    public view
    override
    returns (uint256) {
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

        uint256[] memory childTokenIds = new uint256[](parentToChildMapping[_tokenId].length());

        for (uint256 i = 0; i < parentToChildMapping[_tokenId].length(); i++) {
            childTokenIds[i] = parentToChildMapping[_tokenId].at(i);
        }

        return childTokenIds;
    }

    /**
     * @dev checks the given token ID is approved either for all or the single token ID
     */
    function isApproved(uint256 _tokenId, address operator) external view returns (bool) {
        return isApprovedForAll(ownerOf(_tokenId), operator) || getApproved(_tokenId) == operator;
    }

    /////////////////////////
    // Internal and Private /
    /////////////////////////

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
