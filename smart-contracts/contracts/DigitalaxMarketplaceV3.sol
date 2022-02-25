pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DigitalaxAccessControls.sol";
import "./garment/IDigitalaxGarmentNFT.sol";
import "./garment/DigitalaxGarmentCollectionV2.sol";
import "./EIP2771/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "./oracle/IDigitalaxMonaOracle.sol";

/**
 * @notice Marketplace contract for Digitalax NFTs
 */
contract DigitalaxMarketplaceV3 is ReentrancyGuard, BaseRelayRecipient, Initializable {
    using SafeMath for uint256;
    using Address for address payable;
    /// @notice Event emitted only on construction. To be used by indexers
    event DigitalaxMarketplaceContractDeployed();
    event CollectionPauseToggled(
        uint256 indexed garmentCollectionId,
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
        uint256 indexed garmentCollectionId,
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
        uint256 indexed garmentCollectionId,
        uint256 platformFee
    );
    event UpdateMarketplaceDiscountToPayInErc20(
        uint256 indexed garmentCollectionId,
        uint256 discount
    );
    event UpdateOfferPrimarySalePrice(
        uint256 indexed garmentCollectionId,
        uint256 primarySalePrice
    );
    event UpdateDesignerOverride(
        uint256 indexed garmentCollectionId,
        address[] designersOverride,
        uint256[] designerShare
    );
    event UpdateOfferMaxAmount(
        uint256 indexed garmentCollectionId,
        uint256 maxAmount
    );
    event UpdateOfferStartEnd(
        uint256 indexed garmentCollectionId,
        uint256 startTime,
        uint256 endTime
    );
    event UpdateOracle(
        address indexed oracle
    );
    event UpdatePlatformFeeRecipient(
        address payable platformFeeRecipient
    );
    event UpdateCoolDownDuration(
        uint256 cooldown
    );
    event OfferPurchased(
        uint256 indexed bundleTokenId,
        uint256 indexed garmentCollectionId,
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
        address[] designersOverride;
        uint256[] designerShare;
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
    DigitalaxGarmentCollectionV2 public garmentCollection;
    /// @notice oracle for MONA/ETH exchange rate
    IDigitalaxMonaOracle public oracle;
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
    /// @notice for storing information from oracle
    uint256 public lastOracleQuote = 1e18;

    modifier whenNotPaused() {
        require(!isPaused, "Function is currently paused");
        _;
    }
    receive() external payable {
    }
    function initialize(
        DigitalaxAccessControls _accessControls,
        IDigitalaxGarmentNFT _garmentNft,
        DigitalaxGarmentCollectionV2 _garmentCollection,
        IDigitalaxMonaOracle _oracle,
        address payable _platformFeeRecipient,
        address _monaErc20Token,
        address _trustedForwarder
    ) public initializer {
        require(address(_accessControls) != address(0), "DigitalaxMarketplace: Invalid Access Controls");
        require(address(_garmentNft) != address(0), "DigitalaxMarketplace: Invalid NFT");
        require(address(_garmentCollection) != address(0), "DigitalaxMarketplace: Invalid Collection");
        require(address(_oracle) != address(0), "DigitalaxMarketplace: Invalid Oracle");
        require(_platformFeeRecipient != address(0), "DigitalaxMarketplace: Invalid Platform Fee Recipient");
        require(_monaErc20Token != address(0), "DigitalaxMarketplace: Invalid ERC20 Token");
        oracle = _oracle;
        accessControls = _accessControls;
        garmentNft = _garmentNft;
        garmentCollection = _garmentCollection;
        monaErc20Token = _monaErc20Token;
        platformFeeRecipient = _platformFeeRecipient;
        trustedForwarder = _trustedForwarder;

        emit DigitalaxMarketplaceContractDeployed();
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
     @notice Method for updating oracle
     @dev Only admin
     @param _oracle new oracle
     */
    function updateOracle(IDigitalaxMonaOracle _oracle) external {
    require(
        accessControls.hasAdminRole(_msgSender()),
        "DigitalaxAuction.updateOracle: Sender must be admin"
        );

        oracle = _oracle;
        emit UpdateOracle(address(_oracle));
    }

    /**
     @notice Private method to estimate ETH for paying
     @param _amountInMona MONA amount in wei
     */
    function _estimateETHAmount(uint256 _amountInMona) public returns (uint256) {
        (uint256 exchangeRate, bool rateValid) = oracle.getData();
        require(rateValid, "DigitalaxMarketplace.estimateMonaAmount: Oracle data is invalid");
        lastOracleQuote = exchangeRate;

        return _amountInMona.mul(exchangeRate).div(1e18);
    }

    /**
     @notice Creates a new offer for a given garment
     @dev Only the owner of a garment can create an offer and must have ALREADY approved the contract
     @dev In addition to owning the garment, the sender also has to have the MINTER or ADMIN role.
     @dev End time for the offer will be in the future, at a time from now till expiry duration
     @dev There cannot be a duplicate offer created
     @param _garmentCollectionId Collection ID of the garment being offered to marketplace
     @param _primarySalePrice Garment cannot be sold for less than this
     @param _startTimestamp when the sale starts
     @param _endTimestamp when the sale ends
     @param _platformFee Percentage to pay out to the platformFeeRecipient, 1 decimal place (i.e. 40% is 400)
     @param _maxAmount Max number of products from this collection that someone can buy
     @param _designersOverride designers to use instead of contract one
     @param _designerShare share to give the designers - must add up to 100% and has 2 decimal places (50% = 5000)
     */
    function createOffer(
        uint256 _garmentCollectionId,
        uint256 _primarySalePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        uint256 _platformFee,
        uint256 _maxAmount,
        address[] memory _designersOverride,
        uint256[] memory _designerShare
    ) external {
        // Ensure caller has privileges
        require(
            accessControls.hasMinterRole(_msgSender()) || accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMarketplace.createOffer: Sender must have the minter or admin role"
        );
        // Ensure the collection does exists
        require(garmentCollection.getSupply(_garmentCollectionId) > 0, "DigitalaxMarketplace.createOffer: Collection does not exist");
        // Check owner of the collection is the owner and approved
        require(
            garmentCollection.hasOwnedOf(_garmentCollectionId, _msgSender()) && _isCollectionApproved(_garmentCollectionId, address(this)),
            "DigitalaxMarketplace.createOffer: Not owner and or contract not approved"
        );
        // Ensure the maximum purchaseable amount is less than collection supply
        require(_maxAmount <= garmentCollection.getSupply(_garmentCollectionId), "DigitalaxMarketplace.createOffer: Invalid Maximum amount");
        // Ensure the end time stamp is valid
        require(_endTimestamp > _startTimestamp, "DigitalaxMarketplace.createOffer: Invalid end time");

        _createOffer(
            _garmentCollectionId,
            _primarySalePrice,
            _startTimestamp,
            _endTimestamp,
            _platformFee,
            _maxAmount,
            false,
            _designersOverride,
            _designerShare
        );
    }

    /**
     @notice Buys an open offer with eth or erc20
     @dev Only callable when the offer is open
     @dev Bids from smart contracts are prohibited - a user must buy directly from their address
     @dev Contract must have been approved on the buy offer previously
     @dev The sale must have started (start time) to make a successful buy
     @param _garmentCollectionId Collection ID of the garment being offered
     */
    function buyOffer(uint256 _garmentCollectionId) external payable whenNotPaused nonReentrant {
        // Check the offers to see if this is a valid
        require(_msgSender().isContract() == false, "DigitalaxMarketplace.buyOffer: No contracts permitted");
        require(_isFinished(_garmentCollectionId) == false, "DigitalaxMarketplace.buyOffer: Sale has been finished");
        require(lastPurchasedTime[_garmentCollectionId][_msgSender()] <= _getNow().sub(cooldown), "DigitalaxMarketplace.buyOffer: Cooldown not reached");

        Offer storage offer = offers[_garmentCollectionId];
        require(
            garmentCollection.balanceOfAddress(_garmentCollectionId, _msgSender()) < offer.maxAmount,
            "DigitalaxMarketplace.buyOffer: Can't purchase over maximum amount"
        );
        require(!offer.paused, "DigitalaxMarketplace.buyOffer: Can't purchase when paused");

        uint256[] memory bundleTokenIds = garmentCollection.getTokenIds(_garmentCollectionId);
        uint256 bundleTokenId = bundleTokenIds[offer.availableIndex];
        uint256 maxShare = 1000;

        // Ensure this contract is still approved to move the token
        require(garmentNft.isApproved(bundleTokenId, address(this)), "DigitalaxMarketplace.buyOffer: offer not approved");
        require(_getNow() >= offer.startTime, "DigitalaxMarketplace.buyOffer: Purchase outside of the offer window");

        uint256 feeInMona = offer.primarySalePrice.mul(offer.platformFee).div(maxShare);

        require(!freezeMonaERC20Payment, "DigitalaxMarketplace.buyOffer: mona erc20 payments currently frozen");

        // Designer receives (Primary Sale Price minus Protocol Fee)
        uint256 amountOfMonaToTransferToDesigner = offer.primarySalePrice.sub(feeInMona);

        // There is a discount on Fees paying in Mona
        uint256 amountOfDiscountOnMonaPrice = offer.primarySalePrice.mul(offer.discountToPayERC20).div(maxShare);
        uint256 amountOfMonaToTransferAsFees = feeInMona.sub(amountOfDiscountOnMonaPrice);


        // Check that there is enough ERC20 to cover the rest of the value (minus the discount already taken)
        require(IERC20(monaErc20Token).allowance(_msgSender(), address(this)) >= offer.primarySalePrice, "DigitalaxMarketplace.buyOffer: Failed to supply ERC20 Allowance");
         // Transfer ERC20 token from user to contract(this) escrow

        // For the garment designer splits. If there is a [] [] passed on create offer, then it defaults to the NFT designer address
        // If there are designers specified in the createOffer, then that exact configuration will be respected here
        // So we either have default designer, or multi designers

        if(offer.designersOverride.length > 0) {
            for (uint i = 0; i < offer.designersOverride.length; i++) {
                uint256 payoutToDesigner = offer.designerShare[i].mul(amountOfMonaToTransferToDesigner).div(uint256(1000));
                IERC20(monaErc20Token).transferFrom(_msgSender(),  offer.designersOverride[i], payoutToDesigner);
            }
        } else{
            IERC20(monaErc20Token).transferFrom(_msgSender(), garmentNft.garmentDesigners(bundleTokenId), amountOfMonaToTransferToDesigner);
        }

        IERC20(monaErc20Token).transferFrom(_msgSender(), platformFeeRecipient, amountOfMonaToTransferAsFees);

        offer.availableIndex = offer.availableIndex.add(1);
        // Record the primary sale price for the garment
        garmentNft.setPrimarySalePrice(bundleTokenId, _estimateETHAmount(offer.primarySalePrice));
        // Transfer the token to the purchaser
        garmentNft.safeTransferFrom(garmentNft.ownerOf(bundleTokenId), _msgSender(), bundleTokenId);
        lastPurchasedTime[_garmentCollectionId][_msgSender()] = _getNow();

        emit OfferPurchased(bundleTokenId, _garmentCollectionId, _msgSender(), offer.primarySalePrice, true, offer.primarySalePrice, offer.platformFee, offer.discountToPayERC20);
    }
    /**
     @notice Cancels an inflight and un-resulted offer
     @dev Only admin
     @param _garmentCollectionId Token ID of the garment being offered
     */
    function cancelOffer(uint256 _garmentCollectionId) external nonReentrant {
        // Admin only resulting function
        require(
            accessControls.hasAdminRole(_msgSender()) || accessControls.hasMinterRole(_msgSender()),
            "DigitalaxMarketplace.cancelOffer: Sender must be admin or minter contract"
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
    function togglePaused(uint256 _garmentCollectionId) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.togglePaused: Sender must be admin");
        Offer storage offer = offers[_garmentCollectionId];
        offer.paused = !offer.paused;
        emit CollectionPauseToggled(_garmentCollectionId, offer.paused);
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
     @notice Toggle freeze Mona ERC20
     @dev Only admin
     */
    function toggleFreezeMonaERC20Payment() external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.toggleFreezeMonaERC20Payment: Sender must be admin");
        freezeMonaERC20Payment = !freezeMonaERC20Payment;
        emit FreezeMonaERC20PaymentToggled(freezeMonaERC20Payment);
    }

    /**
     @notice Update the marketplace discount
     @dev Only admin
     @dev This discount is taken away from the received fees, so the discount cannot exceed the platform fee
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _marketplaceDiscount New marketplace discount
     */
    function updateMarketplaceDiscountToPayInErc20(uint256 _garmentCollectionId, uint256 _marketplaceDiscount) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.updateMarketplaceDiscountToPayInErc20: Sender must be admin");
        require(_marketplaceDiscount <= offers[_garmentCollectionId].platformFee, "DigitalaxMarketplace.updateMarketplaceDiscountToPayInErc20: Discount cannot be greater then fee");
        offers[_garmentCollectionId].discountToPayERC20 = _marketplaceDiscount;
        emit UpdateMarketplaceDiscountToPayInErc20(_garmentCollectionId, _marketplaceDiscount);
    }

    /**
     @notice Update the marketplace fee
     @dev Only admin
     @dev There is a discount that can be taken away from received fees, so that discount cannot exceed the platform fee
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _platformFee New marketplace fee
     */
    function updateMarketplacePlatformFee(uint256 _garmentCollectionId, uint256 _platformFee) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.updateMarketplacePlatformFee: Sender must be admin");
        require(_platformFee >= offers[_garmentCollectionId].discountToPayERC20, "DigitalaxMarketplace.updateMarketplacePlatformFee: Discount cannot be greater then fee");
        offers[_garmentCollectionId].platformFee = _platformFee;
        emit UpdateMarketplacePlatformFee(_garmentCollectionId, _platformFee);
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
     @notice Update the offer primary sale price
     @dev Only admin
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _designersOverride designer addresses
     @param _designerShare designer shares, adding up to 100% (1000) 1 decimal place
     */
    function updateOfferDesignerOverrideShare(uint256 _garmentCollectionId, address[] memory _designersOverride, uint256[] memory _designerShare) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.updateOfferPrimarySalePrice: Sender must be admin");
        require(_designersOverride.length == _designerShare.length, "Array lengths");
        uint256 shareTotal = 0;
         for (uint i = 0; i < _designerShare.length; i++) {
            shareTotal = shareTotal.add(_designerShare[i]);
        }
        require(shareTotal == 1000, "The designer share distro must add up to 100 percent, 1000");

        offers[_garmentCollectionId].designersOverride = _designersOverride;
        offers[_garmentCollectionId].designerShare = _designerShare;
        emit UpdateDesignerOverride(_garmentCollectionId, _designersOverride, _designerShare);
    }

    /**
     @notice Update the offer max amount
     @dev Only admin
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _maxAmount New amount
     */
    function updateOfferMaxAmount(uint256 _garmentCollectionId, uint256 _maxAmount) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.updateOfferMaxAmount: Sender must be admin");

        offers[_garmentCollectionId].maxAmount = _maxAmount;
        emit UpdateOfferMaxAmount(_garmentCollectionId, _maxAmount);
    }

    /**
     @notice Update the offer start and end time
     @dev Only admin
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _startTime start time
     @param _endTime end time
     */
    function updateOfferStartEndTime(uint256 _garmentCollectionId, uint256 _startTime, uint256 _endTime) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.updateOfferPrimarySalePrice: Sender must be admin");
        require(_endTime > _startTime, "DigitalaxMarketplace.createOffer: Invalid end time");
        offers[_garmentCollectionId].startTime = _startTime;
        offers[_garmentCollectionId].endTime = _endTime;
        emit UpdateOfferStartEnd(_garmentCollectionId, _startTime, _endTime);
    }

    /**
     @notice Update cool down duration
     @dev Only admin
     @param _cooldown New cool down duration
     */
    function updateCoolDownDuration(uint256 _cooldown) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.updateCoolDownDuration: Sender must be admin");

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
    returns (uint256 _primarySalePrice, uint256 _startTime, uint256 _endTime, uint256 _availableAmount, uint _platformFee, uint256 _discountToPayERC20) {
        Offer storage offer = offers[_garmentCollectionId];
        uint256 availableAmount = garmentCollection.getSupply(_garmentCollectionId).sub(offer.availableIndex);
        return (
            offer.primarySalePrice,
            offer.startTime,
            offer.endTime,
            availableAmount,
            offer.platformFee,
            offer.discountToPayERC20
        );
    }

