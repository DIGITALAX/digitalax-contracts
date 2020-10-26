// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./ERC721/ERC721WithSameTokenURIForAllTokens.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./DigitalaxAccessControls.sol";

contract DigitalaxGenesisNFT is ERC721WithSameTokenURIForAllTokens("DigitalaxGenesis", "DXG") {
    using SafeMath for uint256;

    event DigitalaxGenesisNFTContractDeployed();

    event GenesisPurchased(
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 contribution
    );

    event AdminGenesisMinted(
        address indexed beneficiary,
        address indexed admin,
        uint256 indexed tokenId
    );

    event ContributionIncreased(
        address indexed buyer,
        uint256 contribution
    );

    event GenesisEndUpdated(
        uint256 genesisEnd,
        address indexed admin
    );

    event AccessControlsUpdated(
        address indexed newAdress
    );

    DigitalaxAccessControls public accessControls;

    address payable public fundsMultisig;

    uint256 public genesisStart;
    uint256 public genesisEnd;

    uint256 public minimumContributionAmount = 0.01 ether;
    uint256 public maximumContributionAmount = 2 ether;

    mapping(address => uint256) public contribution;
    uint256 public totalContributions;

    constructor(
        DigitalaxAccessControls _accessControls,
        address payable _fundsMultisig,
        uint256 _genesisStart,
        uint256 _genesisEnd,
        string memory _tokenURI
    ) public {
        accessControls = _accessControls;
        fundsMultisig = _fundsMultisig;
        genesisStart = _genesisStart;
        genesisEnd = _genesisEnd;
        tokenURI_ = _tokenURI;
        emit DigitalaxGenesisNFTContractDeployed();
    }

    function buyOrIncreaseContribution() external payable {
        if (contribution[_msgSender()] == 0) {
             buy();
        } else {
            increaseContribution();
        }
    }

    function buy() public payable {
        require(contribution[_msgSender()] == 0, "DigitalaxGenesisNFT.buy: You already own a genesis NFT");
        require(
            _getNow() >= genesisStart && _getNow() <= genesisEnd,
            "DigitalaxGenesisNFT.buy: No genesis are available outside of the genesis window"
        );

        uint256 _contributionAmount = msg.value;
        require(
            _contributionAmount >= minimumContributionAmount,
            "DigitalaxGenesisNFT.buy: Contribution does not meet minimum requirement"
        );

        require(
            _contributionAmount <= maximumContributionAmount,
            "DigitalaxGenesisNFT.buy: You cannot exceed the maximum contribution amount"
        );

        contribution[_msgSender()] = _contributionAmount;
        totalContributions = totalContributions.add(_contributionAmount);

        (bool fundsTransferSuccess,) = fundsMultisig.call{value: _contributionAmount}("");
        require(fundsTransferSuccess, "DigitalaxGenesisNFT.buy: Unable to send contribution to funds multisig");

        uint256 tokenId = totalSupply().add(1);
        _safeMint(_msgSender(), tokenId);

        emit GenesisPurchased(_msgSender(), tokenId, _contributionAmount);
    }

    function increaseContribution() public payable {
        require(
            _getNow() >= genesisStart && _getNow() <= genesisEnd,
            "DigitalaxGenesisNFT.increaseContribution: No increases are possible outside of the genesis window"
        );

        require(
            contribution[_msgSender()] > 0,
            "DigitalaxGenesisNFT.increaseContribution: You do not own a genesis NFT"
        );

        uint256 _amountToIncrease = msg.value;
        contribution[_msgSender()] = contribution[_msgSender()].add(_amountToIncrease);

        require(
            contribution[_msgSender()] <= maximumContributionAmount,
            "DigitalaxGenesisNFT.increaseContribution: You cannot exceed the maximum contribution amount"
        );

        totalContributions = totalContributions.add(_amountToIncrease);

        (bool fundsTransferSuccess,) = fundsMultisig.call{value: _amountToIncrease}("");
        require(
            fundsTransferSuccess,
            "DigitalaxGenesisNFT.increaseContribution: Unable to send contribution to funds multisig"
        );

        emit ContributionIncreased(_msgSender(), _amountToIncrease);
    }

    // Admin

    function adminBuy(address _beneficiary) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxGenesisNFT.adminBuy: Sender must be admin"
        );
        require(_beneficiary != address(0), "DigitalaxGenesisNFT.adminBuy: Beneficiary cannot be ZERO");
        require(balanceOf(_beneficiary) == 0, "DigitalaxGenesisNFT.adminBuy: Beneficiary already owns a genesis NFT");

        uint256 tokenId = totalSupply().add(1);
        _safeMint(_beneficiary, tokenId);

        emit AdminGenesisMinted(_beneficiary, _msgSender(), tokenId);
    }

    function updateGenesisEnd(uint256 _end) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxGenesisNFT.updateGenesisEnd: Sender must be admin"
        );

        genesisEnd = _end;

        emit GenesisEndUpdated(genesisEnd, _msgSender());
    }

    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxGenesisNFT.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "DigitalaxGenesisNFT.updateAccessControls: Zero Address");
        accessControls = _accessControls;

        emit AccessControlsUpdated(address(_accessControls));
    }

    // Internal

    function _getNow() internal virtual view returns (uint256) {
        return now;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override {
        if (from != address(0) && _getNow() <= genesisEnd) {
            revert("DigitalaxGenesisNFT._beforeTokenTransfer: Transfers are currently locked at this time");
        }
    }
}
