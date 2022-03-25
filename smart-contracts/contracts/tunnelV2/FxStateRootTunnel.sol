// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./FxBaseRootTunnel.sol";
import "../garment/DigitalaxGarmentNFT.sol";
import "../garment/DigitalaxMaterials.sol";

/**
 * @title FxStateRootTunnel
 */
contract FxStateRootTunnel is FxBaseRootTunnel {
    bytes public latestData;
    DigitalaxGarmentNFT public nft;
    DigitalaxMaterials public child;
    mapping (uint256 => bool) public withdrawnTokens;
    event RootMessageSent(bytes message);

    event NFTSentToChild(uint256[] tokenIds, address[] owners, uint256[] primarySalePrices, address[] designers, string[] tokenUris);
    event NFTReceivedFromChild(uint256[] tokenIds, address[] owners, uint256[] primarySalePrices, address[] designers, string[] tokenUris);


    constructor(address _checkpointManager, address _fxRoot, DigitalaxGarmentNFT _nft, DigitalaxMaterials _child)  FxBaseRootTunnel(_checkpointManager, _fxRoot) public {
        nft = _nft;
        child = _child;
    }

    function _processMessageFromChild(bytes memory data) internal override {
        latestData = data;
        address[] memory _owners;
        uint256[] memory _tokenIds;
        uint256[] memory _primarySalePrices;
        address[] memory _garmentDesigners;
        string[] memory _tokenUris;
        uint256[][] memory _children;
        string[][] memory _childrenURIs;
        uint256[][] memory _childrenBalances;
        ( _tokenIds, _owners, _primarySalePrices, _garmentDesigners, _tokenUris, _children, _childrenURIs, _childrenBalances) = abi.decode(data, (uint256[], address[], uint256[], address[], string[], uint256[][], string[][], uint256[][]));
        for( uint256 i; i< _tokenIds.length; i++){

            // With the information above, rebuild the 721 token on mainnet
            if(!nft.exists(_tokenIds[i])){
                uint256 newTokenId = nft.mint(_owners[i], _tokenUris[i], _garmentDesigners[i]);
                if(_primarySalePrices[i] > 0) {
                    nft.setPrimarySalePrice(newTokenId, _primarySalePrices[i]);
                }
                if(_children[i].length > 0){
                    for( uint256 j; j< _children[i].length; j++){
                        uint256 newChildId = child.createChild(_childrenURIs[i][j]);
                        child.mintChild(newChildId, _childrenBalances[i][j], address(nft), abi.encodePacked(newTokenId));
                    }
                }
            }
        }

        emit NFTReceivedFromChild(_tokenIds, _owners, _primarySalePrices, _garmentDesigners, _tokenUris);
    }

    function sendNFTsToChild(uint256[] memory _tokenIds) public {
        uint256 length = _tokenIds.length;
        uint256[] memory _salePrices = new uint256[](length);
        address[] memory _designers = new address[](length);
        string[] memory _tokenUris = new string[](length);
        address[] memory _owners = new address[](length);
        uint256[][] memory childNftIdArray = new uint256[][](length);
        string[][] memory childNftURIArray = new string[][](length);
        uint256[][] memory childNftBalanceArray = new uint256[][](length);

        for( uint256 i; i< _tokenIds.length; i++){
            _owners[i] = nft.ownerOf(_tokenIds[i]);
            require(_owners[i] == msg.sender, "FxStateRootTunnel.sendNFTsToChild: can only be sent by the same user");
            require(nft.exists(_tokenIds[i]), "FxStateRootTunnel.sendNFTsToChild: token does not exist");
            nft.transferFrom(msg.sender, address(this), _tokenIds[i]);
            _salePrices[i] = nft.primarySalePrice(_tokenIds[i]);
            _designers[i] = nft.garmentDesigners(_tokenIds[i]);
            _tokenUris[i] = nft.tokenURI(_tokenIds[i]);

            childNftIdArray[i] = nft.childIdsForOn(_tokenIds[i], address(child));
            childNftURIArray[i] = childURIsForOn(childNftIdArray[i]);
            uint256 len = childNftIdArray[i].length;
            uint256[] memory garmentAmounts = new uint256[](len);
            for( uint256 j; j< len; j++){
                garmentAmounts[j] = nft.childBalance(_tokenIds[i], address(child), childNftIdArray[i][j]);
            }
            childNftBalanceArray[i] = garmentAmounts;
            // Same as withdraw
            nft.burn(_tokenIds[i]);
            withdrawnTokens[_tokenIds[i]] = true;

            child.burnBatch(address(this), childNftIdArray[i], childNftBalanceArray[i]);
        }
        bytes memory message = abi.encode(_tokenIds, _owners, _salePrices, _designers, _tokenUris, childNftIdArray, childNftURIArray, childNftBalanceArray);
        _sendMessageToChild(message);
        emit RootMessageSent(message);
        emit NFTSentToChild(_tokenIds, _owners, _salePrices, _designers, _tokenUris);

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
