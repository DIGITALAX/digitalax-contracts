pragma solidity 0.6.12;

import {BaseRootTunnel} from "./BaseRootTunnel.sol";
import "../garment/DigitalaxGarmentNFT.sol";
import "../ERC1155/ERC1155.sol";

contract DigitalaxRootTunnel is BaseRootTunnel {
    uint256 public nftMaxPointerFromChildChain;
    DigitalaxGarmentNFT public nft;

    /// @dev Child ERC1155 contract address
    ERC1155 public childContract;

    /**
    @param _accessControls Address of the Digitalax access control contract
    */
    constructor(DigitalaxAccessControls _accessControls, ERC1155 _child, DigitalaxGarmentNFT _nft) BaseRootTunnel(_accessControls) public {
        nft = _nft;
        childContract = _child;
    }

    // Right now this just processes the max pointer of token id on child chain.
    function _processMessageFromChild(bytes memory message) internal override {
        uint256 _tokenId;
        uint256 _primarySalePrice;
        address _garmentDesigner;
        string memory _tokenUri;
        uint256[] memory _children;
        uint256[] memory _childrenBalances;
        (_tokenId, _primarySalePrice, _garmentDesigner, _tokenUri, _children, _childrenBalances) = abi.decode(message, (uint256, uint256, address, string, uint256[], uint256[]));

        // TODO With the information above, rebuild the 721 token from matic in mainnet!
      //  primarySalePrice[_tokenId] = _primarySalePrice;
      //  garmentDesigners[_tokenId] = _garmentDesigner;
      //  _setTokenURI(_tokenId, _tokenUri);
       // for (uint256 i = 0; i< _children.length; i++) {
       //     _receiveChild(_tokenId, _msgSender(), _children[i], _childrenBalances[i]);
      //  }
    }

    // For children nfts, these should be setup on the matic network before the 721 if there are any
    function transferNFTDataToMatic(uint256 tokenId) external {
        uint256 _primarySalePrice = nft.primarySalePrice(tokenId);
        address _garmentDesigner= nft.garmentDesigners(tokenId);
        string memory _tokenUri = nft.tokenURI(tokenId);
        uint256[] memory _children = nft.childIdsForOn(tokenId, address(childContract));
        uint256 len = _children.length;
        uint256[] memory childBalances = new uint256[](len);
        for( uint256 i; i< _children.length; i++){
            childBalances[i] = nft.childBalance(tokenId, address(childContract), _children[i]);
        }

        _sendMessageToChild(abi.encode(tokenId, _primarySalePrice, _garmentDesigner, _tokenUri, _children, childBalances));
    }
}