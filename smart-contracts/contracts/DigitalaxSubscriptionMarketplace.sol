// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DigitalaxAccessControls.sol";
import "./garment/IDigitalaxGarmentNFT.sol";
import "./garment/DigitalaxSubscriptionCollection.sol";
import "./EIP2771/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";

/**
 * @notice Marketplace contract for Digitalax NFTs
 */
contract DigitalaxSubscriptionMarketplace is ReentrancyGuard, BaseRelayRecipient, Initializable {
    using SafeMath for uint256;
    using Address for address payable;
    /// @notice Event emitted only on construction. To be used by indexers
    event DigitalaxSubscriptionMarketplaceContractDeployed();
    event CollectionPauseToggled(
        uint256 indexed subscriptionCollectionId,
        bool isPaused
    );
    event PauseToggled(
        bool isPaused
    );
    event FreezeMonaERC20PaymentToggled(
        bool freezeMonaERC20Payment
    );
    event FreezeETHPaymentToggled(
        bool freezeETHPayment
    );
    event OfferCreated(
        uint256 indexed subscriptionCollectionId,
        uint256 primarySalePrice,
        uint256 startTime,
        uint256 endTime,
        uint256 platformFee,
        uint256 discountToPayERC20,
        uint256 maxAmount
    );
    event UpdateAccessControls(
        address indexed accessControls
    );
    event UpdateMarketplacePlatformFee(
        uint256 indexed subscriptionCollectionId,
        uint256 platformFee
    );
    event UpdateMarketplaceDiscountToPayInErc20(
        uint256 indexed subscriptionCollectionId,
        uint256 discount
    );
    event UpdateOfferPrimarySalePrice(
        uint256 indexed subscriptionCollectionId,
        uint256 primarySalePrice
    );
    event UpdateOfferStartEnd(
        uint256 indexed subscriptionCollectionId,
        uint256 startTime,
        uint256 endTime
    );
    event UpdatePlatformFeeRecipient(
        address payable platformFeeRecipient
    );
    event UpdateCoolDownDuration(
        uint256 cooldown
    );
    event OfferPurchased(
        uint256 indexed bundleTokenId,
        uint256 indexed subscriptionCollectionId,
        address indexed buyer,
        uint256 primarySalePrice,
        bool paidInErc20,
        uint256 monaTransferredAmount,
        uint256 platformFee,
        uint256 discountToPayInERC20
    );
    event OfferCancelled(
        uint256 indexed bundleTokenId
    );
    /// @notice Parameters of a marketplace offer
    struct Offer {
        uint256 primarySalePrice;
        uint256 startTime;
        uint256 endTime;
        uint256 availableIndex;
        uint256 platformFee;
        uint256 discountToPayERC20;
        uint256 maxAmount;
        bool paused;
    }

    /// @notice Garment ERC721 Collection ID -> Offer Parameters
    mapping(uint256 => Offer) public offers;
    /// @notice KYC Garment Designers -> Number of times they have sold in this marketplace (To set fee accordingly)
    mapping(address => uint256) public numberOfTimesSold;
    /// @notice Garment Collection ID -> Buyer -> Last purhcased time
    mapping(uint256 => mapping(address => uint256)) public lastPurchasedTime;
    /// @notice Garment ERC721 NFT - the only NFT that can be offered in this contract
    IDigitalaxGarmentNFT public garmentNft;
    /// @notice Garment NFT Collection
    DigitalaxSubscriptionCollection public garmentCollection;
    /// @notice responsible for enforcing admin access
    DigitalaxAccessControls public accessControls;
    /// @notice where to send platform fee funds to
    address payable public platformFeeRecipient;
    /// @notice for pausing marketplace functionalities
    bool public isPaused;
    /// @notice the erc20 token
    address public monaErc20Token;
    /// @notice for freezing mona payment option
    bool public freezeMonaERC20Payment;
    /// @notice Cool down period
    uint256 public cooldown = 60;

    modifier whenNotPaused() {
        require(!isPaused, "Function is currently paused");
        _;
    }
    receive() external payable {
    }
    function initialize(
        DigitalaxAccessControls _accessControls,
        IDigitalaxGarmentNFT _garmentNft,
        DigitalaxSubscriptionCollection _garmentCollection,
        address payable _platformFeeRecipient,
        address _monaErc20Token,
        address _trustedForwarder
    ) public initializer {
        require(address(_accessControls) != address(0), "DigitalaxSubscriptionMarketplace: Invalid Access Controls");
        require(address(_garmentNft) != address(0), "DigitalaxSubscriptionMarketplace: Invalid NFT");
        require(address(_garmentCollection) != address(0), "DigitalaxSubscriptionMarketplace: Invalid Collection");
        require(_platformFeeRecipient != address(0), "DigitalaxSubscriptionMarketplace: Invalid Platform Fee Recipient");
        require(_monaErc20Token != address(0), "DigitalaxSubscriptionMarketplace: Invalid ERC20 Token");
        accessControls = _accessControls;
        garmentNft = _garmentNft;
        garmentCollection = _garmentCollection;
        monaErc20Token = _monaErc20Token;
        platformFeeRecipient = _platformFeeRecipient;
        trustedForwarder = _trustedForwarder;

        emit DigitalaxSubscriptionMarketplaceContractDeployed();
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
    view
    returns (address payable sender)
    {
        return BaseRelayRecipient.msgSender();
    }

    /**
     @notice Creates a new offer for a given garment
     @dev Only the owner of a garment can create an offer and must have ALREADY approved the contract
     @dev In addition to owning the garment, the sender also has to have the MINTER or ADMIN role.
     @dev End time for the offer will be in the future, at a time from now till expiry duration
     @dev There cannot be a duplicate offer created
     @param _subscriptionCollectionId Collection ID of the garment being offered to marketplace
     @param _primarySalePrice Garment cannot be sold for less than this
     @param _startTimestamp when the sale starts
     @param _endTimestamp when the sale ends
     @param _platformFee Percentage to pay out to the platformFeeRecipient, 1 decimal place (i.e. 40% is 400)
     @param _discountToPayERC20 Percentage to discount from overall purchase price if Mona (ERC20) used, 1 decimal place (i.e. 5% is 50)
     @param _maxAmount Max number of products from this collection that someone can buy
     */
    function createOffer(
        uint256 _subscriptionCollectionId,
        uint256 _primarySalePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        uint256 _platformFee,
        uint256 _discountToPayERC20,
        uint256 _maxAmount
    ) external {
        // Ensure caller has privileges
        require(
            accessControls.hasMinterRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "DigitalaxSubscriptionMarketplace.createOffer: Sender must have the minter or admin role"
        );
        // Ensure the collection does exists
        require(garmentCollection.getSupply(_subscriptionCollectionId) > 0, "DigitalaxSubscriptionMarketplace.createOffer: Collection does not exist");
        // Check owner of the collection is the owner and approved
        require(
            garmentCollection.hasOwnedOf(_subscriptionCollectionId, _msgSender()) && _isCollectionApproved(_subscriptionCollectionId, address(this)),
            "DigitalaxSubscriptionMarketplace.createOffer: Not owner and or contract not approved"
        );
        // Ensure the maximum purchaseable amount is less than collection supply
        require(_maxAmount <= garmentCollection.getSupply(_subscriptionCollectionId), "DigitalaxSubscriptionMarketplace.createOffer: Invalid Maximum amount");
        // Ensure the end time stamp is valid
        require(_endTimestamp > _startTimestamp, "DigitalaxSubscriptionMarketplace.createOffer: Invalid end time");

        _createOffer(
            _subscriptionCollectionId,
            _primarySalePrice,
            _startTimestamp,
            _endTimestamp,
            _platformFee,
            _discountToPayERC20,
            _maxAmount,
            false
        );
    }

    /**
     @notice Buys an open offer with eth or erc20
     @dev Only callable when the offer is open
     @dev Bids from smart contracts are prohibited - a user must buy directly from their address
     @dev Contract must have been approved on the buy offer previously
     @dev The sale must have started (start time) to make a successful buy
     @param _subscriptionCollectionId Collection ID of the garment being offered
     */
    function buyOffer(uint256 _subscriptionCollectionId) external payable whenNotPaused nonReentrant {
        // Check the offers to see if this is a valid
        require(_msgSender().isContract() == false, "DigitalaxSubscriptionMarketplace.buyOffer: No contracts permitted");
        require(_isFinished(_subscriptionCollectionId) == false, "DigitalaxSubscriptionMarketplace.buyOffer: Sale has been finished");
        require(lastPurchasedTime[_subscriptionCollectionId][_msgSender()] <= _getNow().sub(cooldown), "DigitalaxSubscriptionMarketplace.buyOffer: Cooldown not reached");

        Offer storage offer = offers[_subscriptionCollectionId];
        require(
            garmentCollection.balanceOfAddress(_subscriptionCollectionId, _msgSender()) < offer.maxAmount,
            "DigitalaxSubscriptionMarketplace.buyOffer: Can't purchase over maximum amount"
        );
        require(!offer.paused, "DigitalaxSubscriptionMarketplace.buyOffer: Can't purchase when paused");

        uint256[] memory bundleTokenIds = garmentCollection.getTokenIds(_subscriptionCollectionId);
        uint256 bundleTokenId = bundleTokenIds[offer.availableIndex];
        uint256 maxShare = 1000;

        // Ensure this contract is still approved to move the token
        require(garmentNft.isApproved(bundleTokenId, address(this)), "DigitalaxSubscriptionMarketplace.buyOffer: offer not approved");
        require(_getNow() >= offer.startTime, "DigitalaxSubscriptionMarketplace.buyOffer: Purchase outside of the offer window");

        uint256 feeInMona = offer.primarySalePrice.mul(offer.platformFee).div(maxShare);

        require(!freezeMonaERC20Payment, "DigitalaxSubscriptionMarketplace.buyOffer: mona erc20 payments currently frozen");

        // Designer receives (Primary Sale Price minus Protocol Fee)
        uint256 amountOfMonaToTransferToDesigner = offer.primarySalePrice.sub(feeInMona);

        // There is a discount on Fees paying in Mona
        uint256 amountOfDiscountOnMonaPrice = offer.primarySalePrice.mul(offer.discountToPayERC20).div(maxShare);
        uint256 amountOfMonaToTransferAsFees = feeInMona.sub(amountOfDiscountOnMonaPrice);


        // Check that there is enough ERC20 to cover the rest of the value (minus the discount already taken)
        require(IERC20(monaErc20Token).allowance(_msgSender(), address(this)) >= offer.primarySalePrice, "DigitalaxSubscriptionMarketplace.buyOffer: Failed to supply ERC20 Allowance");
        // Transfer ERC20 token from user to contract(this) escrow
        IERC20(monaErc20Token).transferFrom(_msgSender(), garmentNft.garmentDesigners(bundleTokenId), amountOfMonaToTransferToDesigner);
        IERC20(monaErc20Token).transferFrom(_msgSender(), platformFeeRecipient, amountOfMonaToTransferAsFees);

        offer.availableIndex = offer.availableIndex.add(1);
        // Record the primary sale price for the garment
        garmentNft.setPrimarySalePrice(bundleTokenId, offer.primarySalePrice);
        // Transfer the token to the purchaser
        garmentNft.safeTransferFrom(garmentNft.ownerOf(bundleTokenId), _msgSender(), bundleTokenId);
        lastPurchasedTime[_subscriptionCollectionId][_msgSender()] = _getNow();

        emit OfferPurchased(bundleTokenId, _subscriptionCollectionId, _msgSender(), offer.primarySalePrice, true, offer.primarySalePrice, offer.platformFee, offer.discountToPayERC20);
    }
    /**
     @notice Cancels an inflight and un-resulted offer
     @dev Only admin
     @param _subscriptionCollectionId Token ID of the garment being offered
     */
    function cancelOffer(uint256 _subscriptionCollectionId) external nonReentrant {
        // Admin only resulting function
        require(
            accessControls.hasAdminRole(_msgSender()) || accessControls.hasMinterRole(_msgSender()),
            "DigitalaxSubscriptionMarketplace.cancelOffer: Sender must be admin or minter contract"
        );
        // Check valid and not resulted
        Offer storage offer = offers[_subscriptionCollectionId];
        require(offer.primarySalePrice != 0, "DigitalaxSubscriptionMarketplace.cancelOffer: Offer does not exist");
        // Remove offer
        delete offers[_subscriptionCollectionId];
        emit OfferCancelled(_subscriptionCollectionId);
    }

    /**
     @notice Toggling the pause flag
     @dev Only admin
     */
    function togglePaused(uint256 _subscriptionCollectionId) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxSubscriptionMarketplace.togglePaused: Sender must be admin");
        Offer storage offer = offers[_subscriptionCollectionId];
        offer.paused = !offer.paused;
        emit CollectionPauseToggled(_subscriptionCollectionId, offer.paused);
    }

    /**
     @notice Toggling the pause flag
     @dev Only admin
     */
    function toggleIsPaused() external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxSubscriptionMarketplace.toggleIsPaused: Sender must be admin");
        isPaused = !isPaused;
        emit PauseToggled(isPaused);
    }

    /**
     @notice Toggle freeze Mona ERC20
     @dev Only admin
     */
    function toggleFreezeMonaERC20Payment() external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxSubscriptionMarketplace.toggleFreezeMonaERC20Payment: Sender must be admin");
        freezeMonaERC20Payment = !freezeMonaERC20Payment;
        emit FreezeMonaERC20PaymentToggled(freezeMonaERC20Payment);
    }

    /**
     @notice Update the marketplace discount
     @dev Only admin
     @dev This discount is taken away from the received fees, so the discount cannot exceed the platform fee
     @param _subscriptionCollectionId Collection ID of the garment being offered
     @param _marketplaceDiscount New marketplace discount
     */
    function updateMarketplaceDiscountToPayInErc20(uint256 _subscriptionCollectionId, uint256 _marketplaceDiscount) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxSubscriptionMarketplace.updateMarketplaceDiscountToPayInErc20: Sender must be admin");
        require(_marketplaceDiscount <= offers[_subscriptionCollectionId].platformFee, "DigitalaxSubscriptionMarketplace.updateMarketplaceDiscountToPayInErc20: Discount cannot be greater then fee");
        offers[_subscriptionCollectionId].discountToPayERC20 = _marketplaceDiscount;
        emit UpdateMarketplaceDiscountToPayInErc20(_subscriptionCollectionId, _marketplaceDiscount);
    }

    /**
     @notice Update the marketplace fee
     @dev Only admin
     @dev There is a discount that can be taken away from received fees, so that discount cannot exceed the platform fee
     @param _subscriptionCollectionId Collection ID of the garment being offered
     @param _platformFee New marketplace fee
     */
    function updateMarketplacePlatformFee(uint256 _subscriptionCollectionId, uint256 _platformFee) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxSubscriptionMarketplace.updateMarketplacePlatformFee: Sender must be admin");
        require(_platformFee >= offers[_subscriptionCollectionId].discountToPayERC20, "DigitalaxSubscriptionMarketplace.updateMarketplacePlatformFee: Discount cannot be greater then fee");
        offers[_subscriptionCollectionId].platformFee = _platformFee;
        emit UpdateMarketplacePlatformFee(_subscriptionCollectionId, _platformFee);
    }

    /**
     @notice Update the offer primary sale price
     @dev Only admin
     @param _subscriptionCollectionId Collection ID of the garment being offered
     @param _primarySalePrice New price
     */
    function updateOfferPrimarySalePrice(uint256 _subscriptionCollectionId, uint256 _primarySalePrice) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxSubscriptionMarketplace.updateOfferPrimarySalePrice: Sender must be admin");

        offers[_subscriptionCollectionId].primarySalePrice = _primarySalePrice;
        emit UpdateOfferPrimarySalePrice(_subscriptionCollectionId, _primarySalePrice);
    }

    /**
     @notice Update the offer start and end time
     @dev Only admin
     @param _subscriptionCollectionId Collection ID of the garment being offered
     @param _startTime start time
     @param _endTime end time
     */
    function updateOfferStartEndTime(uint256 _subscriptionCollectionId, uint256 _startTime, uint256 _endTime) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxSubscriptionMarketplace.updateOfferPrimarySalePrice: Sender must be admin");
        require(_endTime > _startTime, "DigitalaxSubscriptionMarketplace.createOffer: Invalid end time");
        offers[_subscriptionCollectionId].startTime = _startTime;
        offers[_subscriptionCollectionId].endTime = _endTime;
        emit UpdateOfferStartEnd(_subscriptionCollectionId, _startTime, _endTime);
    }

    /**
     @notice Update cool down duration
     @dev Only admin
     @param _cooldown New cool down duration
     */
    function updateCoolDownDuration(uint256 _cooldown) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxSubscriptionMarketplace.updateCoolDownDuration: Sender must be admin");

        cooldown = _cooldown;
        emit UpdateCoolDownDuration(_cooldown);
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxSubscriptionMarketplace.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "DigitalaxSubscriptionMarketplace.updateAccessControls: Zero Address");
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
            "DigitalaxSubscriptionMarketplace.updatePlatformFeeRecipient: Sender must be admin"
        );
        require(_platformFeeRecipient != address(0), "DigitalaxSubscriptionMarketplace.updatePlatformFeeRecipient: Zero address");
        platformFeeRecipient = _platformFeeRecipient;
        emit UpdatePlatformFeeRecipient(_platformFeeRecipient);
    }

    ///////////////
    // Accessors //
    ///////////////
    /**
     @notice Method for getting all info about the offer
     @param _subscriptionCollectionId Token ID of the garment being offered
     */
    function getOffer(uint256 _subscriptionCollectionId)
    external
    view
    returns (uint256 _primarySalePrice, uint256 _startTime, uint256 _endTime, uint256 _availableAmount, uint _platformFee, uint256 _discountToPayERC20) {
        Offer storage offer = offers[_subscriptionCollectionId];
        uint256 availableAmount = garmentCollection.getSupply(_subscriptionCollectionId).sub(offer.availableIndex);
        return (
            offer.primarySalePrice,
            offer.startTime,
            offer.endTime,
            availableAmount,
            offer.platformFee,
            offer.discountToPayERC20
        );
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
     @param _subscriptionCollectionId Id of the collection.
     */
    function _isFinished(uint256 _subscriptionCollectionId) internal virtual view returns (bool) {
        Offer memory offer = offers[_subscriptionCollectionId];

        if (offer.endTime < _getNow()) {
            return true;
        }

        uint256 availableAmount = garmentCollection.getSupply(_subscriptionCollectionId).sub(offer.availableIndex);
        return availableAmount <= 0;
    }

    /**
     @notice Private method doing the heavy lifting of creating an offer
     @param _subscriptionCollectionId Collection ID of the garment being offered
     @param _primarySalePrice Garment cannot be sold for less than this
     @param _startTimestamp Unix epoch in seconds for the offer start time
     @param _platformFee Percentage to pay out to the platformFeeRecipient, 1 decimal place (i.e. 40% is 400)
     @param _discountToPayERC20 Percentage to discount from overall purchase price if Mona (ERC20) used, 1 decimal place (i.e. 5% is 50)
     */
    function _createOffer(
        uint256 _subscriptionCollectionId,
        uint256 _primarySalePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        uint256 _platformFee,
        uint256 _discountToPayERC20,
        uint256 _maxAmount,
        bool _paused
    ) private {
        // The discount cannot be greater than the platform fee
        require(_platformFee >= _discountToPayERC20 , "DigitalaxSubscriptionMarketplace.createOffer: The discount is taken out of platform fee, discount cannot be greater");
        // Ensure a token cannot be re-listed if previously successfully sold
        require(offers[_subscriptionCollectionId].startTime == 0, "DigitalaxSubscriptionMarketplace.createOffer: Cannot duplicate current offer");
        // Setup the new offer
        offers[_subscriptionCollectionId] = Offer({
            primarySalePrice : _primarySalePrice,
            startTime : _startTimestamp,
            endTime: _endTimestamp,
            availableIndex : 0,
            platformFee: _platformFee,
            discountToPayERC20: _discountToPayERC20,
            maxAmount: _maxAmount,
            paused: _paused
        });
        emit OfferCreated(_subscriptionCollectionId, _primarySalePrice, _startTimestamp, _endTimestamp, _platformFee, _discountToPayERC20, _maxAmount);
    }

    /**
    * @notice Reclaims ERC20 Compatible tokens for entire balance
    * @dev Only access controls admin
    * @param _tokenContract The address of the token contract
    */
    function reclaimERC20(address _tokenContract) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxSubscriptionMarketplace.reclaimERC20: Sender must be admin"
        );
        require(_tokenContract != address(0), "Invalid address");
        IERC20 token = IERC20(_tokenContract);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(_msgSender(), balance), "Transfer failed");
    }

    /**
     * @notice Reclaims ETH, drains all ETH sitting on the smart contract
     * @dev The instant buy feature means technically, ETH should never sit on contract.
     * @dev Only access controls admin can access
     */
    function reclaimETH() external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxSubscriptionMarketplace.reclaimETH: Sender must be admin"
        );
        _msgSender().transfer(address(this).balance);
    }
}
