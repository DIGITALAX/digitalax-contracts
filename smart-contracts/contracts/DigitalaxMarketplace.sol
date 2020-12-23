// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DigitalaxAccessControls.sol";
import "./garment/IDigitalaxGarmentNFT.sol";
import "./garment/DigitalaxGarmentCollection.sol";
import "./Oracle/UniswapPairOracle_MONA_WETH.sol";
//console
import "@nomiclabs/buidler/console.sol";
/**
 * @notice Marketplace contract for Digitalax NFTs
 */
contract DigitalaxMarketplace is Context, ReentrancyGuard {
    using SafeMath for uint256;
    using Address for address payable;
    /// @notice Event emitted only on construction. To be used by indexers
    event DigitalaxMarketplaceContractDeployed();
    event PauseToggled(
        bool isPaused
    );
    event OfferCreated(
        uint256 indexed garmentTokenId
    );
    event UpdateAccessControls(
        address indexed accessControls
    );
    event UpdateMarketplacePlatformFee(
        uint256 platformFee
    );
    event UpdateMarketplaceDiscountToPayInErc20(
        uint256 discount
    );
    event UpdateOfferPrimarySalePrice(
        uint256 indexed garmentTokenId,
        uint256 primarySalePrice
    );
    event UpdatePlatformFeeRecipient(
        address payable platformFeeRecipient
    );
    event OfferPurchased(
        uint256 indexed garmentTokenId,
        address indexed buyer,
        uint256 primarySalePrice,
        bool paidInErc20
    );
    event OfferCancelled(
        uint256 indexed garmentTokenId
    );
    /// @notice Parameters of a marketplace offer
    struct Offer {
        uint256 primarySalePrice;
        uint256 startTime;
        uint256 availableIndex;
        bool canceled;
    }
    /// @notice Garment ERC721 Token ID -> Offer Parameters
    mapping(uint256 => Offer) public offers;
    /// @notice KYC Garment Designers -> Number of times they have sold in this marketplace (To set fee accordingly)
    mapping(address => uint256) public numberOfTimesSold;
    /// @notice Garment ERC721 NFT - the only NFT that can be offered in this contract
    IDigitalaxGarmentNFT public garmentNft;
    /// @notice Garment NFT Collection
    DigitalaxGarmentCollection public garmentCollection;
    /// @notice responsible for enforcing admin access
    DigitalaxAccessControls public accessControls;
    /// @notice Mona to Ether Oracle
    UniswapPairOracle_MONA_WETH public oracle;
    /// @notice initial platform fee for first time sellers, assumed to always be to 1 decimal place i.e. 120 = 12.0%
    uint256 public platformFee = 120;
    /// @notice discount to pay fully in erc20 token (Mona), assumed to always be to 1 decimal place i.e. 20 = 2.0%
    uint256 public discountToPayERC20 = 20;
    /// @notice where to send platform fee funds to
    address payable public platformFeeRecipient;
    /// @notice the erc20 token
    address public monaErc20Token;
    /// @notice the WETH
    address public weth;
    /// @notice for switching off marketplace functionalities
    bool public isPaused;
    modifier whenNotPaused() {
        require(!isPaused, "Function is currently paused");
        _;
    }
    receive() external payable {
    }   
    constructor(
        DigitalaxAccessControls _accessControls,
        IDigitalaxGarmentNFT _garmentNft,
        DigitalaxGarmentCollection _garmentCollection,
        UniswapPairOracle_MONA_WETH _oracle,
        address payable _platformFeeRecipient,
        address _monaErc20Token,
        address _weth
    ) public {
        require(address(_accessControls) != address(0), "DigitalaxMarketplace: Invalid Access Controls");
        require(address(_garmentNft) != address(0), "DigitalaxMarketplace: Invalid NFT");
        require(address(_garmentCollection) != address(0), "DigitalaxMarketplace: Invalid Collection");
        require(address(_oracle) != address(0), "DigitalaxMarketplace: Invalid Oracle");
        require(_platformFeeRecipient != address(0), "DigitalaxMarketplace: Invalid Platform Fee Recipient");
        require(_monaErc20Token != address(0), "DigitalaxMarketplace: Invalid ERC20 Token");
        require(_weth != address(0), "DigitalaxMarketplace: Invalid WETH Token");
        accessControls = _accessControls;
        garmentNft = _garmentNft;
        garmentCollection = _garmentCollection;
        oracle = _oracle;
        platformFeeRecipient = _platformFeeRecipient;
        monaErc20Token = _monaErc20Token;
        weth = _weth;
        emit DigitalaxMarketplaceContractDeployed();
    }
    /**
     @notice Creates a new offer for a given garment
     @dev Only the owner of a garment can create an offer and must have ALREADY approved the contract
     @dev In addition to owning the garment, the sender also has to have the MINTER role.
     @dev End time for the offer will be in the future, at a time from now till expiry duration
     @param _garmentCollectionId Collection ID of the garment being offered to marketplace
     @param _primarySalePrice Garment cannot be sold for less than this
     */
    function createOffer(
        uint256 _garmentCollectionId,
        uint256 _primarySalePrice
    ) external whenNotPaused {
        // Ensure caller has privileges
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxAuction.createAuction: Sender must have the minter role"
        );
        // Ensure the collection does exists
        require(garmentCollection.getSupply(_garmentCollectionId) > 0, "DigitalaxMarketplace.createOffer: Collection does not exist");
        // Check owner of the collection is the owner and approved
        require(
            garmentCollection.hasOwnedOf(_garmentCollectionId, _msgSender()) && _isCollectionApproved(_garmentCollectionId, address(this)),
            "DigitalaxMarketplace.createOffer: Not owner and or contract not approved"
        );
        _createOffer(
            _garmentCollectionId,
            _primarySalePrice,
            _getNow()
        );
    }
    /**
     @notice Buys an open offer with eth and/or erc20
     @dev Only callable when the offer is open
     @dev Only callable when the offer is open
     @dev Bids from smart contracts are prohibited
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _payWithMona Whether to pay only in Mona
     */
    function buyOffer(uint256 _garmentCollectionId, bool _payWithMona) external payable nonReentrant whenNotPaused {
        // Check the offers to see if this is a valid
        require(_msgSender().isContract() == false, "DigitalaxMarketplace.buyOffer: No contracts permitted");
        require(_isFinished(_garmentCollectionId) == false, "DigitalaxMarketplace.buyOffer: Sale has been finished");

        Offer storage offer = offers[_garmentCollectionId];
        uint256[] memory garmentTokenIds = garmentCollection.getTokenIds(_garmentCollectionId);
        uint256 garmentTokenId = garmentTokenIds[offer.availableIndex];
        uint256 maxShare = 1000;

        // Ensure this contract is still approved to move the token
        require(garmentNft.isApproved(garmentTokenId, address(this)), "DigitalaxMarketplace.buyOffer: offer not approved");
        require(_getNow() >= offer.startTime, "DigitalaxMarketplace.buyOffer: Purchase outside of the offer window");

        // Work out platform fee on sale amount
        if(_payWithMona) {
            oracle.update();
            uint256 amountOfMonaToTransfer = _estimateMonaAmount(_garmentCollectionId, msg.value);
            uint256 feeInETH = msg.value.mul(platformFee).div(maxShare);
            uint256 feeInMona = amountOfMonaToTransfer.mul(platformFee).div(maxShare);
            
            // Check that there is enough ERC20 to cover the rest of the value (minus the discount already taken)
            require(IERC20(monaErc20Token).allowance(msg.sender, address(this)) >= amountOfMonaToTransfer, "DigitalaxMarketplace.buyOffer: Failed to supply ERC20 Allowance");
            // Transfer ERC20 token from user to contract(this) escrow
            IERC20(monaErc20Token).transferFrom(msg.sender, garmentNft.garmentDesigners(garmentTokenId), amountOfMonaToTransfer.sub(feeInMona));
            IERC20(monaErc20Token).transferFrom(msg.sender, platformFeeRecipient, feeInMona);
            
            // Transfer ETH to the desired addresses.
            (bool platformTransferSuccess,) = platformFeeRecipient.call{value : feeInETH}("");
            require(platformTransferSuccess, "DigitalaxMarketplace.buyOffer: Failed to send platform fee");
            (bool designerTransferSuccess,) = garmentNft.garmentDesigners(garmentTokenId).call{value : msg.value.sub(feeInETH)}("");
            require(designerTransferSuccess, "DigitalaxMarketplace.buyOffer: Failed to send the designer their royalties");
        } else {
            require(msg.value >= offer.primarySalePrice, "DigitalaxMarketplace.buyOffer: Failed to supply funds");
            uint256 feeInETH = offer.primarySalePrice.mul(platformFee).div(maxShare);

            // Send platform fee in ETH to the platform fee recipient, there is a discount that is subtracted from this
            (bool platformTransferSuccess,) = platformFeeRecipient.call{value : feeInETH}("");
            require(platformTransferSuccess, "DigitalaxMarketplace.buyOffer: Failed to send platform fee");
            // Send remaining to designer in ETH, the discount does not effect this
            (bool designerTransferSuccess,) = garmentNft.garmentDesigners(garmentTokenId).call{value : offer.primarySalePrice.sub(feeInETH)}("");
            require(designerTransferSuccess, "DigitalaxMarketplace.buyOffer: Failed to send the designer their royalties");
        }

        offer.availableIndex = offer.availableIndex.add(1);
        // Record the primary sale price for the garment
        garmentNft.setPrimarySalePrice(garmentTokenId, offer.primarySalePrice);
        // Transfer the token to the purchaser
        garmentNft.safeTransferFrom(garmentNft.ownerOf(garmentTokenId), msg.sender, garmentTokenId);
        emit OfferPurchased(garmentTokenId, _msgSender(), offer.primarySalePrice, _payWithMona);
    }
    /**
     @notice Cancels and inflight and un-resulted offer
     @dev Only admin
     @param _garmentCollectionId Token ID of the garment being offered
     */
    function cancelOffer(uint256 _garmentCollectionId) external nonReentrant {
        // Admin only resulting function
        require(
            accessControls.hasAdminRole(_msgSender()) || accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxMarketplace.cancelOffer: Sender must be admin or smart contract"
        );
        // Check valid and not resulted
        Offer storage offer = offers[_garmentCollectionId];
        require(offer.primarySalePrice != 0, "DigitalaxMarketplace.cancelOffer: Offer does not exist");
        // Remove offer
        delete offers[_garmentCollectionId];
        emit OfferCancelled(_garmentCollectionId);
    }

    /**
     @notice Toggling the pause flag
     @dev Only admin
     */
    function toggleIsPaused() external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.toggleIsPaused: Sender must be admin");
        isPaused = !isPaused;
        emit PauseToggled(isPaused);
    }

    /**
     @notice Update the marketplace discount
     @dev Only admin
     @param _marketplaceDiscount New marketplace discount
     */
    function updateMarketplaceDiscountToPayInErc20(uint256 _marketplaceDiscount) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.updateMarketplaceDiscountToPayInErc20: Sender must be admin");
        require(_marketplaceDiscount < platformFee, "DigitalaxMarketplace.updateMarketplaceDiscountToPayInErc20: Discount cannot be greater then fee");
        discountToPayERC20 = _marketplaceDiscount;
        emit UpdateMarketplaceDiscountToPayInErc20(_marketplaceDiscount);
    }

    /**
     @notice Update the marketplace fee
     @dev Only admin
     @param _platformFee New marketplace fee
     */
    function updateMarketplacePlatformFee(uint256 _platformFee) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.updateMarketplacePlatformFee: Sender must be admin");
        require(_platformFee > discountToPayERC20, "DigitalaxMarketplace.updateMarketplacePlatformFee: Discount cannot be greater then fee");
        platformFee = _platformFee;
        emit UpdateMarketplacePlatformFee(_platformFee);
    }

    /**
     @notice Update the offer primary sale price
     @dev Only admin
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _primarySalePrice New price
     */
    function updateOfferPrimarySalePrice(uint256 _garmentCollectionId, uint256 _primarySalePrice) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.updateOfferPrimarySalePrice: Sender must be admin");
        
        offers[_garmentCollectionId].primarySalePrice = _primarySalePrice;
        emit UpdateOfferPrimarySalePrice(_garmentCollectionId, _primarySalePrice);
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMarketplace.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "DigitalaxMarketplace.updateAccessControls: Zero Address");
        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }

    /**
     @notice Method for updating platform fee address
     @dev Only admin
     @param _platformFeeRecipient payable address the address to sends the funds to
     */
    function updatePlatformFeeRecipient(address payable _platformFeeRecipient) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMarketplace.updatePlatformFeeRecipient: Sender must be admin"
        );
        require(_platformFeeRecipient != address(0), "DigitalaxMarketplace.updatePlatformFeeRecipient: Zero address");
        platformFeeRecipient = _platformFeeRecipient;
        emit UpdatePlatformFeeRecipient(_platformFeeRecipient);
    }

    ///////////////
    // Accessors //
    ///////////////
    /**
     @notice Method for getting all info about the offer
     @param _garmentCollectionId Token ID of the garment being offered
     */
    function getOffer(uint256 _garmentCollectionId)
    external
    view
    returns (uint256 _primarySalePrice, uint256 _startTime, uint256 _availableAmount, bool _canceled) {
        Offer storage offer = offers[_garmentCollectionId];
        uint256 availableAmount = garmentCollection.getSupply(_garmentCollectionId).sub(offer.availableIndex);
        return (
            offer.primarySalePrice,
            offer.startTime,
            availableAmount,
            offer.canceled
        );
    }

    /**
     @notice Method for getting estimation of Mona amount
     */
    function estimateMonaAmount(uint256 _garmentCollectionId, uint256 _amountInETH) external view returns (uint256) {
        return _estimateMonaAmount(_garmentCollectionId, _amountInETH);
    }

    /////////////////////////
    // Internal and Private /
    /////////////////////////
    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    function _isCollectionApproved(uint256 _collectionId, address _address) internal virtual returns (bool) {
        uint256[] memory tokenIds = garmentCollection.getTokenIds(_collectionId);
        for (uint i = 0; i < tokenIds.length; i ++) {
            if (!garmentNft.isApproved(tokenIds[i], _address)) {
                return false;
            }
        }
        return true;
    }

    /**
     @notice Private method to check if the sale is finished
     @param _garmentCollectionId Id of the collection.
     */
    function _isFinished(uint256 _garmentCollectionId) internal virtual view returns (bool) {
        Offer storage offer = offers[_garmentCollectionId];
        uint256 availableAmount = garmentCollection.getSupply(_garmentCollectionId).sub(offer.availableIndex);
        return availableAmount <= 0;
    }

    /**
     @notice Private method to estimate MONA for paying
     @param _garmentCollectionId Id of the collection
     @param _amountInETH ETH amount in wei
     */
    function _estimateMonaAmount(uint256 _garmentCollectionId, uint256 _amountInETH) internal virtual view returns (uint256) {
        Offer storage offer = offers[_garmentCollectionId];
        uint256 priceInMona = offer.primarySalePrice.sub(_amountInETH).mul(discountToPayERC20).div(1000);
        uint256 amountOfMonaToTransfer = oracle.consult(address(weth), priceInMona);

        return amountOfMonaToTransfer;
    }

    /**
     @notice Private method doing the heavy lifting of creating an offer
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _primarySalePrice Garment cannot be sold for less than this
     @param _startTimestamp Unix epoch in seconds for the offer start time
     */
    function _createOffer(
        uint256 _garmentCollectionId,
        uint256 _primarySalePrice,
        uint256 _startTimestamp
    ) private {
        // Ensure a token cannot be re-listed if previously successfully sold
        require(offers[_garmentCollectionId].startTime == 0, "DigitalaxMarketplace.createOffer: Cannot duplicate current offer");
        // Setup the new offer
        offers[_garmentCollectionId] = Offer({
            primarySalePrice : _primarySalePrice,
            startTime : _startTimestamp,
            availableIndex : 0,
            canceled: false
        });
        emit OfferCreated(_garmentCollectionId);
    }
}
