// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./DigitalaxGarmentNFT.sol";
import "./DigitalaxMaterials.sol";

contract DigitalaxGarmentFactory {
    DigitalaxGarmentNFT public garmentToken;
    DigitalaxMaterials public materials;

    function createNewStrand(string calldata _uri) external returns (uint256 strandId) {
        return materials.createStrand(_uri);
    }

    function createNewStrands(string[] calldata _uris) external returns (uint256[] memory strandIds) {
        return materials.batchCreateStrands(_uris);
    }

    function createGarmentAndMintStrands(
        string calldata garmentTokenUri,
        address designer,
        uint256[] calldata strandIds,
        uint256[] calldata strandAmounts,
        address beneficary
    ) external {
        uint256 tokenId = garmentToken.mint(beneficary, garmentTokenUri, designer);
        materials.batchMintStrands(strandIds, strandAmounts, address(garmentToken), abi.encodePacked(tokenId));
    }
}
