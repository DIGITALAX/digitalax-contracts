// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./DigitalaxAccessControls.sol";
import "./staking/interfaces/IChild.sol";

/**
 * @notice DigitalaxChildVerifiedMint
 */
contract DigitalaxChildVerifiedMint is Context {
    using SafeMath for uint256;
    bool initialised;

    // Access Controls
    DigitalaxAccessControls public accessControls;
    IChild public childContract;

    event CreateChild(string _uri);
    event BatchCreateChildren(string[] _uris);
    event MintChild(uint256 _childTokenId, uint256 _amount, address _beneficiary);
    event BatchMintChildren(uint256[] _childTokenIds,
                                uint256[] _amounts,
                                address _beneficiary);

    /**
     * @dev Constructor of DigitalaxIndex contract
     * @param _accessControls AccessControls
     * @param _childContract _childContract
     */
    function initialize(DigitalaxAccessControls _accessControls, IChild _childContract) public {
        require(!initialised);
        require(address(_accessControls) != address(0), "DigitalaxVerifiedMint: Invalid Access Controls");
        require(address(_childContract) != address(0), "DigitalaxVerifiedMint: Invalid Child contract");
        accessControls = _accessControls;
        childContract = _childContract;
        initialised = true;
    }

    /**
     * @dev Function to update access controls
     * @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxVerifiedMint.updateAccessControls: Sender must be admin");
        require(address(_accessControls) != address(0), "DigitalaxVerifiedMint.updateAccessControls: Zero Address");
        accessControls = _accessControls;
    }

    /**
     * @dev Function to update access controls
     * @param _childContract Address of the new _childContract (cannot be zero)
     */
    function updateChildContract(IChild _childContract) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxVerifiedMint.updateChild: Sender must be admin");
        require(address(_childContract) != address(0), "DigitalaxVerifiedMint.updateChild: Zero Address");
        childContract = _childContract;
    }

    function createChild(string calldata _uri) external returns (uint256){
        require(
            accessControls.hasVerifiedMinterRole(_msgSender()),
            "DigitalaxVerifiedMint.createChild: Sender must be verified minter role"
        );
        emit CreateChild(_uri);
        return childContract.createChild(_uri);
    }

    function batchCreateChildren(string[] calldata _uris) external returns (uint256[] memory tokenIds) {
        require(
            accessControls.hasVerifiedMinterRole(_msgSender()),
            "DigitalaxVerifiedMint.batchCreateChildren: Sender must be verified minter role"
        );
        emit BatchCreateChildren(_uris);
        return childContract.batchCreateChildren(_uris);
    }

    function mintChild(uint256 _childTokenId, uint256 _amount, address _beneficiary, bytes calldata _data) external {
        require(
            accessControls.hasVerifiedMinterRole(_msgSender()),
            "DigitalaxVerifiedMint.mintChild: Sender must be verified minter role"
        );

        emit MintChild(_childTokenId, _amount, _beneficiary);
        return childContract.mintChild(_childTokenId, _amount, _beneficiary, _data);
    }

    function batchMintChildren(uint256[] calldata _childTokenIds,
                                uint256[] calldata _amounts,
                                address _beneficiary,
                                bytes calldata _data) external {
        require(
            accessControls.hasVerifiedMinterRole(_msgSender()),
            "DigitalaxVerifiedMint.batchMintChildren: Sender must be verified minter role"
        );
        emit BatchMintChildren(_childTokenIds, _amounts, _beneficiary);
        return childContract.batchMintChildren(_childTokenIds, _amounts, _beneficiary, _data);
    }
}
