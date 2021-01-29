// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "./DigitalaxAccessControls.sol";
import "./DigitalaxPodeNFT.sol";

/**
 * @title Digitalax PCP NFT a.k.a. parent NFTs
 */
contract DigitalaxPodePortal is ERC721("DigitalaxPodePortal", "PCP") {

    // @notice event emitted upon construction of this contract, used to bootstrap external indexers
    event DigitalaxPodePortalContractDeployed();
    event DigitalaxPodePortalMetadataAdded(uint256 index, string tokenUri);
    event DigitalaxPodePortalMinted(uint256 tokenId, address beneficiary, string tokenUri);

    /// @dev Required to govern who can call certain functions
    DigitalaxAccessControls public accessControls;
    DigitalaxPodeNFT public podeNft;

    /// @dev current max tokenId
    uint256 public tokenIdPointer;

    /// @dev Limit of tokens per address
    uint256 public maxLimit = 1;

    /// @dev TokenID -> Designer address
    mapping(uint256 => address) public designers;

    /// @dev List of metadata
    string[] public metadataList;

    /// @dev ERC721 Token ID -> ERC1155 ID -> Balance
    mapping(uint256 => mapping(uint256 => uint256)) private balances;

    /**
     @param _accessControls Address of the Digitalax access control contract
     */
    constructor(DigitalaxAccessControls _accessControls, DigitalaxPodeNFT _podeNft) public {
        accessControls = _accessControls;
        podeNft = _podeNft;
        emit DigitalaxPodePortalContractDeployed();
    }

    /**
     @notice Mints a DigitalaxPodePortal AND when minting to a contract checks if the beneficiary is a 721 compatible
     @dev Only senders with either the minter or smart contract role can invoke this method
     @param _beneficiary Recipient of the NFT
     @return uint256 The token ID of the token that was minted
     */
    function mint(address _beneficiary) external returns (uint256) {
        require(balanceOf(_msgSender()) < maxLimit, "DigitalaxPodePortal.mint: Sender already minted");
        require(podeNft.balanceOf(_msgSender()) > 0, "DigitalaxPodePortal.mint: Sender must have PODE NFT");

        // Valid args
        uint256 _randomIndex = _rand();
        require(bytes(metadataList[_randomIndex]).length > 0, "DigitalaxPodePortal.mint: Token URI is empty");

        tokenIdPointer = tokenIdPointer.add(1);
        uint256 tokenId = tokenIdPointer;

        // Mint token and set token URI
        _safeMint(_beneficiary, tokenId);
        _setTokenURI(tokenId, metadataList[_randomIndex]);

        emit DigitalaxPodePortalMinted(tokenId, _beneficiary, metadataList[_randomIndex]);
        return tokenId;
    }

    /**
     @notice Burns a DigitalaxPodePortal, releasing any composed 1155 tokens held by the token itself
     @dev Only the owner or an approved sender can call this method
     @param _tokenId the token ID to burn
     */
    function burn(uint256 _tokenId) external {
        address operator = _msgSender();
        require(
            ownerOf(_tokenId) == operator || isApproved(_tokenId, operator),
            "DigitalaxPodePortal.burn: Only garment owner or approved"
        );

        // Destroy token mappings
        _burn(_tokenId);

        // Clean up designer mapping
        delete designers[_tokenId];
    }

    //////////
    // Admin /
    //////////

    /**
     @notice Updates the token URI of a given token
     @dev Only admin or smart contract
     @param _tokenUri The new URI
     */
    function addTokenURI(string calldata _tokenUri) external {
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "DigitalaxPodePortal.addTokenURI: Sender must be an authorised contract or admin"
        );
        _addTokenURI(_tokenUri);
    }

    /**
     @notice Method for setting max limit
     @dev Only admin
     @param _maxLimit New max limit
     */
    function setMaxLimit(uint256 _maxLimit) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxPodePortal.addTokenURI: Sender must be an authorised contract or admin"
        );
        maxLimit = _maxLimit;
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxPodePortal.updateAccessControls: Sender must be admin");
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

    /**
     @notice Checks that the URI is not empty and the designer is a real address
     @param _tokenUri URI supplied on minting
     @param _designer Address supplied on minting
     */
    function _assertMintingParamsValid(string calldata _tokenUri, address _designer) pure internal {
        require(bytes(_tokenUri).length > 0, "DigitalaxPodePortal._assertMintingParamsValid: Token URI is empty");
        require(_designer != address(0), "DigitalaxPodePortal._assertMintingParamsValid: Designer is zero address");
    }

    /**
     @notice Generate unpredictable random number
     */
    function _rand() private view returns (uint256) {
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp + block.difficulty +
            ((uint256(keccak256(abi.encodePacked(block.coinbase)))) / (now)) +
            block.gaslimit + 
            ((uint256(keccak256(abi.encodePacked(msg.sender)))) / (now)) +
            block.number
        )));

        return seed.sub(seed.div(metadataList.length).mul(metadataList.length));
    }

    /**
     @notice Method for adding metadata to the list
     @param _tokenUri URI for metadata
     */
    function _addTokenURI(string calldata _tokenUri) internal {
        uint256 index = metadataList.length;
        metadataList.push(_tokenUri);
        emit DigitalaxPodePortalMetadataAdded(index, _tokenUri);
    }
}
