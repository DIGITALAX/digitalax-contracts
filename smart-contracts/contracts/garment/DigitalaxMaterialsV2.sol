// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../ERC1155/ERC1155Burnable.sol";
import "../DigitalaxAccessControls.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

/**
 * @title Digitalax Materials NFT a.k.a. child NFTs
 * @dev Issues ERC-1155 tokens which can be held by the parent ERC-721 contract
 */
contract DigitalaxMaterialsV2 is ERC1155Burnable, BaseRelayRecipient, Initializable {

    // @notice event emitted on contract creation
    event DigitalaxMaterialsDeployed();

    // @notice a single child has been created
    event ChildCreated(
        uint256 indexed childId
    );

    // @notice a batch of children have been created
    event ChildrenCreated(
        uint256[] childIds
    );

    string public name;
    string public symbol;

    // @notice current token ID pointer
    uint256 public tokenIdPointer = 100000;

    // @notice enforcing access controls
    DigitalaxAccessControls public accessControls;

    address public childChain;

    modifier onlyChildChain() {
        require(
            _msgSender() == childChain,
            "Child token: caller is not the child chain contract"
        );
        _;
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        DigitalaxAccessControls _accessControls,
        address _childChain,
        address _trustedForwarder
    ) public initializer {
        name = _name;
        symbol = _symbol;
        accessControls = _accessControls;
        trustedForwarder = _trustedForwarder;
        childChain = _childChain;
        emit DigitalaxMaterialsDeployed();
    }

    /**
     * Override this function.
     * This version is to keep track of BaseRelayRecipient you are using
     * in your contract.
     */
    function versionRecipient() external view override returns (string memory) {
        return "1";
    }

    function setTrustedForwarder(address _trustedForwarder) external  {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMaterials.setTrustedForwarder: Sender must be admin"
        );
        trustedForwarder = _trustedForwarder;
    }

    // This is to support Native meta transactions
    // never use msg.sender directly, use _msgSender() instead
    function _msgSender()
    internal
    override
    view
    returns (address payable sender)
    {
        return BaseRelayRecipient.msgSender();
    }

    ///////////////////////////
    // Creating new children //
    ///////////////////////////

    /**
     @notice Creates a single child ERC1155 token
     @dev Only callable with smart contact role
     @return id the generated child Token ID
     */
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

    /**
     @notice Creates a batch of child ERC1155 tokens
     @dev Only callable with smart contact role
     @return tokenIds the generated child Token IDs
     */
    function batchCreateChildren(string[] calldata _uris) external returns (uint256[] memory tokenIds) {
        require(
            accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxMaterials.batchCreateChildren: Sender must be smart contract"
        );

        require(_uris.length > 0, "DigitalaxMaterials.batchCreateChildren: No data supplied in array");

        uint256 urisLength = _uris.length;
        tokenIds = new uint256[](urisLength);
        for (uint256 i = 0; i < urisLength; i++) {
            string memory uri = _uris[i];
            require(bytes(uri).length > 0, "DigitalaxMaterials.batchCreateChildren: URI is a blank string");
            tokenIdPointer = tokenIdPointer.add(1);

            _setURI(tokenIdPointer, uri);
            tokenIds[i] = tokenIdPointer;
        }

        // Batched event for GAS savings
        emit ChildrenCreated(tokenIds);
    }

    //////////////////////////////////
    // Minting of existing children //
    //////////////////////////////////

    /**
      @notice Mints a single child ERC1155 tokens, increasing its supply by the _amount specified. msg.data along with the
      parent contract as the recipient can be used to map the created children to a given parent token
      @dev Only callable with smart contact role
     */
    function mintChild(uint256 _childTokenId, uint256 _amount, address _beneficiary, bytes calldata _data) external {
        require(
            accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxMaterials.mintChild: Sender must be smart contract"
        );

        require(bytes(tokenUris[_childTokenId]).length > 0, "DigitalaxMaterials.mintChild: Strand does not exist");
        require(_amount > 0, "DigitalaxMaterials.mintChild: No amount specified");

        _mint(_beneficiary, _childTokenId, _amount, _data);
    }

    /**
      @notice Mints a batch of child ERC1155 tokens, increasing its supply by the _amounts specified. msg.data along with the
      parent contract as the recipient can be used to map the created children to a given parent token
      @dev Only callable with smart contact role
     */
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
        for (uint256 i = 0; i < _childTokenIds.length; i++) {
            uint256 strandId = _childTokenIds[i];
            require(bytes(tokenUris[strandId]).length > 0, "DigitalaxMaterials.batchMintChildren: Strand does not exist");

            uint256 amount = _amounts[i];
            require(amount > 0, "DigitalaxMaterials.batchMintChildren: Invalid amount");
        }

        _mintBatch(_beneficiary, _childTokenIds, _amounts, _data);
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

    /**
    * @notice called when tokens are deposited on root chain
    * @dev Should be callable only by ChildChainManager
    * Should handle deposit by minting the required tokens for user
    * Make sure minting is done only by this function
    * @param user user address for whom deposit is being done
    * @param depositData abi encoded ids array and amounts array
    */
    function deposit(address user, bytes calldata depositData)
    external
    onlyChildChain
    {
        (
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
        ) = abi.decode(depositData, (uint256[], uint256[], bytes));
        require(user != address(0x0), "DigitalaxMaterials: INVALID_DEPOSIT_USER");
        _mintBatch(user, ids, amounts, data);
    }

    /**
     * @notice called when user wants to withdraw single token back to root chain
     * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
     * @param id id to withdraw
     * @param amount amount to withdraw
     */
    function withdrawSingle(uint256 id, uint256 amount) external {
        _burn(_msgSender(), id, amount);
    }

    /**
     * @notice called when user wants to batch withdraw tokens back to root chain
     * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
     * @param ids ids to withdraw
     * @param amounts amounts to withdraw
     */
    function withdrawBatch(uint256[] calldata ids, uint256[] calldata amounts)
    external
    {
        _burnBatch(_msgSender(), ids, amounts);
    }
}
