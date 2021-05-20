// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import './FxBaseChildTunnel.sol';
import '../garment/DigitalaxGarmentNFTv2.sol';
import '../garment/DigitalaxMaterialsV2.sol';

/**
 * @title FxStateChildTunnel
 */
contract FxStateChildTunnel is FxBaseChildTunnel {
    uint256 public latestStateId;
    address public latestRootMessageSender;
    bytes public latestData;
    DigitalaxGarmentNFTv2 nft;
    DigitalaxMaterialsV2 child;
    mapping (uint256 => bool) public withdrawnTokens;

    constructor(address _fxChild, DigitalaxGarmentNFTv2 _nft) FxBaseChildTunnel(_fxChild) public {
        nft = _nft;
        child = nft.childContract();
    }

    function _processMessageFromRoot(uint256 stateId, address sender, bytes memory data)
    internal
    override
    validateSender(sender) {

        latestStateId = stateId;
        latestRootMessageSender = sender;
        latestData = data;
    }

    function sendNftsToRoot(uint256[] memory _tokenIds) public {
        uint256 length = _tokenIds.length;

        address[] memory _owners = new address[](length);
        uint256[] memory _salePrices = new uint256[](length);
        address[] memory _designers = new address[](length);
        string[] memory _tokenUris = new string[](length);
        uint256[][] memory childNftIdArray = new uint256[][](length);
        string[][] memory childNftURIArray = new string[][](length);
        uint256[][] memory childNftBalanceArray = new uint256[][](length);

        for( uint256 i; i< length; i++){
            // TODO add appropriate msg sender
            _owners[i] = nft.ownerOf(_tokenIds[i]);
            require(_owners[i] == msg.sender, "DigitalaxGarmentNFTv2.sendNFTsToRootNFTs: can only be sent by the same user");
            nft.transferFrom(msg.sender, address(this), _tokenIds[i]);
            _salePrices[i] = nft.primarySalePrice(_tokenIds[i]);
            _designers[i] = nft.garmentDesigners(_tokenIds[i]);
            _tokenUris[i] = nft.tokenURI(_tokenIds[i]);

            childNftIdArray[i] = nft.childIdsForOn(_tokenIds[i], address(child));
            childNftURIArray[i] = nft.childURIsForOn(_tokenIds[i], address(child));
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

        _sendMessageToRoot(abi.encode(_tokenIds, _owners, _salePrices, _designers, _tokenUris, childNftIdArray, childNftURIArray, childNftBalanceArray));
    }
}
