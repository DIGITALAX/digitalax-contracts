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
        (uint256 n) = abi.decode(message, (uint256));
        nftMaxPointerFromChildChain = n;
    }

    function transferNFTDataToMatic(uint256 tokenId) external {
        require(
            accessControls.hasSmartContractRole(msg.sender) || accessControls.hasAdminRole(msg.sender),
            "DigitalaxRootTunnel.preMintOnMatic: Sender must have the admin or contract role"
        );

        uint256 _primarySalePrice = nft.primarySalePrice(tokenId);
        address _garmentDesigner= nft.garmentDesigners(tokenId);
        string memory _tokenUri = nft.tokenURI(tokenId);
        uint256[] memory _children = nft.childIdsForOn(tokenId, address(childContract));

        _sendMessageToChild(abi.encode(tokenId, _primarySalePrice, _garmentDesigner, _tokenUri, _children));
    }
}