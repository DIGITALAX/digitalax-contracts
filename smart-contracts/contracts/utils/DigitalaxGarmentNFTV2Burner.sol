// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;


import "../garment/DigitalaxGarmentNFTv2.sol";
import "../garment/DigitalaxMaterialsV2.sol";

/**
 * @title FxStateRootTunnel
 */
contract DigitalaxGarmentNFTv2Burner {

    DigitalaxGarmentNFTv2 public nft;
    DigitalaxMaterialsV2 public child;

    constructor(DigitalaxGarmentNFTv2 _nft, DigitalaxMaterialsV2 _child)  public {
        nft = _nft;
        child = _child;
    }

    function burnBatch(uint256[] memory _tokenIds) public {
        uint256 length = _tokenIds.length;
        uint256[][] memory childNftIdArray = new uint256[][](length);
        uint256[][] memory childNftBalanceArray = new uint256[][](length);

        for( uint256 i; i< _tokenIds.length; i++){
            require(nft.exists(_tokenIds[i]), "DigitalaxGarmentNFTv2Burner.burnBatch: token does not exist");
            nft.transferFrom(msg.sender, address(this), _tokenIds[i]);

            childNftIdArray[i] = nft.childIdsForOn(_tokenIds[i], address(child));
            uint256 len = childNftIdArray[i].length;
            uint256[] memory garmentAmounts = new uint256[](len);
            for( uint256 j; j< len; j++){
                garmentAmounts[j] = nft.childBalance(_tokenIds[i], address(child), childNftIdArray[i][j]);
            }
            childNftBalanceArray[i] = garmentAmounts;

            nft.burn(_tokenIds[i]);

            child.burnBatch(address(this), childNftIdArray[i], childNftBalanceArray[i]);
        }
    }

    /**
     @dev Gets mapped URIs for child tokens
     */
    function childURIsForOn(uint256[] memory childNftIdArray) public view returns (string[] memory) {
        uint256 mappingLength = childNftIdArray.length;
        string[] memory childTokenURIs = new string[](mappingLength);

        for (uint256 i = 0; i < mappingLength; i++) {
            childTokenURIs[i] = child.uri(childNftIdArray[i]);
        }

        return childTokenURIs;
    }


    /**
     @notice Single ERC721 receiver callback hook
     */
    function onERC721Received(address operator, address from, uint256 tokenId, bytes memory data)
    public
    returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /**
     @notice Single ERC1155 receiver callback hook, used to enforce children token binding to a given parent token
     */
    function onERC1155Received(address _operator, address _from, uint256 _id, uint256 _amount, bytes memory _data)
    external
    returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    /**
     @notice Batch ERC1155 receiver callback hook, used to enforce child token bindings to a given parent token ID
     */
    function onERC1155BatchReceived(address _operator, address _from, uint256[] memory _ids, uint256[] memory _values, bytes memory _data)
    external
    returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
