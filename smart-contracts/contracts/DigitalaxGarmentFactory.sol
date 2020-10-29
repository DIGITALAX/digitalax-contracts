// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./DigitalaxGarmentNFT.sol";
import "./DigitalaxMaterials.sol";

contract DigitalaxGarmentFactory {
    DigitalaxGarmentNFT public garmentToken;
    DigitalaxMaterials public materials;

    function createNewStrands(
        uint256[] calldata _initialSupplies,
        address _beneficiary,
        string[] calldata _uris,
        bytes[] calldata _datas
    ) external {
        materials.batchCreateStrands(
            _initialSupplies,
            _beneficiary,
            _uris,
            _datas
        );
    }

    function createGarmentAndMintStrands(
        string calldata garmentTokenUri,
        address designer,
        uint256[] calldata strandIds,
        uint256[] calldata strandAmounts,
        address beneficary
    ) external {
        // Mint the garment - ERC721 Token ID [1]
        uint256 tokenId = garmentToken.mint(beneficary, garmentTokenUri, designer);
        materials.batchMintStrands(strandIds, strandAmounts, address(garmentToken), abi.encodePacked(tokenId));
    }
}