// TODO get Offer for all the designer shares

    ///////////////
    // Accessors //
    ///////////////
    /**
     @notice Method for getting all info about the offer
     @param _garmentCollectionId Token ID of the garment being offered
     */
    function getOfferMaxAmount(uint256 _garmentCollectionId)
    external
    view
    returns (uint256 _maxAmount) {
        Offer storage offer = offers[_garmentCollectionId];
        return (
            offer.maxAmount
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
     @param _garmentCollectionId Id of the collection.
     */
    function _isFinished(uint256 _garmentCollectionId) internal virtual view returns (bool) {
        Offer memory offer = offers[_garmentCollectionId];

        if (offer.endTime < _getNow()) {
            return true;
        }

        uint256 availableAmount = garmentCollection.getSupply(_garmentCollectionId).sub(offer.availableIndex);
        return availableAmount <= 0;
    }

    /**
     @notice Private method doing the heavy lifting of creating an offer
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _primarySalePrice Garment cannot be sold for less than this
     @param _startTimestamp Unix epoch in seconds for the offer start time
     @param _platformFee Percentage to pay out to the platformFeeRecipient, 1 decimal place (i.e. 40% is 400)
     @param _paused is paused
     @param _designersOverride designers to use instead of contract one
     @param _designerShare share to give the designers - must add up to 100% and has 1 decimal places (50% = 500)

     */
    function _createOffer(
        uint256 _garmentCollectionId,
        uint256 _primarySalePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        uint256 _platformFee,
        uint256 _maxAmount,
        bool _paused,
        address[] memory _designersOverride,
        uint256[] memory _designerShare
    ) private {
        // Ensure a token cannot be re-listed if previously successfully sold
        require(offers[_garmentCollectionId].startTime == 0, "DigitalaxMarketplace.createOffer: Cannot duplicate current offer");

        if(_designersOverride.length > 0) {
            require (_designersOverride.length == _designerShare.length, "Array lengths for designer");

            uint256 shareTotal = 0;
            for (uint i = 0; i < _designerShare.length; i++) {
                shareTotal = shareTotal.add(_designerShare[i]);
            }
            require(shareTotal == 1000, "The designer share distro must add up to 100 percent, 1000");
        }

        // Setup the new offer
        offers[_garmentCollectionId] = Offer({
            primarySalePrice : _primarySalePrice,
            startTime : _startTimestamp,
            endTime: _endTimestamp,
            availableIndex : 0,
            platformFee: _platformFee,
            discountToPayERC20: 0,
            maxAmount: _maxAmount,
            paused: _paused,
            designersOverride: _designersOverride,
            designerShare: _designerShare
        });

        emit OfferCreated(_garmentCollectionId, _primarySalePrice, _startTimestamp, _endTimestamp, _platformFee, 0, _maxAmount);
        emit UpdateDesignerOverride(_garmentCollectionId, _designersOverride, _designerShare);
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
            "DigitalaxMarketplace.reclaimETH: Sender must be admin"
        );
        _msgSender().transfer(address(this).balance);
    }
}
