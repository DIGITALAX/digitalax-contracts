// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./DigitalaxAccessControls.sol";
//TODO: update access controls admin method
// TODO: secondary sale mechanics need to be built into core NFT twisted sister style - modify 721 to add payable
// TODO: before each hook could also implement do not transfer to self
contract DigitalaxGarmentNFT is ERC721("Digitalax", "DTX") {

    // TODO: events for updating token URI and updating access controls

    /// @notice Required to govern who can call certain functions
    DigitalaxAccessControls public accessControls;

    // TODO: add platform address
    // TODO: add platform percentage of secondary sales

    /// @notice TokenID -> Designer address
    mapping(uint256 => address) public garmentDesigners;

    /// @notice TokenID -> Primary Ether Sale Price in Wei
    mapping(uint256 => uint256) public primarySalePrice;

    //TODO: check whether this should there be last sale price too?

    constructor(DigitalaxAccessControls _accessControls) public {
        accessControls = _accessControls;
    }

    /**
     @notice Mints a DigitalaxGarmentNFT but does not check if the beneficiary is a 721 compatible contract
     @dev Only senders with either the minter or smart contract role can invoke this method
     @param _beneficiary Recipient of the NFT
     @param _tokenUri URI for the token being minted
     @param _designer Garment designer - will be required for issuing royalties from secondary sales
     @return uint256 The token ID of the token that was minted
     */
    function mint(address _beneficiary, string calldata _tokenUri, address _designer) external returns(uint256) {
        bool isMinter = accessControls.hasMinterRole(_msgSender());
        bool isSmartContract = accessControls.hasSmartContractRole(_msgSender());
        require(isMinter || isSmartContract, "DigitalaxGarmentNFT.mint: Sender must have the minter or contract role");

        assertMintingParamsValid(_tokenUri, _designer);

        uint256 tokenId = totalSupply().add(1);
        _mint(_beneficiary, tokenId);
        _setTokenURI(tokenId, _tokenUri);

        garmentDesigners[tokenId] = _designer;

        return tokenId;
    }

    /**
     @notice Mints a DigitalaxGarmentNFT AND when minting to a contract checks if the beneficiary is a 721 compatible
     @dev Only senders with either the minter or smart contract role can invoke this method
     @param _beneficiary Recipient of the NFT
     @param _tokenUri URI for the token being minted
     @param _designer Garment designer - will be required for issuing royalties from secondary sales
     @return uint256 The token ID of the token that was minted
     */
    function safeMint(address _beneficiary, string calldata _tokenUri, address _designer) external returns(uint256) {
        bool isMinter = accessControls.hasMinterRole(_msgSender());
        bool isSmartContract = accessControls.hasSmartContractRole(_msgSender());
        require(isMinter || isSmartContract, "DigitalaxGarmentNFT.safeMint: Sender must have the minter or contract role");

        assertMintingParamsValid(_tokenUri, _designer);

        uint256 tokenId = totalSupply().add(1);
        _safeMint(_beneficiary, tokenId);
        _setTokenURI(tokenId, _tokenUri);

        garmentDesigners[tokenId] = _designer;

        return tokenId;
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
        require(accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "DigitalaxGarmentNFT.setPrimarySalePrice: Sender must be an authorised contract or admin");
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


    /////////////////////////
    // Internal and Private /
    /////////////////////////

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
