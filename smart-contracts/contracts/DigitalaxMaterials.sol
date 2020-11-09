// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./ERC1155/ERC1155.sol";
import "./DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract DigitalaxMaterials is ERC1155 {
    using SafeMath for uint256;

    event DigitalaxMaterialsDeployed();

    event ChildCreated(
        uint256 indexed strandId
    );

    string public name;
    string public symbol;

    uint256 public tokenIdPointer;
    mapping(uint256 => uint256) public childTokenTotalSupply;

    DigitalaxAccessControls public accessControls;

    constructor(
        string memory _name,
        string memory _symbol,
        DigitalaxAccessControls _accessControls
    ) public {
        name = _name;
        symbol = _symbol;
        accessControls = _accessControls;
        emit DigitalaxMaterialsDeployed();
    }

    ///////////////////////////
    // Creating new children //
    ///////////////////////////

    //TODO: do we need a reverse lookup to ensure a token URI
    function createChild(string calldata _uri) external returns (uint256 id) {
        require(
            accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxMaterials.createChild: Sender must be smart contract"
        );

        require(bytes(_uri).length > 0, "DigitalaxMaterials.createChild: URI is a blank string");

        tokenIdPointer = tokenIdPointer.add(1);

        id = tokenIdPointer;
        _setURI(id, _uri);

        emit ChildCreated(id);
    }

    function batchCreateChildren(string[] calldata _uris) external returns (uint256[] memory tokenIds) {
        require(
            accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxMaterials.batchCreateChildren: Sender must be smart contract"
        );

        require(_uris.length > 0, "DigitalaxMaterials.batchCreateChildren: No data supplied in array");

        tokenIds = new uint256[](_uris.length);
        for (uint i = 0; i < _uris.length; i++) {
            string memory uri = _uris[i];
            require(bytes(uri).length > 0, "DigitalaxMaterials.batchCreateChildren: URI is a blank string");

            tokenIdPointer = tokenIdPointer.add(1);
            uint256 id = tokenIdPointer;

            _setURI(id, uri);

            tokenIds[i] = id;

            emit ChildCreated(id);
        }
    }

    //////////////////////////////////
    // Minting of existing children //
    //////////////////////////////////

    function mintChild(uint256 _childTokenId, uint256 _amount, address _beneficiary, bytes calldata _data) external {
        require(
            accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxMaterials.mintChild: Sender must be smart contract"
        );

        require(bytes(tokenUris[_childTokenId]).length > 0, "DigitalaxMaterials.mintChild: Strand does not exist");
        require(_amount > 0, "DigitalaxMaterials.mintChild: No amount specified");

        childTokenTotalSupply[_childTokenId] = childTokenTotalSupply[_childTokenId].add(_amount);

        _mint(_beneficiary, _childTokenId, _amount, _data);
    }

    function batchMintChildren(
        uint256[] calldata _childTokenIds,
        uint256[] calldata _amounts,
        address _beneficiary,
        bytes calldata _data
    ) external {
        require(
            accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxMaterials.batchMintChildren: Sender must be smart contract"
        );

        require(_childTokenIds.length == _amounts.length, "DigitalaxMaterials.batchMintChildren: Array lengths are invalid");
        require(_childTokenIds.length > 0, "DigitalaxMaterials.batchMintChildren: No data supplied in arrays");

        // Check the strands exist and no zero amounts
        for (uint i = 0; i < _childTokenIds.length; i++) {
            uint256 strandId = _childTokenIds[i];
            require(bytes(tokenUris[strandId]).length > 0, "DigitalaxMaterials.batchMintChildren: Strand does not exist");

            uint256 amount = _amounts[i];
            require(amount > 0, "DigitalaxMaterials.batchMintChildren: Invalid amount");

            childTokenTotalSupply[strandId] = childTokenTotalSupply[strandId].add(amount);
        }

        _mintBatch(_beneficiary, _childTokenIds, _amounts, _data);
    }

    // todo smart contract burn

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
