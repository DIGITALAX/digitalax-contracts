// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../garment/DigitalaxMaterials.sol";

contract MockVault {
    DigitalaxMaterials public materials;
    IERC20 public supportedERC20Asset;
    uint256 public supportedERC20AssetSyntheticStrandId;

    // using init rather than constructor as we need to know the contract address in the test to give it smart contract role
    function init(DigitalaxMaterials _materials, IERC20 _supportedERC20Asset, string memory _supportedAssetSyntheticStrandUri) external {
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

    function mintAssetBackedSyntheticMaterialToGarment(address _garmentAddress, uint256 _garmentId, uint256 _depositAmount) external {
        //TODO: this should really check owner of garment ID is msg.sender otherwise you could add to someone elses garment

        // Danger: Transfer does not guarantee this contract will receive all tokens depending on the token implementation
        supportedERC20Asset.transferFrom(msg.sender, address(this), _depositAmount);

        //mint balance of strand to sender
        materials.mintChild(
            supportedERC20AssetSyntheticStrandId,
            _depositAmount,
            _garmentAddress,
            abi.encodePacked(_garmentId)
        );
    }

    function claimUnderlyingAssetFromMaterial(uint256 _strandId, uint256 _claimAmount) external {
        //🔥
        materials.burn(msg.sender, _strandId, _claimAmount);
        supportedERC20Asset.transfer(msg.sender, _claimAmount);
    }
}
