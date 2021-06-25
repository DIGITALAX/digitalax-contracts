// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./ERC721/ERC721WithSameTokenURIForAllTokens.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "./EIP2771/BaseRelayRecipient.sol";
import "./DigitalaxAccessControls.sol";

/**
 * @title Pode V2 on matic
 * @dev Issues ERC-721 token for PODE v2
 */
contract PodeNFTv2 is ERC721WithSameTokenURIForAllTokens("PODE", "PODE"), BaseRelayRecipient, Initializable {

    // @notice event emitted upon construction of this contract, used to bootstrap external indexers
    event PodeNFTContractDeployed();

    // @notice event emitted when token URI is updated
    event PodeTokenUriUpdate(
        string _tokenUri
    );
    // @notice event emitted when OG Holder is updated
    event PodeOGHolderUpdate(
        uint256 indexed _tokenId,
        address _ogHolder
    );

    // @notice event emitted when a tokens primary sale occurs
    event TokenPrimarySalePriceSet(
        uint256 indexed _tokenId,
        uint256 _salePrice
    );

    /// @dev current max tokenId
    uint256 public tokenIdPointer;

    /// @dev TokenID -> OG Holder
    mapping(uint256 => address) public ogHolders;

    /// @dev TokenID -> Primary Ether Sale Price in Wei
    mapping(uint256 => uint256) public primarySalePrice;

    uint256 defaultPrimarySalePrice = 1000000000000000000;

    /// @dev limit batching of tokens due to gas limit restrictions
    uint256 public BATCH_LIMIT;

    mapping (uint256 => bool) public withdrawnTokens;

    /// Required to govern who can call certain functions
    DigitalaxAccessControls public accessControls;

    uint256 public maxPerBatch = 25;

    /**
     @param _accessControls Address of the Digitalax access control contract
     0xb5505a6d998549090530911180f38aC5130101c6
     */
    function initialize(DigitalaxAccessControls _accessControls, address _trustedForwarder) public initializer {
        accessControls = _accessControls;
        trustedForwarder = _trustedForwarder;
        tokenIdPointer = 0;
        BATCH_LIMIT = 20;
        emit PodeNFTContractDeployed();
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
            "PodeNFT.setTrustedForwarder: Sender must be admin"
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
     @notice Mints a PodeNFT AND when minting to a contract checks if the beneficiary is a 721 compatible
     @dev Only senders with either the minter or smart contract role can invoke this method
     @param _beneficiary Recipient of the NFT
     @param _ogHolder OG Holders - will be required for issuing royalties from secondary sales
     @return uint256 The token ID of the token that was minted
     */
    function mint(address _beneficiary, address _ogHolder) public returns (uint256) {
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasMinterRole(_msgSender()),
            "PodeNFT.mint: Sender must have the minter or contract role"
        );

        // Valid args

        require(_ogHolder != address(0), "PodeNFTv2.mint: OG Holder is zero address");

        tokenIdPointer = tokenIdPointer.add(1);
        uint256 tokenId = tokenIdPointer;

        // Mint token and set token URI
        _safeMint(_beneficiary, tokenId);

        // Associate OG Holder
        ogHolders[tokenId] = _ogHolder;
        primarySalePrice[tokenId] = defaultPrimarySalePrice;
        emit TokenPrimarySalePriceSet(tokenId, defaultPrimarySalePrice);

        return tokenId;
    }

    function batchMint(address[] memory _recipients, address[] memory _ogHolders) external returns (uint256) {
        require(
            _recipients.length <= maxPerBatch,
            "PodeNFTv2.batchMint: Amount cannot exceed maxPerBatch"
        );

        for (uint i = 0; i < _recipients.length; i ++) {
            mint(_recipients[i], _ogHolders[i]);
        }

        // The token id pointer will now point to the most recently minted id
        return tokenIdPointer;
    }

    /**
     @notice Method for updating max nfts in batches
     @dev Only admin
     @param _maxPerBatch uint256 the max per batch that can be processes
     */
    function updateMaxPerBatch(uint256 _maxPerBatch) external {
        require(accessControls.hasAdminRole(_msgSender()), "PodeNFTv2.updateMaxPerBatch: Sender must be admin");
        maxPerBatch = _maxPerBatch;
    }

    /**
     @notice Burns a PodeNFT, releasing any composed 1155 tokens held by the token itself
     @dev Only the owner or an approved sender can call this method
     @param _tokenId the token ID to burn
     */
    function burn(uint256 _tokenId) public {
        address operator = _msgSender();
        require(
            ownerOf(_tokenId) == operator || isApproved(_tokenId, operator),
            "PodeNFTv2.burn: Only garment owner or approved"
        );

        // Destroy token mappings
        _burn(_tokenId);

        // Clean up mappings
        delete ogHolders[_tokenId];
        delete primarySalePrice[_tokenId];
    }


    function batchBurn(uint256[] memory _tokenIds) external returns (uint256) {
        require(
            _tokenIds.length <= maxPerBatch,
            "PodeNFTv2.batchBurn: Amount cannot exceed maxPerBatch"
        );

        for (uint i = 0; i < _tokenIds.length; i ++) {
            burn(_tokenIds[i]);
        }

        // The token id pointer will now point to the most recently minted id
        return tokenIdPointer;
    }


    //////////
    // Admin /
    //////////

    /**
     @notice Updates the token URI of a given token
     @dev Only admin or smart contract
     @param _tokenUri The new URI
     */
    function setTokenURI(string calldata _tokenUri) external {
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "PodeNFT.setTokenURI: Sender must be an authorised contract or admin"
        );
        tokenURI_ = _tokenUri;
        emit PodeTokenUriUpdate(_tokenUri);
    }

    /**
     @notice Updates the token URI of a given token
     @dev Only admin or smart contract
     @param _tokenIds The ID of the token being updated
     @param _ogHolders The new URI
     */
    function batchSetOGHolder(uint256[] memory _tokenIds, address[] calldata _ogHolders) external {
        require(
            _tokenIds.length == _ogHolders.length,
            "PodeNFT.batchSetOGHolder: Must have equal length arrays"
        );
        for( uint256 i; i< _tokenIds.length; i++){
            require(
                accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
                "PodeNFT.batchSetOGHolder: Sender must be an authorised contract or admin"
            );
            ogHolders[_tokenIds[i]] = _ogHolders[i];
            emit PodeOGHolderUpdate(_tokenIds[i], _ogHolders[i]);
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
            "PodeNFT.batchSetPrimarySalePrice: Must have equal length arrays"
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
     @notice Default for minting the Ether price that a given token was sold for (in WEI)
     @dev Only admin can call this method
     @param _salePrice The primary Ether sale price in WEI
     */
    function setDefaultPrimarySalePrice(uint256 _salePrice) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "PodeNFT.setDefaultPrimarySalePrice: Sender must be an admin"
        );
        defaultPrimarySalePrice = _salePrice;
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
            "PodeNFT.setPrimarySalePrice: Sender must be an authorised contract or admin"
        );
        // require(_exists(_tokenId), "PodeNFT.setPrimarySalePrice: Token does not exist"); // Dont need to exist on matic
        require(_salePrice > 0, "PodeNFT.setPrimarySalePrice: Invalid sale price");

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
        require(accessControls.hasAdminRole(_msgSender()), "PodeNFT.updateAccessControls: Sender must be admin");
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

    /**
     * @dev checks the given token ID is approved either for all or the single token ID
     */
    function isApproved(uint256 _tokenId, address _operator) public view returns (bool) {
        return isApprovedForAll(ownerOf(_tokenId), _operator) || getApproved(_tokenId) == _operator;
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

    function batchTokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 length = balanceOf(owner);
        uint256[] memory _tokenIds = new uint256[](length);

        for( uint256 i; i< length; i++){
            _tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        return _tokenIds;
    }

    function batchPrimarySalePrice(uint256[] memory tokenIds) external view returns (uint256[] memory) {
        uint256 length = tokenIds.length;

        uint256[] memory _primarySalePrices = new uint256[](length);
        for( uint256 i; i< length; i++){
            _primarySalePrices[i] = primarySalePrice[tokenIds[i]];
        }
        return _primarySalePrices;
    }
}
