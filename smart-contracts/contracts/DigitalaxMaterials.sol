// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./ERC1155/ERC1155.sol";
import "./DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract DigitalaxMaterials is ERC1155 {
    using SafeMath for uint256;

    event DigitalaxMaterialsDeployed();

    string public name;
    string public symbol;

    uint256 internal tokenIdPointer;

    DigitalaxAccessControls public accessControls;

    constructor(string memory _name, string memory _symbol, DigitalaxAccessControls _accessControls) public {
        name = _name;
        symbol = _symbol;
        accessControls = _accessControls;
        emit DigitalaxMaterialsDeployed();
    }

    function createStrand(
        uint256 _initialSupply,
        address _beneficiary,
        string calldata _uri
    ) external returns (uint256) {
        require(accessControls.hasMinterRole(_msgSender()), "DigitalaxMaterials.createStrand: Sender must be minter");

        tokenIdPointer = tokenIdPointer.add(1);

        uint256 tokenId = tokenIdPointer;
        _mint(_beneficiary, tokenId, _initialSupply, abi.encodePacked(""));
        _setURI(tokenId, _uri);

        return tokenId;
    }

    function mintStrand(uint256 _strandId, uint256 _amount, address _beneficiary) external {
        require(accessControls.hasMinterRole(_msgSender()), "DigitalaxMaterials.mintStrand: Sender must be minter");
        _mint(_beneficiary, _strandId, _amount, abi.encodePacked(""));
    }

    function batchMintStrands(uint256[] calldata _strandIds, uint256[] calldata _amounts, address _beneficiary) external {
        require(accessControls.hasMinterRole(_msgSender()), "DigitalaxMaterials.batchMintStrands: Sender must be minter");
        require(_strandIds.length == _amounts.length, "DigitalaxMaterials.batchMintStrands: Array lengths are invalid");
        require(_strandIds.length > 0, "DigitalaxMaterials.batchMintStrands: No data supplied in arrays");
        _mintBatch(_beneficiary, _strandIds, _amounts, abi.encodePacked(""));
    }

    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMaterials.updateAccessControls: Sender must be admin"
        );

        require(
            address(_accessControls) != address(0),
            "DigitalaxMaterials.updateAccessControls: New access controls cannot be ZERO address"
        );

        accessControls = _accessControls;
    }
}
