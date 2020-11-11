// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../garment/DigitalaxMaterials.sol";

contract MockVault {
    DigitalaxMaterials public materials;
    IERC20 public supportedERC20Asset;
    uint256 public supportedERC20AssetSyntheticStrandId;

    constructor(DigitalaxMaterials _materials, IERC20 _supportedERC20Asset, string memory _supportedAssetSyntheticStrandUri) public {
        materials = _materials;

        // If this contract supported many assets, this would be in a 'whitelist' method of sorts (maybe without the createChild and instead with a strandId)
        supportedERC20Asset = _supportedERC20Asset;
        supportedERC20AssetSyntheticStrandId = materials.createChild(_supportedAssetSyntheticStrandUri);
    }

    function mintAssetBackedSyntheticMaterial(uint256 _depositAmount) external {
        // Danger: Transfer does not guarantee this contract will receive all tokens depending on the token implementation
        supportedERC20Asset.transferFrom(msg.sender, address(this), _depositAmount);

        //mint balance of strand to sender
        materials.mintChild(
            supportedERC20AssetSyntheticStrandId,
            _depositAmount,
            msg.sender,
            abi.encodePacked("")
        );
    }
}
