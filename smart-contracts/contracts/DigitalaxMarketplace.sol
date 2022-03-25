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
import "./oracle/IDigitalaxMonaOracle.sol";
import "./EIP2771/BaseRelayRecipient.sol";

/**
 * @notice Marketplace contract for Digitalax NFTs
 */
contract DigitalaxMarketplace is ReentrancyGuard, BaseRelayRecipient {
    using SafeMath for uint256;
    using Address for address payable;
    /// @notice Event emitted only on construction. To be used by indexers
    event DigitalaxMarketplaceContractDeployed();
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
        uint256 indexed garmentCollectionId
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
    event UpdatePlatformFeeRecipient(
        address payable platformFeeRecipient
    );
    event UpdateCoolDownDuration(
        uint256 cooldown
    );
    event UpdateOracle(
        address indexed oracle
    );
    event OfferPurchased(
        uint256 indexed garmentTokenId,
        uint256 indexed garmentCollectionId,
        address indexed buyer,
        uint256 primarySalePrice,
        bool paidInErc20,
        uint256 monaTransferredAmount,
        uint256 platformFee,
        uint256 discountToPayInERC20
    );
    event OfferCancelled(
        uint256 indexed garmentTokenId
    );
    /// @notice Parameters of a marketplace offer
    struct Offer {
        uint256 primarySalePrice;
        uint256 startTime;
        uint256 availableIndex;
        uint256 platformFee;
        uint256 discountToPayERC20;
        uint256 maxAmount;
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
    DigitalaxGarmentCollection public garmentCollection;
    /// @notice responsible for enforcing admin access
    DigitalaxAccessControls public accessControls;
    /// @notice Mona to Ether Oracle
    IDigitalaxMonaOracle public oracle;
    /// @notice where to send platform fee funds to
    address payable public platformFeeRecipient;
    /// @notice the erc20 token
    address public monaErc20Token;
    /// @notice for pausing marketplace functionalities
    bool public isPaused;
    /// @notice for freezing mona payment option
    bool public freezeMonaERC20Payment;
    /// @notice for freezing eth payment option
    bool public freezeETHPayment;
    /// @notice for storing information from oracle
    uint256 public lastOracleQuote = 1e18;
    /// @notice Cool down period
    uint256 public cooldown = 60;

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
        IDigitalaxMonaOracle _oracle,
        address payable _platformFeeRecipient,
        address _monaErc20Token,
        address _trustedForwarder
    ) public {
        require(address(_accessControls) != address(0), "DigitalaxMarketplace: Invalid Access Controls");
        require(address(_garmentNft) != address(0), "DigitalaxMarketplace: Invalid NFT");
        require(address(_garmentCollection) != address(0), "DigitalaxMarketplace: Invalid Collection");
        require(address(_oracle) != address(0), "DigitalaxMarketplace: Invalid Oracle");
        require(_platformFeeRecipient != address(0), "DigitalaxMarketplace: Invalid Platform Fee Recipient");
        require(_monaErc20Token != address(0), "DigitalaxMarketplace: Invalid ERC20 Token");
        accessControls = _accessControls;
        garmentNft = _garmentNft;
        garmentCollection = _garmentCollection;
        oracle = _oracle;
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
     @notice Creates a new offer for a given garment
     @dev Only the owner of a garment can create an offer and must have ALREADY approved the contract
     @dev In addition to owning the garment, the sender also has to have the MINTER or ADMIN role.
     @dev End time for the offer will be in the future, at a time from now till expiry duration
     @dev There cannot be a duplicate offer created
     @param _garmentCollectionId Collection ID of the garment being offered to marketplace
     @param _primarySalePrice Garment cannot be sold for less than this
     @param _platformFee Percentage to pay out to the platformFeeRecipient, 1 decimal place (i.e. 40% is 400)
     @param _discountToPayERC20 Percentage to discount from overall purchase price if Mona (ERC20) used, 1 decimal place (i.e. 5% is 50)
     */
    function createOffer(
        uint256 _garmentCollectionId,
        uint256 _primarySalePrice,
        uint256 _startTimestamp,
        uint256 _platformFee,
        uint256 _discountToPayERC20,
        uint256 _maxAmount
    ) external whenNotPaused {
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

        _createOffer(
            _garmentCollectionId,
            _primarySalePrice,
            _startTimestamp,
            _platformFee,
            _discountToPayERC20,
            _maxAmount
        );
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
     @notice Buys an open offer with eth or erc20
     @dev Only callable when the offer is open
     @dev Bids from smart contracts are prohibited - a user must buy directly from their address
     @dev Contract must have been approved on the buy offer previously
     @dev The sale must have started (start time) to make a successful buy
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _payWithMona Whether to pay with ERC20 Mona token instead of ETH (possible discount for buyer)
     */
    function buyOffer(uint256 _garmentCollectionId, bool _payWithMona) external payable nonReentrant whenNotPaused {
        // Check the offers to see if this is a valid
        require(_msgSender().isContract() == false, "DigitalaxMarketplace.buyOffer: No contracts permitted");
        require(_isFinished(_garmentCollectionId) == false, "DigitalaxMarketplace.buyOffer: Sale has been finished");
        require(lastPurchasedTime[_garmentCollectionId][_msgSender()] <= block.timestamp.sub(cooldown), "DigitalaxMarketplace.buyOffer: Cooldown not reached");

        Offer storage offer = offers[_garmentCollectionId];
        require(
            garmentCollection.balanceOfAddress(_garmentCollectionId, _msgSender()) < offer.maxAmount,
            "DigitalaxMarketplace.buyOffer: Can't purchase over maximum amount"
        );
        uint256[] memory garmentTokenIds = garmentCollection.getTokenIds(_garmentCollectionId);
        uint256 garmentTokenId = garmentTokenIds[offer.availableIndex];
        uint256 maxShare = 1000;

        // Ensure this contract is still approved to move the token
        require(garmentNft.isApproved(garmentTokenId, address(this)), "DigitalaxMarketplace.buyOffer: offer not approved");
        require(_getNow() >= offer.startTime, "DigitalaxMarketplace.buyOffer: Purchase outside of the offer window");

        uint256 feeInETH = offer.primarySalePrice.mul(offer.platformFee).div(maxShare);
        uint256 amountOfMonaToTransfer = 0;

        // Work out platform fee on sale amount
        if(_payWithMona) {
            require(!freezeMonaERC20Payment, "DigitalaxMarketplace.buyOffer: mona erc20 payments currently frozen");

            // Designer receives (Primary Sale Price minus Protocol Fee)
            uint256 amountOfETHDesignerReceives = offer.primarySalePrice.sub(feeInETH);
            uint256 amountOfMonaToTransferToDesigner = _estimateMonaAmount(amountOfETHDesignerReceives);

            // There is a discount on Fees paying in Mona
            uint256 amountOfDiscountOnETHPrice = offer.primarySalePrice.mul(offer.discountToPayERC20).div(maxShare);
            uint256 amountOfETHToBePaidInFees = feeInETH.sub(amountOfDiscountOnETHPrice);
            uint256 amountOfMonaToTransferAsFees = _estimateMonaAmount(amountOfETHToBePaidInFees);

            // Then calculate how much Mona the buyer must send
            amountOfMonaToTransfer = amountOfMonaToTransferToDesigner.add(amountOfMonaToTransferAsFees);

            // Check that there is enough ERC20 to cover the rest of the value (minus the discount already taken)
            require(IERC20(monaErc20Token).allowance(_msgSender(), address(this)) >= amountOfMonaToTransfer, "DigitalaxMarketplace.buyOffer: Failed to supply ERC20 Allowance");
            // Transfer ERC20 token from user to contract(this) escrow
            IERC20(monaErc20Token).transferFrom(_msgSender(), garmentNft.garmentDesigners(garmentTokenId), amountOfMonaToTransferToDesigner);
            IERC20(monaErc20Token).transferFrom(_msgSender(), platformFeeRecipient, amountOfMonaToTransferAsFees);

        } else {
            require(!freezeETHPayment, "DigitalaxMarketplace.buyOffer: eth payments currently frozen");

            require(msg.value >= offer.primarySalePrice, "DigitalaxMarketplace.buyOffer: Failed to supply funds");

            // Send platform fee in ETH to the platform fee recipient, there is a discount that is subtracted from this
            (bool platformTransferSuccess,) = platformFeeRecipient.call{value : feeInETH}("");
            require(platformTransferSuccess, "DigitalaxMarketplace.buyOffer: Failed to send platform fee");
            // Send remaining to designer in ETH, the discount does not effect the amount designers receive
            (bool designerTransferSuccess,) = garmentNft.garmentDesigners(garmentTokenId).call{value : offer.primarySalePrice.sub(feeInETH)}("");
            require(designerTransferSuccess, "DigitalaxMarketplace.buyOffer: Failed to send the designer their royalties");
        }

        offer.availableIndex = offer.availableIndex.add(1);
        // Record the primary sale price for the garment
        garmentNft.setPrimarySalePrice(garmentTokenId, offer.primarySalePrice);
        // Transfer the token to the purchaser
        garmentNft.safeTransferFrom(garmentNft.ownerOf(garmentTokenId), _msgSender(), garmentTokenId);
        lastPurchasedTime[_garmentCollectionId][_msgSender()] = block.timestamp;

        emit OfferPurchased(garmentTokenId, _garmentCollectionId, _msgSender(), offer.primarySalePrice, _payWithMona, amountOfMonaToTransfer, offer.platformFee, offer.discountToPayERC20);
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
    function toggleIsPaused() external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.toggleIsPaused: Sender must be admin");
        isPaused = !isPaused;
        emit PauseToggled(isPaused);
    }

    /**
     @notice Toggle freeze ETH
     @dev Only admin
     */
    function toggleFreezeETHPayment() external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxMarketplace.toggleFreezeETHPayment: Sender must be admin");
        freezeETHPayment = !freezeETHPayment;
        emit FreezeETHPaymentToggled(freezeETHPayment);
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
    returns (uint256 _primarySalePrice, uint256 _startTime, uint256 _availableAmount, uint _platformFee, uint256 _discountToPayERC20) {
        Offer storage offer = offers[_garmentCollectionId];
        uint256 availableAmount = garmentCollection.getSupply(_garmentCollectionId).sub(offer.availableIndex);
        return (
            offer.primarySalePrice,
            offer.startTime,
            availableAmount,
            offer.platformFee,
            offer.discountToPayERC20
        );
    }

    /**
     @notice Method for getting estimation of Mona amount
     */
    function estimateMonaAmount(uint256 _priceInETH) external returns (uint256) {
        return _estimateMonaAmount(_priceInETH);
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
     @param _amountInETH ETH amount in wei
     */
    function _estimateMonaAmount(uint256 _amountInETH) internal virtual returns (uint256) {
        (uint256 exchangeRate, bool rateValid) = oracle.getData();
        require(rateValid, "DigitalaxMarketplace.estimateMonaAmount: Oracle data is invalid");
        lastOracleQuote = exchangeRate;
        return _amountInETH.mul(1e18).div(exchangeRate);
    }

    /**
     @notice Private method doing the heavy lifting of creating an offer
     @param _garmentCollectionId Collection ID of the garment being offered
     @param _primarySalePrice Garment cannot be sold for less than this
     @param _startTimestamp Unix epoch in seconds for the offer start time
     @param _platformFee Percentage to pay out to the platformFeeRecipient, 1 decimal place (i.e. 40% is 400)
     @param _discountToPayERC20 Percentage to discount from overall purchase price if Mona (ERC20) used, 1 decimal place (i.e. 5% is 50)
     */
    function _createOffer(
        uint256 _garmentCollectionId,
        uint256 _primarySalePrice,
        uint256 _startTimestamp,
        uint256 _platformFee,
        uint256 _discountToPayERC20,
        uint256 _maxAmount
    ) private {
        // The discount cannot be greater than the platform fee
        require(_platformFee >= _discountToPayERC20 , "DigitalaxMarketplace.createOffer: The discount is taken out of platform fee, discount cannot be greater");
        // Ensure a token cannot be re-listed if previously successfully sold
        require(offers[_garmentCollectionId].startTime == 0, "DigitalaxMarketplace.createOffer: Cannot duplicate current offer");
        // Setup the new offer
        offers[_garmentCollectionId] = Offer({
            primarySalePrice : _primarySalePrice,
            startTime : _startTimestamp,
            availableIndex : 0,
            platformFee: _platformFee,
            discountToPayERC20: _discountToPayERC20,
            maxAmount: _maxAmount
        });
        emit OfferCreated(_garmentCollectionId);
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
