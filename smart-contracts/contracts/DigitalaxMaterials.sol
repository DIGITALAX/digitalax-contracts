// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

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
        string calldata _uri,
        bytes calldata _data
    ) external returns (uint256) {
        require(accessControls.hasMinterRole(_msgSender()), "DigitalaxMaterials.createStrand: Sender must be minter");
        require(_initialSupply > 0, "DigitalaxMaterials.createStrand: No initial supply");
        require(bytes(_uri).length > 0, "DigitalaxMaterials.createStrand: URI is a blank string");

        tokenIdPointer = tokenIdPointer.add(1);

        uint256 strandId = tokenIdPointer;
        _mint(_beneficiary, strandId, _initialSupply, _data);
        _setURI(strandId, _uri);

        return strandId;
    }

    function batchCreateStrands(
        uint256[] calldata _initialSupplies,
        address _beneficiary,
        string[] calldata _uris,
        bytes[] calldata _datas
    ) external returns (uint256[] memory strandIds) {
        require(accessControls.hasMinterRole(_msgSender()), "DigitalaxMaterials.batchCreateStrands: Sender must be minter");
        require(_initialSupplies.length == _uris.length, "DigitalaxMaterials.batchCreateStrands: Array lengths are invalid");
        require(_initialSupplies.length == _datas.length, "DigitalaxMaterials.batchCreateStrands: Array lengths are invalid");
        require(_initialSupplies.length > 0, "DigitalaxMaterials.batchCreateStrands: No data supplied in arrays");

        strandIds = new uint256[](_initialSupplies.length);
        for(uint i = 0; i < _initialSupplies.length; i++) {
            tokenIdPointer = tokenIdPointer.add(1);

            uint256 strandId = tokenIdPointer;
            uint256 initialSupply = _initialSupplies[i];
            require(initialSupply > 0, "DigitalaxMaterials.batchCreateStrands: No initial supply");

            string memory uri = _uris[i];
            require(bytes(uri).length > 0, "DigitalaxMaterials.batchCreateStrands: URI is a blank string");

            _mint(_beneficiary, strandId, initialSupply, _datas[i]);
            _setURI(strandId, uri);

            strandIds[i] = strandId;
        }
    }

    function mintStrand(uint256 _strandId, uint256 _amount, address _beneficiary, bytes calldata _data) external {
        require(accessControls.hasMinterRole(_msgSender()), "DigitalaxMaterials.mintStrand: Sender must be minter");
        require(bytes(tokenUris[_strandId]).length > 0, "DigitalaxMaterials.mintStrand: Strand does not exist");
        require(_amount > 0, "DigitalaxMaterials.mintStrand: No amount specified");
        _mint(_beneficiary, _strandId, _amount, _data);
    }

    function batchMintStrands(
        uint256[] calldata _strandIds,
        uint256[] calldata _amounts,
        address _beneficiary,
        bytes calldata _data
    ) external {
        require(accessControls.hasMinterRole(_msgSender()), "DigitalaxMaterials.batchMintStrands: Sender must be minter");
        require(_strandIds.length == _amounts.length, "DigitalaxMaterials.batchMintStrands: Array lengths are invalid");
        require(_strandIds.length > 0, "DigitalaxMaterials.batchMintStrands: No data supplied in arrays");

        // Check the strands exist and no zero amounts
        for(uint i = 0; i < _strandIds.length; i++) {
            uint256 strandId = _strandIds[i];
            require(bytes(tokenUris[strandId]).length > 0, "DigitalaxMaterials.batchMintStrands: Strand does not exist");

            uint256 amount = _amounts[i];
            require(amount > 0, "DigitalaxMaterials.batchMintStrands: Invalid amount");
        }

        _mintBatch(_beneficiary, _strandIds, _amounts, _data);
    }

    // todo admin update tokenURI

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
