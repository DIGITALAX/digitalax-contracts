// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./ERC721/ERC721WithSameTokenURIForAllTokens.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./DigitalaxAccessControls.sol";

/**
 * @title Digitalax Pode NFT
 * @dev To facilitate the pode sale for the Digitialax platform
 */
contract DigitalaxPodeNFT is ERC721WithSameTokenURIForAllTokens("DigitalaxPode", "PODE") {
    using SafeMath for uint256;

    // @notice event emitted upon construction of this contract, used to bootstrap external indexers
    event DigitalaxPodeNFTContractDeployed();

    // @notice event emitted when a contributor buys a Pode NFT
    event PodePurchased(
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 contribution
    );

    // @notice event emitted when a admin mints a Pode NFT
    event AdminPodeMinted(
        address indexed beneficiary,
        address indexed admin,
        uint256 indexed tokenId
    );

    // @notice event emitted when a contributors amount is increased
    event ContributionIncreased(
        address indexed buyer,
        uint256 contribution
    );

    // @notice event emitted when end date is changed
    event PodeEndUpdated(
        uint256 podeEndTimestamp,
        address indexed admin
    );

    // @notice event emitted when DigitalaxAccessControls is updated
    event AccessControlsUpdated(
        address indexed newAdress
    );

    // @notice responsible for enforcing admin access
    DigitalaxAccessControls public accessControls;

    // @notice all funds will be sent to this address pon purchase of a Pode NFT
    address payable public fundsMultisig;

    // @notice start date for them the Pode sale is open to the public, before this data no purchases can be made
    uint256 public podeStartTimestamp;

    // @notice end date for them the Pode sale is closed, no more purchased can be made after this point
    uint256 public podeEndTimestamp;

    // @notice set after end time has been changed once, prevents further changes to end timestamp
    bool public podeEndTimestampLocked;

    // @notice set the transfer lock time, so no noe can move Pode NFT
    uint256 public podeLockTimestamp;

    // @notice the minimum amount a buyer can contribute in a single go
    uint256 public constant minimumContributionAmount = 1 ether;

    // @notice accumulative => contribution total
    mapping(address => uint256) public contribution;

    // @notice global accumulative contribution amount
    uint256 public totalContributions;

    // @notice max number of paid contributions to the pode sale
    uint256 public constant maxPodeContributionTokens = 500;

    uint256 public totalAdminMints;

    constructor(
        DigitalaxAccessControls _accessControls,
        address payable _fundsMultisig,
        uint256 _podeStartTimestamp,
        uint256 _podeEndTimestamp,
        uint256 _podeLockTimestamp,
        string memory _tokenURI
    ) public {
        accessControls = _accessControls;
        fundsMultisig = _fundsMultisig;
        podeStartTimestamp = _podeStartTimestamp;
        podeEndTimestamp = _podeEndTimestamp;
        podeLockTimestamp = _podeLockTimestamp;
        tokenURI_ = _tokenURI;
        emit DigitalaxPodeNFTContractDeployed();
    }

    /**
     * @dev Proxy method for facilitating a single point of entry to either buy or contribute additional value to the Pode sale
     * @dev Cannot contribute less than minimumContributionAmount
     */
    function buyOrIncreaseContribution() external payable {
        if (contribution[_msgSender()] == 0) {
            buy();
        } else {
            increaseContribution();
        }
    }

    /**
     * @dev Facilitating the initial purchase of a Pode NFT
     * @dev Cannot contribute less than minimumContributionAmount
     * @dev Reverts if already owns an pode token
     * @dev Buyer receives a NFT on success
     * @dev All funds move to fundsMultisig
     */
    function buy() public payable {
        require(contribution[_msgSender()] == 0, "DigitalaxPodeNFT.buy: You already own a pode NFT");
        require(
            _getNow() >= podeStartTimestamp && _getNow() <= podeEndTimestamp,
            "DigitalaxPodeNFT.buy: No pode are available outside of the pode window"
        );

        uint256 _contributionAmount = msg.value;
        require(
            _contributionAmount >= minimumContributionAmount,
            "DigitalaxPodeNFT.buy: Contribution does not meet minimum requirement"
        );

        require(remainingPodeTokens() > 0, "DigitalaxPodeNFT.buy: Total number of pode token holders reached");

        contribution[_msgSender()] = _contributionAmount;
        totalContributions = totalContributions.add(_contributionAmount);

        (bool fundsTransferSuccess,) = fundsMultisig.call{value : _contributionAmount}("");
        require(fundsTransferSuccess, "DigitalaxPodeNFT.buy: Unable to send contribution to funds multisig");

        uint256 tokenId = totalSupply().add(1);
        _safeMint(_msgSender(), tokenId);

        emit PodePurchased(_msgSender(), tokenId, _contributionAmount);
    }

    /**
     * @dev Facilitates an owner to increase there contribution
     * @dev Cannot contribute less than minimumContributionAmount
     * @dev Reverts if caller does not already owns an pode token
     * @dev All funds move to fundsMultisig
     */
    function increaseContribution() public payable {
        require(
            _getNow() >= podeStartTimestamp && _getNow() <= podeEndTimestamp,
            "DigitalaxPodeNFT.increaseContribution: No increases are possible outside of the pode window"
        );

        require(
            contribution[_msgSender()] > 0,
            "DigitalaxPodeNFT.increaseContribution: You do not own a pode NFT"
        );

        uint256 _amountToIncrease = msg.value;
        contribution[_msgSender()] = contribution[_msgSender()].add(_amountToIncrease);

        totalContributions = totalContributions.add(_amountToIncrease);

        (bool fundsTransferSuccess,) = fundsMultisig.call{value : _amountToIncrease}("");
        require(
            fundsTransferSuccess,
            "DigitalaxPodeNFT.increaseContribution: Unable to send contribution to funds multisig"
        );

        emit ContributionIncreased(_msgSender(), _amountToIncrease);
    }

    // Admin

    /**
     * @dev Allows a whitelisted admin to mint a token and issue it to a beneficiary
     * @dev One token per holder
     * @dev All holders contribution as set o zero on creation
     */
    function adminBuy(address _beneficiary) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxPodeNFT.adminBuy: Sender must be admin"
        );
        require(_beneficiary != address(0), "DigitalaxPodeNFT.adminBuy: Beneficiary cannot be ZERO");
        require(balanceOf(_beneficiary) == 0, "DigitalaxPodeNFT.adminBuy: Beneficiary already owns a pode NFT");

        uint256 tokenId = totalSupply().add(1);
        _safeMint(_beneficiary, tokenId);

        // Increase admin mint counts
        totalAdminMints = totalAdminMints.add(1);

        emit AdminPodeMinted(_beneficiary, _msgSender(), tokenId);
    }

    /**
     * @dev Allows a whitelisted admin to update the end date of the pode
     */
    function updatePodeEnd(uint256 _end) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxPodeNFT.updatePodeEnd: Sender must be admin"
        );
        // If already passed, dont allow opening again
        require(podeEndTimestamp > _getNow(), "DigitalaxPodeNFT.updatePodeEnd: End time already passed");

        // Only allow setting this once
        require(!podeEndTimestampLocked, "DigitalaxPodeNFT.updatePodeEnd: End time locked");

        podeEndTimestamp = _end;

        // Lock future end time modifications
        podeEndTimestampLocked = true;

        emit PodeEndUpdated(podeEndTimestamp, _msgSender());
    }

    /**
     * @dev Allows a whitelisted admin to update the start date of the pode
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxPodeNFT.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "DigitalaxPodeNFT.updateAccessControls: Zero Address");
        accessControls = _accessControls;

        emit AccessControlsUpdated(address(_accessControls));
    }

    /**
    * @dev Returns total remaining number of tokens available in the Pode sale
    */
    function remainingPodeTokens() public view returns (uint256) {
        return _getMaxPodeContributionTokens() - (totalSupply() - totalAdminMints);
    }

    // Internal

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    function _getMaxPodeContributionTokens() internal virtual view returns (uint256) {
        return maxPodeContributionTokens;
    }

    /**
     * @dev Before token transfer hook to enforce that no token can be moved to another address until the pode sale has ended
     */
    function _beforeTokenTransfer(address from, address, uint256) internal override {
        if (from != address(0) && _getNow() <= podeLockTimestamp) {
            revert("DigitalaxPodeNFT._beforeTokenTransfer: Transfers are currently locked at this time");
        }
    }
}
