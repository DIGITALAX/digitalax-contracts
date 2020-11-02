// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/GSN/Context.sol";
import "./DigitalaxGarmentNFT.sol";
import "./DigitalaxMaterials.sol";
import "./DigitalaxAccessControls.sol";

contract DigitalaxGarmentFactory is Context {
    event GarmentCreated(
        uint256 indexed garmentTokenId
    );

    DigitalaxGarmentNFT public garmentToken;
    DigitalaxMaterials public materials;
    DigitalaxAccessControls public accessControls;

    constructor(
        DigitalaxGarmentNFT _garmentToken,
        DigitalaxMaterials _materials,
        DigitalaxAccessControls _accessControls
    ) public {
        garmentToken = _garmentToken;
        materials = _materials;
        accessControls = _accessControls;
    }

    function createNewStrand(string calldata _uri) external returns (uint256 strandId) {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.createNewStrand: Sender must be minter"
        );
        return materials.createStrand(_uri);
    }

    function createNewStrands(string[] calldata _uris) external returns (uint256[] memory strandIds) {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.createNewStrands: Sender must be minter"
        );
        return materials.batchCreateStrands(_uris);
    }

    function createGarmentAndMintStrands(
        string calldata garmentTokenUri,
        address designer,
        uint256[] calldata strandIds,
        uint256[] calldata strandAmounts,
        address beneficiary
    ) external {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxGarmentFactory.createGarmentAndMintStrands: Sender must be minter"
        );
        uint256 garmentTokenId = garmentToken.mint(beneficiary, garmentTokenUri, designer);
        materials.batchMintStrands(strandIds, strandAmounts, address(garmentToken), abi.encodePacked(garmentTokenId));
        emit GarmentCreated(garmentTokenId);
    }
}
