// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ERC1155/ERC1155Burnable.sol";
import "./DigitalaxAccessControls.sol";
import "./DigitalaxPodeNFT.sol";

/**
 * @title Digitalax PODEM NFT 
 */
contract DigitalaxPodeMaterials is ERC1155Burnable {

    // @notice event emitted on contract creation
    event DigitalaxPodeMaterialsDeployed();

    // @notice a single child has been created
    event TokenUriAdded(
        uint256 indexed tokenId
    );

    string public name;
    string public symbol;

    // @notice current token ID pointer
    uint256 public tokenIdPointer;

    /// @dev Limit of tokens per address
    uint256 public maxLimit = 1;

    /// @dev List of metadata
    string[] public metadataList;

    // @notice enforcing access controls
    DigitalaxAccessControls public accessControls;
    DigitalaxPodeNFT public podeNft;

    constructor(
        string memory _name,
        string memory _symbol,
        DigitalaxAccessControls _accessControls,
        DigitalaxPodeNFT _podeNft
    ) public {
        name = _name;
        symbol = _symbol;
        accessControls = _accessControls;
        podeNft = _podeNft;
        emit DigitalaxPodeMaterialsDeployed();
    }

    ///////////////////////////
    // Creating new nft //
    ///////////////////////////

    /**
     @notice Creates a single child ERC1155 token
     @dev Only callable with smart contact role
     @return id the generated child Token ID
     */
    function addTokenUri(string calldata _uri) external returns (uint256 id) {
        require(
            accessControls.hasSmartContractRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "DigitalaxPodeMaterials.createChild: Sender must be smart contract or admin"
        );

        require(bytes(_uri).length > 0, "DigitalaxPodeMaterials.createChild: URI is a blank string");

        id = tokenIdPointer;
        _setURI(id, _uri);
        tokenIdPointer = tokenIdPointer.add(1);

        emit TokenUriAdded(id);
    }


    //////////////////////////////////
    // Minting of existing children //
    //////////////////////////////////

    /**
      @notice Mints a single child ERC1155 tokens, increasing its supply by the _amount specified. msg.data along with the
      parent contract as the recipient can be used to map the created children to a given parent token
      @dev Only callable with smart contact role
     */
    function mint(address _beneficiary) external {
        require(totalBalanceOf(_msgSender()) < maxLimit, "DigitalaxPodeMaterials.mint: Sender already minted");
        require(podeNft.balanceOf(_msgSender()) > 0, "DigitalaxPodeMaterials.mint: Sender must have PODE NFT");

        uint256 _randomIndex = _rand();
        _mint(_beneficiary, _randomIndex, 1, abi.encodePacked(""));
    }

    /**
     @notice Method for setting max limit
     @dev Only admin
     @param _maxLimit New max limit
     */
    function setMaxLimit(uint256 _maxLimit) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxPodeMaterials.addTokenURI: Sender must be an authorised contract or admin"
        );
        maxLimit = _maxLimit;
    }

    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxPodeMaterials.updateAccessControls: Sender must be admin"
        );

        require(
            address(_accessControls) != address(0),
            "DigitalaxPodeMaterials.updateAccessControls: New access controls cannot be ZERO address"
        );

        accessControls = _accessControls;
    }

    /**
     @notice Method for getting balance of account
     @param account Account address
     */
    function totalBalanceOf(address account) public view returns (uint256) {
        require(account != address(0), "DigitalaxPodeMaterials: balance query for the zero address");

        uint256 totalBalance = 0;
        for (uint256 i = 0; i < tokenIdPointer; i ++) {
            totalBalance = totalBalance.add(balanceOf(account, i));
        }

        return totalBalance;
    }

    /**
     @notice Generate unpredictable random number
     */
    function _rand() private view returns (uint256) {
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp + block.difficulty +
            ((uint256(keccak256(abi.encodePacked(block.coinbase)))) / (now)) +
            block.gaslimit + 
            ((uint256(keccak256(abi.encodePacked(msg.sender)))) / (now)) +
            block.number
        )));

        return seed.sub(seed.div(tokenIdPointer).mul(tokenIdPointer));
    }

    /**
    * @notice Reclaims ERC20 Compatible tokens for entire balance
    * @dev Only access controls admin
    * @param _tokenContract The address of the token contract
    */
    function reclaimERC20(address _tokenContract) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMarketplace.reclaimERC20: Sender must be admin"
        );
        require(_tokenContract != address(0), "Invalid address");
        IERC20 token = IERC20(_tokenContract);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(msg.sender, balance), "Transfer failed");
    }

    /**
     * @notice Reclaims ETH, drains all ETH sitting on the smart contract
     * @dev The instant buy feature means technically, ETH should never sit on contract.
     * @dev Only access controls admin can access
     */
    function reclaimETH() external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMarketplace.reclaimETH: Sender must be admin"
        );
        msg.sender.transfer(address(this).balance);
    }
}
