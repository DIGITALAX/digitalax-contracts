// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import './FxBaseChildTunnel.sol';
import '../garment/DigitalaxGarmentNFTv2.sol';
import '../garment/DigitalaxMaterialsV2.sol';
import "../EIP2771/BaseRelayRecipient.sol";

/**
 * @title FxStateChildTunnel
 */
contract FxStateChildTunnel is FxBaseChildTunnel, BaseRelayRecipient {
    uint256 public latestStateId;
    address public latestRootMessageSender;
    bytes public latestData;
    DigitalaxGarmentNFTv2 public nft;
    DigitalaxMaterialsV2 public child;
    mapping (uint256 => bool) public withdrawnTokens;
    // MessageTunnel on L1 will get data from this event
    event NFTSentToRoot(uint256[] tokenIds, address[] owners, uint256[] primarySalePrices, address[] designers, string[] tokenUris);
    event NFTReceivedFromRoot(uint256[] tokenIds, address[] owners, uint256[] primarySalePrices, address[] designers, string[] tokenUris);

    constructor(address _fxChild, DigitalaxGarmentNFTv2 _nft, address _trustedForwarder) FxBaseChildTunnel(_fxChild) public {
        nft = _nft;
        child = nft.childContract();

        trustedForwarder = _trustedForwarder;
    }

    function _processMessageFromRoot(uint256 stateId, address sender, bytes memory data)
    internal
    override
    validateSender(sender) {

        latestStateId = stateId;
        latestRootMessageSender = sender;
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
        emit NFTReceivedFromRoot(_tokenIds, _owners, _primarySalePrices, _garmentDesigners, _tokenUris);
    }

    function sendNFTsToRoot(uint256[] memory _tokenIds) public {
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
            require(_owners[i] == _msgSender(), "FxStateChildTunnel.sendNFTsToRoot: can only be sent by the same user");
            require(nft.exists(_tokenIds[i]), "FxStateRootTunnel.sendNFTsToChild: token does not exist");
            nft.transferFrom(_msgSender(), address(this), _tokenIds[i]);
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

        emit NFTSentToRoot(_tokenIds, _owners, _salePrices, _designers, _tokenUris);
        _sendMessageToRoot(abi.encode(_tokenIds, _owners, _salePrices, _designers, _tokenUris, childNftIdArray, childNftURIArray, childNftBalanceArray));
    }


    /**
     * Override this function.
     * This version is to keep track of BaseRelayRecipient you are using
     * in your contract.
     */
    function versionRecipient() external view override returns (string memory) {
        return "1";
    }

    // This is to support Native meta transactions
    // never use msg.sender directly, use _msgSender() instead
    function _msgSender()
    internal
    view
    returns (address payable sender)
    {
        return BaseRelayRecipient.msgSender();
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
