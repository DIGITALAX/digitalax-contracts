pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {BaseRootTunnel} from "./BaseRootTunnel.sol";
import "../garment/DigitalaxGarmentNFT.sol";
import "../garment/DigitalaxMaterials.sol";
import "../ERC1155/ERC1155.sol";

contract DigitalaxRootTunnel is BaseRootTunnel {
    DigitalaxGarmentNFT public nft;
    DigitalaxMaterials public materials;

    /**
    @param _accessControls Address of the Digitalax access control contract
    */
    constructor(DigitalaxAccessControls _accessControls, DigitalaxGarmentNFT _nft, DigitalaxMaterials _materials, address _stateSender) BaseRootTunnel(_accessControls, _stateSender) public {
        nft = _nft;
        materials = _materials;
    }

    function _processMessageFromChild(bytes memory message) internal override {
        address[] memory _owners;
        uint256[] memory _tokenIds;
        uint256[] memory _primarySalePrices;
        address[] memory _garmentDesigners;
        string[] memory _tokenUris;
        uint256[][] memory _children;
        string[][] memory _childrenURIs;
        uint256[][] memory _childrenBalances;
        ( _tokenIds, _owners, _primarySalePrices, _garmentDesigners, _tokenUris, _children, _childrenURIs, _childrenBalances) = abi.decode(message, (uint256[], address[], uint256[], address[], string[], uint256[][], string[][], uint256[][]));
        for( uint256 i; i< _tokenIds.length; i++){

            // With the information above, rebuild the 721 token on mainnet
            if(!nft.exists(_tokenIds[i])){
                uint256 newTokenId = nft.mint(_owners[i], _tokenUris[i], _garmentDesigners[i]);
                if(_primarySalePrices[i] > 0) {
                    nft.setPrimarySalePrice(newTokenId, _primarySalePrices[i]);
                }
                if(_children[i].length > 0){
                    for( uint256 j; j< _children[i].length; j++){
                            uint256 newChildId = materials.createChild(_childrenURIs[i][j]);
                            materials.mintChild(newChildId, _childrenBalances[i][j], address(nft), abi.encodePacked(newTokenId));
                    }
                }
            }
        }
    }

    // Send the nft to matic
    uint256[][] childNftIdArray;
    string[][] childNftURIArray;
    uint256[][] childNftBalanceArray;

    // For children nfts, these should be setup on the matic network before the 721 if there are any
    // This should be done before doing a classic matic deposit, that is why anyone can call it for now
    function transferNFTsDataToMatic(uint256[] memory _tokenIds) external {
        uint256 length = _tokenIds.length;
        uint256[] memory _salePrices = new uint256[](length);
        address[] memory _designers = new address[](length);
        string[] memory _tokenUris = new string[](length);

        for( uint256 i; i< _tokenIds.length; i++){
            _salePrices[i] = nft.primarySalePrice(_tokenIds[i]);
            _designers[i] = nft.garmentDesigners(_tokenIds[i]);
            _tokenUris[i] = nft.tokenURI(_tokenIds[i]);
        }

        _sendMessageToChild(abi.encode(_tokenIds, _salePrices, _designers, _tokenUris));
    }
}