// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./ERC721/DigitalaxERC721.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./EIP2771/BaseRelayRecipient.sol";
import "./DigitalaxAccessControls.sol";

/**
 * @title ESPADEV NFT on matic
 * @dev Issues ERC-721 token for ESPADEV
 */
contract ESPADEV is DigitalaxERC721("ESPADEV", "DEV"), BaseRelayRecipient, Initializable {
    using SafeMath for uint256;

    // @notice event emitted upon construction of this contract, used to bootstrap external indexers
    event ESPADEVContractDeployed();

    // @notice event emitted when token URI is updated
    event ESPADEVTokenUriUpdate(
        uint256 indexed _tokenId,
        string _tokenUri
    );
    // @notice event emitted when Developer is updated
    event ESPADeveloperUpdate(
        uint256 indexed _tokenId,
        address _developer
    );

    // @notice event emitted when a tokens primary sale occurs
    event TokenPrimarySalePriceSet(
        uint256 indexed _tokenId,
        uint256 _salePrice
    );

    /// @dev current max tokenId
    uint256 public tokenIdPointer;

    /// @dev TokenID -> Developer
    mapping(uint256 => address) public developers;

    /// @dev TokenID -> Primary Ether Sale Price in Wei
    mapping(uint256 => uint256) public primarySalePrice;

    uint256 defaultPrimarySalePrice = 0;

    /// Required to govern who can call certain functions
    DigitalaxAccessControls public accessControls;

    uint256 public maxPerBatch = 25;

    // People that can submit whitelisted tokens
    mapping(address => uint256) whitelisterIndex;
    address[] public whitelisters;

    event AddWhitelister(
        address user
    );

    event RemoveWhitelister(
        address user
    );

    /**
     @param _accessControls Address of the Digitalax access control contract
     0xb5505a6d998549090530911180f38aC5130101c6
     */
    function initialize(DigitalaxAccessControls _accessControls, address _trustedForwarder) public initializer {
        accessControls = _accessControls;
        trustedForwarder = _trustedForwarder;
        tokenIdPointer = 0;
        emit ESPADEVContractDeployed();
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
            "ESPADEV.setTrustedForwarder: Sender must be admin"
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
     @notice Mints a ESPADEV AND when minting to a contract checks if the beneficiary is a 721 compatible
     @dev Only senders with either the minter or smart contract role can invoke this method
     @param _developer ESPA Developer address
     @return uint256 The token ID of the token that was minted
     */
    function mint(address _developer, string calldata _tokenUri) public returns (uint256) {
        require(
            accessControls.hasSmartContractRole(_msgSender())
            || accessControls.hasMinterRole(_msgSender())
            || checkWhitelister(_msgSender()),
            "ESPADEV.mint: Sender must have the minter or contract role"
        );

        // Valid args
        require(_developer != address(0), "ESPADEV.mint: Developer is zero address");

        // Valid args
        _assertMintingParamsValid(_tokenUri, _developer);

        tokenIdPointer = tokenIdPointer.add(1);
        uint256 tokenId = tokenIdPointer;

        // Mint token and set token URI
        _safeMint(_developer, tokenId);

        _tokenURIs[tokenId] = _tokenUri;

        // Associate Developer
        developers[tokenId] = _developer;
        primarySalePrice[tokenId] = defaultPrimarySalePrice;
        emit TokenPrimarySalePriceSet(tokenId, defaultPrimarySalePrice);

        return tokenId;
    }

    function batchMint(address[] calldata _developers, string[] calldata _tokenUri) external returns (uint256) {
        require(
            _developers.length <= maxPerBatch,
            "ESPADEV.batchMint: Amount cannot exceed maxPerBatch"
        );

        for (uint i = 0; i < _developers.length; i++) {
            mint(_developers[i], _tokenUri[i]);
        }

        // The token id pointer will now point to the most recently minted id
        return tokenIdPointer;
    }

    /**
     @notice Checks that the URI is not empty and the designer is a real address
     @param _tokenUri URI supplied on minting
     @param _developer Address supplied on minting
     */
    function _assertMintingParamsValid(string calldata _tokenUri, address _developer) pure internal {
        require(bytes(_tokenUri).length > 0, "ESPADEV._assertMintingParamsValid: Token URI is empty");
        require(_developer != address(0), "ESPADEV._assertMintingParamsValid: Designer is zero address");
    }


    /**
     @notice Method for updating max nfts in batches
     @dev Only admin
     @param _maxPerBatch uint256 the max per batch that can be processes
     */
    function updateMaxPerBatch(uint256 _maxPerBatch) external {
        require(accessControls.hasAdminRole(_msgSender()), "ESPADEV.updateMaxPerBatch: Sender must be admin");
        maxPerBatch = _maxPerBatch;
    }

    /**
     @notice Burns a ESPADEV, releasing any composed 1155 tokens held by the token itself
     @dev Only the owner or an approved sender can call this method
     @param _tokenId the token ID to burn
     */
    function burn(uint256 _tokenId) public {
        address operator = _msgSender();
        require(
            ownerOf(_tokenId) == operator || isApproved(_tokenId, operator),
            "ESPADEV.burn: Only garment owner or approved"
        );

        // Destroy token mappings
        _burn(_tokenId);

        // Clean up mappings
        delete developers[_tokenId];
        delete primarySalePrice[_tokenId];
    }


    function batchBurn(uint256[] memory _tokenIds) external returns (uint256) {
        require(
            _tokenIds.length <= maxPerBatch,
            "ESPADEV.batchBurn: Amount cannot exceed maxPerBatch"
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
     @param _tokenId The ID of the token being updated
     @param _tokenUri The new URI
     */
    function setTokenURI(uint256 _tokenId, string calldata _tokenUri) external {
        require(
            accessControls.hasSmartContractRole(_msgSender())
            || accessControls.hasAdminRole(_msgSender()),
            "DigitalaxGarmentNFT.setTokenURI: Sender must be an authorised contract or admin"
        );
        _tokenURIs[_tokenId] = _tokenUri;
        emit ESPADEVTokenUriUpdate(_tokenId, _tokenUri);
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
            "ESPADEV.batchSetTokenURI: Must have equal length arrays"
        );
        for( uint256 i; i< _tokenIds.length; i++){
            require(
                accessControls.hasSmartContractRole(_msgSender())
                || accessControls.hasAdminRole(_msgSender()),
                "ESPADEV.batchSetTokenURI: Sender must be an authorised contract or admin"
            );
            _tokenURIs[_tokenIds[i]] = _tokenUris[i];
            emit ESPADEVTokenUriUpdate(_tokenIds[i], _tokenUris[i]);
        }
    }


    /**
     @notice Updates the token URI of a given token
     @dev Only admin or smart contract
     @param _tokenIds The ID of the token being updated
     @param _developers The new URI
     */
    function batchSetDeveloper(uint256[] memory _tokenIds, address[] calldata _developers) external {
        require(
            _tokenIds.length == _developers.length,
            "ESPADEV.batchSetDeveloper: Must have equal length arrays"
        );
        for( uint256 i; i< _tokenIds.length; i++){
            require(
                accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
                "ESPADEV.batchSetDeveloper: Sender must be an authorised contract or admin"
            );
            developers[_tokenIds[i]] = _developers[i];
            emit ESPADeveloperUpdate(_tokenIds[i], _developers[i]);
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
            "ESPADEV.batchSetPrimarySalePrice: Must have equal length arrays"
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
            "ESPADEV.setDefaultPrimarySalePrice: Sender must be an admin"
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
            "ESPADEV.setPrimarySalePrice: Sender must be an authorised contract or admin"
        );
        // require(_exists(_tokenId), "ESPADEV.setPrimarySalePrice: Token does not exist"); // Dont need to exist on matic
        require(_salePrice > 0, "ESPADEV.setPrimarySalePrice: Invalid sale price");

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
        require(accessControls.hasAdminRole(_msgSender()), "ESPADEV.updateAccessControls: Sender must be admin");
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

    function batchTokenURI(uint256[] memory tokenIds) external view returns (string[] memory) {
        uint256 length = tokenIds.length;

        string[] memory _tokenUris = new string[](length);
        for( uint256 i; i< length; i++){
            _tokenUris[i] = _tokenURIs[tokenIds[i]];
        }
        return _tokenUris;
    }

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
}
