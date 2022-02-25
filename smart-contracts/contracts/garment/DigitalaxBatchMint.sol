// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "../DigitalaxAccessControls.sol";

interface IDigiNFT {
    function  mint(address _beneficiary, string calldata _tokenUri, address _designer) external returns (uint256);
}
/**
 * @title Digitalax Garment NFT a.k.a. parent NFTs
 * @dev Issues ERC-721 tokens as well as being able to hold child 1155 tokens
 */
contract DigitalaxBatchMint{
    bool initialized;
    DigitalaxAccessControls accessControls;

    function initialize(DigitalaxAccessControls _accessControls) public {
        require(!initialized);
        accessControls = _accessControls;
        initialized = true;
    }

    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(msg.sender),
            "updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "updateAccessControls: Zero Address");
        accessControls = _accessControls;
    }

    // function mint(address _beneficiary, string calldata _tokenUri, address _designer) external returns (uint256) {

    function batchMint(address nft, address[] memory _beneficiaries, string[] memory _tokenUris, address[] memory _designers) public {
        require(accessControls.hasMinterRole(msg.sender), "Sender must be minter");
        require(_beneficiaries.length == _tokenUris.length);
        require(_beneficiaries.length == _designers.length);
        for( uint256 i; i< _beneficiaries.length; i++){
            IDigiNFT(nft).mint(_beneficiaries[i], _tokenUris[i], _designers[i]);
        }
    }

}
