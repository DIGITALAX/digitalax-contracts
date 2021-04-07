pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

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
    constructor(DigitalaxAccessControls _accessControls, ERC1155 _child, DigitalaxGarmentNFT _nft, address _stateSender) BaseRootTunnel(_accessControls, _stateSender) public {
        nft = _nft;
        childContract = _child;
    }

    function _processMessageFromChild(bytes memory message) internal override {
        address[] memory _owners;
        uint256[] memory _tokenIds;
        uint256[] memory _primarySalePrices;
        address[] memory _garmentDesigners;
        string[] memory _tokenUris;
        uint256[][] memory _children;
        uint256[][] memory _childrenBalances;
        (_owners, _tokenIds, _primarySalePrices, _garmentDesigners, _tokenUris, _children, _childrenBalances) = abi.decode(message, (address[], uint256[], uint256[], address[], string[], uint256[][], uint256[][]));

        for( uint256 i; i< _tokenIds.length; i++){
            // With the information above, rebuild the 721 token on mainnet
            if(!nft.exists(_tokenIds[i])){
                uint256 newId = nft.mint(_owners[i], _tokenUris[i], _garmentDesigners[i]); // TODO Check this with the matic way of doing mints (predicate)
                if(_primarySalePrices[i] > 0) {
                    nft.setPrimarySalePrice(newId, _primarySalePrices[i]);
                }
            }
        }
    }

    // For children nfts, these should be setup on the matic network before the 721 if there are any
    function transferNFTsDataToMatic(uint256[] memory _tokenIds) external {
        uint256[] memory _salePrices = new uint256[](_tokenIds.length);
        address[] memory _designers = new address[](_tokenIds.length);
        string[] memory _tokenUris = new string[](_tokenIds.length);
        uint256[][] memory _children = new uint256[][](_tokenIds.length);
        uint256[][] memory _childrenBalances = new uint256[][](_tokenIds.length);
        for( uint256 i; i< _tokenIds.length; i++){
            _salePrices[i] = nft.primarySalePrice(_tokenIds[i]);
            _designers[i] = nft.garmentDesigners(_tokenIds[i]);
            _tokenUris[i] = nft.tokenURI(_tokenIds[i]);
            _children[i] = nft.childIdsForOn(_tokenIds[i], address(childContract));
            uint256 len = _children[i].length;
            uint256[] memory _childBalances = new uint256[](len);
            for( uint256 j; j< _children.length; j++){
                _childBalances[j] = nft.childBalance(_tokenIds[i], address(childContract), _children[i][j]);
            }
            _childrenBalances[i] = _childBalances;
        }

        _sendMessageToChild(abi.encode(_tokenIds, _salePrices, _designers, _tokenUris, _children, _childrenBalances));
    }
}