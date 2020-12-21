// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./ERC721/ERC721WithSameTokenURIForAllTokens.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

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

    // @notice event emitted when a contributors amount is increased
    event ContributionIncreased(
        address indexed buyer,
        uint256 contribution
    );

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

    constructor(
        address payable _fundsMultisig,
        uint256 _podeStartTimestamp,
        uint256 _podeEndTimestamp,
        uint256 _podeLockTimestamp,
        string memory _tokenURI
    ) public {
        fundsMultisig = _fundsMultisig;
        podeStartTimestamp = _podeStartTimestamp;
        podeEndTimestamp = _podeEndTimestamp;
        podeLockTimestamp = _podeLockTimestamp;
        tokenURI_ = _tokenURI;
        emit DigitalaxPodeNFTContractDeployed();
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
    * @dev Returns total remaining number of tokens available in the Pode sale
    */
    function remainingPodeTokens() public view returns (uint256) {
        return _getMaxPodeContributionTokens() - totalSupply();
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
