// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../ERC721/DigitalaxERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "../ERC998/IERC998ERC1155TopDown.sol";
import "./BaseChildTunnelMock.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "../DigitalaxAccessControls.sol";
import "../garment/DigitalaxMaterials.sol";

/**
 * @title Digitalax Garment NFT a.k.a. parent NFTs
 * @dev Issues ERC-721 tokens as well as being able to hold child 1155 tokens
 */
contract DigitalaxGarmentNFTv2TunnelMock is DigitalaxERC721("DigitalaxNFT", "DTX"), ERC1155Receiver, IERC998ERC1155TopDown, BaseChildTunnelMock, BaseRelayRecipient, Initializable {

    struct ChildNftInventory {
        uint256[] garmentTokenIds;
        uint256[] garmentAmounts;
    }

    // @notice event emitted upon construction of this contract, used to bootstrap external indexers
    event DigitalaxGarmentNFTContractDeployed();

    // @notice event emitted when token URI is updated
    event DigitalaxGarmentTokenUriUpdate(
        uint256 indexed _tokenId,
        string _tokenUri
    );
    // @notice event emitted when designer is updated
    event DigitalaxGarmentDesignerUpdate(
        uint256 indexed _tokenId,
        address _designer
    );

    // @notice event emitted when a tokens primary sale occurs
    event TokenPrimarySalePriceSet(
        uint256 indexed _tokenId,
        uint256 _salePrice
    );

    event WithdrawnBatch(
        address indexed user,
        uint256[] tokenIds
    );

    /// @dev Child ERC1155 contract address
    DigitalaxMaterials public childContract;

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

    /// @dev max children NFTs a single 721 can hold
    uint256 public maxChildrenPerToken;

    /// @dev limit batching of tokens due to gas limit restrictions
    uint256 public BATCH_LIMIT;

    mapping (uint256 => bool) public withdrawnTokens;

    address public childChain;

    /// Required to govern who can call certain functions
    DigitalaxAccessControls public accessControls;

    modifier onlyChildChain() {
        require(
            _msgSender() == childChain,
            "Child token: caller is not the child chain contract"
        );
        _;
    }

    /**
     @param _accessControls Address of the Digitalax access control contract
     @param _childContract ERC1155 the Digitalax child NFT contract
     0xb5505a6d998549090530911180f38aC5130101c6
     */
    function initialize(DigitalaxAccessControls _accessControls, DigitalaxMaterials _childContract, address _childChain, address _trustedForwarder) public initializer {
        accessControls = _accessControls;
        childContract = _childContract;
        childChain = _childChain;
        trustedForwarder = _trustedForwarder;
        tokenIdPointer = 100000;
        maxChildrenPerToken = 10;
        BATCH_LIMIT = 20;
        emit DigitalaxGarmentNFTContractDeployed();
    }

    /**
     * Override this function.
     * This version is to keep track of BaseRelayRecipient you are using
     * in your contract.
     */
    function versionRecipient() external view override returns (string memory) {
        return "1";
    }

    function setTrustedForwarder(address _trustedForwarder) external  {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxGarmentNFT.setTrustedForwarder: Sender must be admin"
        );
        trustedForwarder = _trustedForwarder;
    }

    // This is to support Native meta transactions
    // never use msg.sender directly, use _msgSender() instead
    function _msgSender()
    internal
    override
    view
    returns (address payable sender)
    {
        return BaseRelayRecipient.msgSender();
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
        _assertMintingParamsValid(_tokenUri, _designer);

        tokenIdPointer = tokenIdPointer.add(1);
        uint256 tokenId = tokenIdPointer;

        // MATIC guard, to catch tokens minted on chain
        // require(!withdrawnTokens[tokenId], "ChildMintableERC721: TOKEN_EXISTS_ON_ROOT_CHAIN");

        // Mint token and set token URI
        _safeMint(_beneficiary, tokenId);
        _tokenURIs[tokenId] = _tokenUri;

        // Associate garment designer
        garmentDesigners[tokenId] = _designer;

        return tokenId;
    }

    /**
     @notice Burns a DigitalaxGarmentNFT, releasing any composed 1155 tokens held by the token itself
     @dev Only the owner or an approved sender can call this method
     @param _tokenId the token ID to burn
     */
    function burn(uint256 _tokenId) public {
        address operator = _msgSender();
        require(
            ownerOf(_tokenId) == operator || isApproved(_tokenId, operator),
            "DigitalaxGarmentNFT.burn: Only garment owner or approved"
        );

        // If there are any children tokens then send them as part of the burn
        if (parentToChildMapping[_tokenId].length() > 0) {
            // Transfer children to the burner
            _extractAndTransferChildrenFromParent(_tokenId, _msgSender());
        }

        // Destroy token mappings
        _burn(_tokenId);

        // Clean up designer mapping
        delete garmentDesigners[_tokenId];
        delete primarySalePrice[_tokenId];
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

        return this.onERC1155Received.selector;
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

        return this.onERC1155BatchReceived.selector;
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
            "DigitalaxGarmentNFT.setTokenURI: Sender must be an authorised contract or admin"
        );
        _tokenURIs[_tokenId] = _tokenUri;
        emit DigitalaxGarmentTokenUriUpdate(_tokenId, _tokenUri);
    }

    /**
     @notice Updates the token URI of a given token
     @dev Only admin or smart contract
     @param _tokenIds The ID of the tokens being updated
     @param _tokenUris The new URIs
     */
    function batchSetTokenURI(uint256[] memory _tokenIds, string[] calldata _tokenUris) external {
        require(
            _tokenIds.length == _tokenUris.length,
            "DigitalaxGarmentNFT.batchSetTokenURI: Must have equal length arrays"
        );
        for( uint256 i; i< _tokenIds.length; i++){
            require(
                accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
                "DigitalaxGarmentNFT.batchSetTokenURI: Sender must be an authorised contract or admin"
            );
            _tokenURIs[_tokenIds[i]] = _tokenUris[i];
            emit DigitalaxGarmentTokenUriUpdate(_tokenIds[i], _tokenUris[i]);
        }
    }

    /**
     @notice Updates the token URI of a given token
     @dev Only admin or smart contract
     @param _tokenIds The ID of the token being updated
     @param _designers The new URI
     */
    function batchSetGarmentDesigner(uint256[] memory _tokenIds, address[] calldata _designers) external {
        require(
            _tokenIds.length == _designers.length,
            "DigitalaxGarmentNFT.batchSetGarmentDesigner: Must have equal length arrays"
        );
        for( uint256 i; i< _tokenIds.length; i++){
            require(
                accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
                "DigitalaxGarmentNFT.batchSetGarmentDesigner: Sender must be an authorised contract or admin"
            );
            garmentDesigners[_tokenIds[i]] = _designers[i];
            emit DigitalaxGarmentDesignerUpdate(_tokenIds[i], _designers[i]);
        }
    }

    /**
     @notice Records the Ether price that a given token was sold for (in WEI)
     @dev Only admin or a smart contract can call this method
     @param _tokenIds The ID of the token being updated
     @param _salePrices The primary Ether sale price in WEI
     */
    function batchSetPrimarySalePrice(uint256[] memory _tokenIds, uint256[] memory _salePrices) external {
        require(
            _tokenIds.length == _salePrices.length,
            "DigitalaxGarmentNFT.batchSetPrimarySalePrice: Must have equal length arrays"
        );
        for( uint256 i; i< _tokenIds.length; i++){
            _setPrimarySalePrice(_tokenIds[i], _salePrices[i]);
        }
    }

    /**
     @notice Records the Ether price that a given token was sold for (in WEI)
     @dev Only admin or a smart contract can call this method
     @param _tokenId The ID of the token being updated
     @param _salePrice The primary Ether sale price in WEI
     */
    function setPrimarySalePrice(uint256 _tokenId, uint256 _salePrice) external {
        _setPrimarySalePrice(_tokenId, _salePrice);
    }

    /**
     @notice Records the Ether price that a given token was sold for (in WEI)
     @dev Only admin or a smart contract can call this method
     @param _tokenId The ID of the token being updated
     @param _salePrice The primary Ether sale price in WEI
     */
    function _setPrimarySalePrice(uint256 _tokenId, uint256 _salePrice) internal {
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "DigitalaxGarmentNFT.setPrimarySalePrice: Sender must be an authorised contract or admin"
        );
        // require(_exists(_tokenId), "DigitalaxGarmentNFT.setPrimarySalePrice: Token does not exist"); // Dont need to exist on matic
        require(_salePrice > 0, "DigitalaxGarmentNFT.setPrimarySalePrice: Invalid sale price");

        // Only set it once
        if (primarySalePrice[_tokenId] == 0) {
            primarySalePrice[_tokenId] = _salePrice;
            emit TokenPrimarySalePriceSet(_tokenId, _salePrice);
        }
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
     @param _maxChildrenPerToken uint256 the max children a token can hold
     */
    function updateMaxChildrenPerToken(uint256 _maxChildrenPerToken) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxGarmentNFT.updateMaxChildrenPerToken: Sender must be admin");
        maxChildrenPerToken = _maxChildrenPerToken;
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
     @dev Get total number of children mapped to the token
     */
    function totalChildrenMapped(uint256 _tokenId) external view returns (uint256) {
        return parentToChildMapping[_tokenId].length();
    }

    /**
     * @dev checks the given token ID is approved either for all or the single token ID
     */
    function isApproved(uint256 _tokenId, address _operator) public view returns (bool) {
        return isApprovedForAll(ownerOf(_tokenId), _operator) || getApproved(_tokenId) == _operator;
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

    /**
     @notice Checks that the URI is not empty and the designer is a real address
     @param _tokenUri URI supplied on minting
     @param _designer Address supplied on minting
     */
    function _assertMintingParamsValid(string calldata _tokenUri, address _designer) pure internal {
        require(bytes(_tokenUri).length > 0, "DigitalaxGarmentNFT._assertMintingParamsValid: Token URI is empty");
        require(_designer != address(0), "DigitalaxGarmentNFT._assertMintingParamsValid: Designer is zero address");
    }


    /**
     * @notice called when token is deposited on root chain
     * @dev Should be callable only by ChildChainManager
     * Should handle deposit by minting the required tokenId for user
     * Make sure minting is done only by this function
     * @param user user address for whom deposit is being done
     * @param depositData abi encoded tokenId
     */
    function deposit(address user, bytes calldata depositData)
    external
    onlyChildChain
    {
        // deposit single
        if (depositData.length == 32) {
            uint256 tokenId = abi.decode(depositData, (uint256));
            withdrawnTokens[tokenId] = false;
            _safeMint(user, tokenId);

            // deposit batch
        } else {
            uint256[] memory tokenIds = abi.decode(depositData, (uint256[]));
            uint256 length = tokenIds.length;
            for (uint256 i; i < length; i++) {

                withdrawnTokens[tokenIds[i]] = false;
                _safeMint(user, tokenIds[i]);
            }
        }
    }

    /**
     * @notice called when user wants to withdraw token back to root chain
     * @dev Should burn user's token. This transaction will be verified when exiting on root chain
     * @param tokenId tokenId to withdraw
     */
    function withdraw(uint256 tokenId) external {
        burn(tokenId);
        withdrawnTokens[tokenId] = true;
    }

    /**
     * @notice called when user wants to withdraw multiple tokens back to root chain
     * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
     * @param tokenIds tokenId list to withdraw
     */
    function withdrawBatch(uint256[] calldata tokenIds) external {
        uint256 length = tokenIds.length;
        require(length <= BATCH_LIMIT, "ChildERC721: EXCEEDS_BATCH_LIMIT");
        for (uint256 i; i < length; i++) {
            uint256 tokenId = tokenIds[i];
            burn(tokenId);
            withdrawnTokens[tokenIds[i]] = true;
        }
        emit WithdrawnBatch(_msgSender(), tokenIds);
    }

    function _processMessageFromRoot(bytes memory message) internal override {
        uint256[] memory _tokenIds;
        uint256[] memory _primarySalePrices;
        address[] memory _garmentDesigners;
        string[] memory _tokenUris;

        (_tokenIds, _primarySalePrices, _garmentDesigners, _tokenUris) = abi.decode(message, (uint256[], uint256[], address[], string[]));

        for( uint256 i; i< _tokenIds.length; i++){
            primarySalePrice[_tokenIds[i]] = _primarySalePrices[i];
            garmentDesigners[_tokenIds[i]] = _garmentDesigners[i];
            _tokenURIs[_tokenIds[i]] = _tokenUris[i];
        }
    }

    // Send the nft to root - if it does not exist then we can handle it on that side
    // Make this a batch
    uint256[][] childNftIdArray;
    string[][] childNftURIArray;
    uint256[][] childNftBalanceArray;

    function sendNFTsToRoot(uint256[] memory _tokenIds) external {
        uint256 length = _tokenIds.length;

        address[] memory _owners = new address[](length);
        uint256[] memory _salePrices = new uint256[](length);
        address[] memory _designers = new address[](length);
        string[] memory _tokenUris = new string[](length);

        for( uint256 i; i< length; i++){
            _owners[i] = ownerOf(_tokenIds[i]);
            require(_owners[i] == _msgSender(), "DigitalaxGarmentNFTv2.sendNFTsToRootNFTs: can only be sent by the same user");
            _salePrices[i] = primarySalePrice[_tokenIds[i]];
            _designers[i] = garmentDesigners[_tokenIds[i]];
            _tokenUris[i] = tokenURI(_tokenIds[i]);

            childNftIdArray.push(childIdsForOn(_tokenIds[i], address(childContract)));
            childNftURIArray.push(childURIsForOn(_tokenIds[i], address(childContract)));
            uint256 len = childNftIdArray[i].length;
            uint256[] memory garmentAmounts = new uint256[](len);
            for( uint256 j; j< len; j++){
                garmentAmounts[j] = childBalance(_tokenIds[i], address(childContract), childNftIdArray[i][j]);
            }
            childNftBalanceArray.push(garmentAmounts);
            // Same as withdraw
            burn(_tokenIds[i]);
            withdrawnTokens[_tokenIds[i]] = true;

            childContract.burnBatch(_msgSender(), childNftIdArray[i], childNftBalanceArray[i]);
        }

        _sendMessageToRoot(abi.encode(_tokenIds, _owners, _salePrices, _designers, _tokenUris, childNftIdArray, childNftURIArray, childNftBalanceArray));
    }

    // Batch transfer
    /**
     * @dev See {IERC721-transferFrom} for batch
     */
    function batchTransferFrom(address _from, address _to, uint256[] memory _tokenIds) public {
        for( uint256 i; i< _tokenIds.length; i++){
            //solhint-disable-next-line max-line-length
            require(_isApprovedOrOwner(_msgSender(), _tokenIds[i]), "ERC721: transfer caller is not owner nor approved");
            _transfer(_from, _to, _tokenIds[i]);
        }
    }
}
