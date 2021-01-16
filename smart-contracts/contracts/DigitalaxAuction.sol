// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DigitalaxAccessControls.sol";
import "./garment/IDigitalaxGarmentNFT.sol";

/**
 * @notice Primary sale auction contract for Digitalax NFTs
 */
contract DigitalaxAuction is Context, ReentrancyGuard {
    using SafeMath for uint256;
    using Address for address payable;

    /// @notice Event emitted only on construction. To be used by indexers
    event DigitalaxAuctionContractDeployed();

    event PauseToggled(
        bool isPaused
    );

    event AuctionCreated(
        uint256 indexed garmentTokenId
    );

    event UpdateAuctionEndTime(
        uint256 indexed garmentTokenId,
        uint256 endTime
    );

    event UpdateAuctionStartTime(
        uint256 indexed garmentTokenId,
        uint256 startTime
    );

    event UpdateAuctionReservePrice(
        uint256 indexed garmentTokenId,
        uint256 reservePrice
    );

    event UpdateAccessControls(
        address indexed accessControls
    );

    event UpdatePlatformFee(
        uint256 platformFee
    );

    event UpdatePlatformFeeRecipient(
        address payable platformFeeRecipient
    );

    event UpdateMinBidIncrement(
        uint256 minBidIncrement
    );

    event UpdateBidWithdrawalLockTime(
        uint256 bidWithdrawalLockTime
    );

    event BidPlaced(
        uint256 indexed garmentTokenId,
        address indexed bidder,
        uint256 bid
    );

    event BidWithdrawn(
        uint256 indexed garmentTokenId,
        address indexed bidder,
        uint256 bid
    );

    event BidRefunded(
        address indexed bidder,
        uint256 bid
    );

    event AuctionResulted(
        uint256 indexed garmentTokenId,
        address indexed winner,
        uint256 winningBid
    );

    event AuctionCancelled(
        uint256 indexed garmentTokenId
    );

    /// @notice Parameters of an auction
    struct Auction {
        uint256 reservePrice;
        uint256 startTime;
        uint256 endTime;
        bool resulted;
    }

    /// @notice Information about the sender that placed a bit on an auction
    struct HighestBid {
        address payable bidder;
        uint256 bid;
        uint256 lastBidTime;
    }

    /// @notice Garment ERC721 Token ID -> Auction Parameters
    mapping(uint256 => Auction) public auctions;

    /// @notice Garment ERC721 Token ID -> highest bidder info (if a bid has been received)
    mapping(uint256 => HighestBid) public highestBids;

    /// @notice Garment ERC721 NFT - the only NFT that can be auctioned in this contract
    IDigitalaxGarmentNFT public garmentNft;

    // @notice responsible for enforcing admin access
    DigitalaxAccessControls public accessControls;

    /// @notice globally and across all auctions, the amount by which a bid has to increase
    uint256 public minBidIncrement = 0.1 ether;

    /// @notice global bid withdrawal lock time
    uint256 public bidWithdrawalLockTime = 20 minutes;

    /// @notice global platform fee, assumed to always be to 1 decimal place i.e. 120 = 12.0%
    uint256 public platformFee = 120;

    /// @notice where to send platform fee funds to
    address payable public platformFeeRecipient;

    /// @notice for switching off auction creations, bids and withdrawals
    bool public isPaused;

    modifier whenNotPaused() {
        require(!isPaused, "Function is currently paused");
        _;
    }

    constructor(
        DigitalaxAccessControls _accessControls,
        IDigitalaxGarmentNFT _garmentNft,
        address payable _platformFeeRecipient
    ) public {
        require(address(_accessControls) != address(0), "DigitalaxAuction: Invalid Access Controls");
        require(address(_garmentNft) != address(0), "DigitalaxAuction: Invalid NFT");
        require(_platformFeeRecipient != address(0), "DigitalaxAuction: Invalid Platform Fee Recipient");

        accessControls = _accessControls;
        garmentNft = _garmentNft;
        platformFeeRecipient = _platformFeeRecipient;

        emit DigitalaxAuctionContractDeployed();
    }

    /**
     @notice Creates a new auction for a given garment
     @dev Only the owner of a garment can create an auction and must have approved the contract
     @dev In addition to owning the garment, the sender also has to have the MINTER role.
     @dev End time for the auction must be in the future.
     @param _garmentTokenId Token ID of the garment being auctioned
     @param _reservePrice Garment cannot be sold for less than this or minBidIncrement, whichever is higher
     @param _startTimestamp Unix epoch in seconds for the auction start time
     @param _endTimestamp Unix epoch in seconds for the auction end time.
     */
    function createAuction(
        uint256 _garmentTokenId,
        uint256 _reservePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) external whenNotPaused {
        // Ensure caller has privileges
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxAuction.createAuction: Sender must have the minter role"
        );

        // Check owner of the token is the creator and approved
        require(
            garmentNft.ownerOf(_garmentTokenId) == _msgSender() && garmentNft.isApproved(_garmentTokenId, address(this)),
            "DigitalaxAuction.createAuction: Not owner and or contract not approved"
        );

        _createAuction(
            _garmentTokenId,
            _reservePrice,
            _startTimestamp,
            _endTimestamp
        );
    }

    /**
     @notice Admin or smart contract can list approved Garments
     @dev Sender must have admin or smart contract role
     @dev Owner must have approved this contract for the garment or all garments they own
     @dev End time for the auction must be in the future.
     @param _garmentTokenId Token ID of the garment being auctioned
     @param _reservePrice Garment cannot be sold for less than this or minBidIncrement, whichever is higher
     @param _startTimestamp Unix epoch in seconds for the auction start time
     @param _endTimestamp Unix epoch in seconds for the auction end time.
     */
    function createAuctionOnBehalfOfOwner(
        uint256 _garmentTokenId,
        uint256 _reservePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) external {
        // Ensure caller has privileges
        require(
            accessControls.hasAdminRole(_msgSender()) || accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxAuction.createAuctionOnBehalfOfOwner: Sender must have admin or smart contract role"
        );

        require(
            garmentNft.isApproved(_garmentTokenId, address(this)),
            "DigitalaxAuction.createAuctionOnBehalfOfOwner: Cannot create an auction if you do not have approval"
        );

        _createAuction(
            _garmentTokenId,
            _reservePrice,
            _startTimestamp,
            _endTimestamp
        );
    }

    /**
     @notice Places a new bid, out bidding the existing bidder if found and criteria is reached
     @dev Only callable when the auction is open
     @dev Bids from smart contracts are prohibited to prevent griefing with always reverting receiver
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function placeBid(uint256 _garmentTokenId) external payable nonReentrant whenNotPaused {
        require(_msgSender().isContract() == false, "DigitalaxAuction.placeBid: No contracts permitted");

        // Check the auction to see if this is a valid bid
        Auction storage auction = auctions[_garmentTokenId];

        // Ensure auction is in flight
        require(
            _getNow() >= auction.startTime && _getNow() <= auction.endTime,
            "DigitalaxAuction.placeBid: Bidding outside of the auction window"
        );

        uint256 bidAmount = msg.value;

        // Ensure bid adheres to outbid increment and threshold
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        uint256 minBidRequired = highestBid.bid.add(minBidIncrement);
        require(bidAmount >= minBidRequired, "DigitalaxAuction.placeBid: Failed to outbid highest bidder");

        // Refund existing top bidder if found
        if (highestBid.bidder != address(0)) {
            _refundHighestBidder(highestBid.bidder, highestBid.bid);
        }

        // assign top bidder and bid time
        highestBid.bidder = _msgSender();
        highestBid.bid = bidAmount;
        highestBid.lastBidTime = _getNow();

        emit BidPlaced(_garmentTokenId, _msgSender(), bidAmount);
    }

    /**
     @notice Given a sender who has the highest bid on a garment, allows them to withdraw their bid
     @dev Only callable by the existing top bidder
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function withdrawBid(uint256 _garmentTokenId) external nonReentrant whenNotPaused {
        HighestBid storage highestBid = highestBids[_garmentTokenId];

        // Ensure highest bidder is the caller
        require(highestBid.bidder == _msgSender(), "DigitalaxAuction.withdrawBid: You are not the highest bidder");

        // Check withdrawal after delay time
        require(
            _getNow() >= highestBid.lastBidTime.add(bidWithdrawalLockTime),
            "DigitalaxAuction.withdrawBid: Cannot withdraw until lock time has passed"
        );

        require(_getNow() < auctions[_garmentTokenId].endTime, "DigitalaxAuction.withdrawBid: Past auction end");

        uint256 previousBid = highestBid.bid;

        // Clean up the existing top bid
        delete highestBids[_garmentTokenId];

        // Refund the top bidder
        _refundHighestBidder(_msgSender(), previousBid);

        emit BidWithdrawn(_garmentTokenId, _msgSender(), previousBid);
    }

    //////////
    // Admin /
    //////////

    /**
     @notice Results a finished auction
     @dev Only admin or smart contract
     @dev Auction can only be resulted if there has been a bidder and reserve met.
     @dev If there have been no bids, the auction needs to be cancelled instead using `cancelAuction()`
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function resultAuction(uint256 _garmentTokenId) external nonReentrant {
        require(
            accessControls.hasAdminRole(_msgSender()) || accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxAuction.resultAuction: Sender must be admin or smart contract"
        );

        // Check the auction to see if it can be resulted
        Auction storage auction = auctions[_garmentTokenId];

        // Check the auction real
        require(auction.endTime > 0, "DigitalaxAuction.resultAuction: Auction does not exist");

        // Check the auction has ended
        require(_getNow() > auction.endTime, "DigitalaxAuction.resultAuction: The auction has not ended");

        // Ensure auction not already resulted
        require(!auction.resulted, "DigitalaxAuction.resultAuction: auction already resulted");

        // Ensure this contract is approved to move the token
        require(garmentNft.isApproved(_garmentTokenId, address(this)), "DigitalaxAuction.resultAuction: auction not approved");

        // Get info on who the highest bidder is
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        address winner = highestBid.bidder;
        uint256 winningBid = highestBid.bid;

        // Ensure auction not already resulted
        require(winningBid >= auction.reservePrice, "DigitalaxAuction.resultAuction: reserve not reached");

        // Ensure there is a winner
        require(winner != address(0), "DigitalaxAuction.resultAuction: no open bids");

        // Result the auction
        auctions[_garmentTokenId].resulted = true;

        // Clean up the highest bid
        delete highestBids[_garmentTokenId];

        // Record the primary sale price for the garment
        garmentNft.setPrimarySalePrice(_garmentTokenId, winningBid);

        if (winningBid > auction.reservePrice) {
            // Work out total above the reserve
            uint256 aboveReservePrice = winningBid.sub(auction.reservePrice);

            // Work out platform fee from above reserve amount
            uint256 platformFeeAboveReserve = aboveReservePrice.mul(platformFee).div(1000);

            // Send platform fee
            (bool platformTransferSuccess,) = platformFeeRecipient.call{value : platformFeeAboveReserve}("");
            require(platformTransferSuccess, "DigitalaxAuction.resultAuction: Failed to send platform fee");

            // Send remaining to designer
            (bool designerTransferSuccess,) = garmentNft.garmentDesigners(_garmentTokenId).call{value : winningBid.sub(platformFeeAboveReserve)}("");
            require(designerTransferSuccess, "DigitalaxAuction.resultAuction: Failed to send the designer their royalties");
        } else {
            // Send all to the designer
            (bool designerTransferSuccess,) = garmentNft.garmentDesigners(_garmentTokenId).call{value : winningBid}("");
            require(designerTransferSuccess, "DigitalaxAuction.resultAuction: Failed to send the designer their royalties");
        }

        // Transfer the token to the winner
        garmentNft.safeTransferFrom(garmentNft.ownerOf(_garmentTokenId), winner, _garmentTokenId);

        emit AuctionResulted(_garmentTokenId, winner, winningBid);
    }

    /**
     @notice Cancels and inflight and un-resulted auctions, returning the funds to the top bidder if found
     @dev Only admin
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function cancelAuction(uint256 _garmentTokenId) external nonReentrant {
        // Admin only resulting function
        require(
            accessControls.hasAdminRole(_msgSender()) || accessControls.hasSmartContractRole(_msgSender()),
            "DigitalaxAuction.cancelAuction: Sender must be admin or smart contract"
        );

        // Check valid and not resulted
        Auction storage auction = auctions[_garmentTokenId];

        // Check auction is real
        require(auction.endTime > 0, "DigitalaxAuction.cancelAuction: Auction does not exist");

        // Check auction not already resulted
        require(!auction.resulted, "DigitalaxAuction.cancelAuction: auction already resulted");

        // refund existing top bidder if found
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        if (highestBid.bidder != address(0)) {
            _refundHighestBidder(highestBid.bidder, highestBid.bid);

            // Clear up highest bid
            delete highestBids[_garmentTokenId];
        }

        // Remove auction and top bidder
        delete auctions[_garmentTokenId];

        emit AuctionCancelled(_garmentTokenId);
    }

    /**
     @notice Toggling the pause flag
     @dev Only admin
     */
    function toggleIsPaused() external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.toggleIsPaused: Sender must be admin");
        isPaused = !isPaused;
        emit PauseToggled(isPaused);
    }

    /**
     @notice Update the amount by which bids have to increase, across all auctions
     @dev Only admin
     @param _minBidIncrement New bid step in WEI
     */
    function updateMinBidIncrement(uint256 _minBidIncrement) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.updateMinBidIncrement: Sender must be admin");
        minBidIncrement = _minBidIncrement;
        emit UpdateMinBidIncrement(_minBidIncrement);
    }

    /**
     @notice Update the global bid withdrawal lockout time
     @dev Only admin
     @param _bidWithdrawalLockTime New bid withdrawal lock time
     */
    function updateBidWithdrawalLockTime(uint256 _bidWithdrawalLockTime) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.updateBidWithdrawalLockTime: Sender must be admin");
        bidWithdrawalLockTime = _bidWithdrawalLockTime;
        emit UpdateBidWithdrawalLockTime(_bidWithdrawalLockTime);
    }

    /**
     @notice Update the current reserve price for an auction
     @dev Only admin
     @dev Auction must exist
     @param _garmentTokenId Token ID of the garment being auctioned
     @param _reservePrice New Ether reserve price (WEI value)
     */
    function updateAuctionReservePrice(uint256 _garmentTokenId, uint256 _reservePrice) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxAuction.updateAuctionReservePrice: Sender must be admin"
        );

        require(
            auctions[_garmentTokenId].endTime > 0,
            "DigitalaxAuction.updateAuctionReservePrice: No Auction exists"
        );

        auctions[_garmentTokenId].reservePrice = _reservePrice;
        emit UpdateAuctionReservePrice(_garmentTokenId, _reservePrice);
    }

    /**
     @notice Update the current start time for an auction
     @dev Only admin
     @dev Auction must exist
     @param _garmentTokenId Token ID of the garment being auctioned
     @param _startTime New start time (unix epoch in seconds)
     */
    function updateAuctionStartTime(uint256 _garmentTokenId, uint256 _startTime) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxAuction.updateAuctionStartTime: Sender must be admin"
        );

        require(
            auctions[_garmentTokenId].endTime > 0,
            "DigitalaxAuction.updateAuctionStartTime: No Auction exists"
        );

        auctions[_garmentTokenId].startTime = _startTime;
        emit UpdateAuctionStartTime(_garmentTokenId, _startTime);
    }

    /**
     @notice Update the current end time for an auction
     @dev Only admin
     @dev Auction must exist
     @param _garmentTokenId Token ID of the garment being auctioned
     @param _endTimestamp New end time (unix epoch in seconds)
     */
    function updateAuctionEndTime(uint256 _garmentTokenId, uint256 _endTimestamp) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxAuction.updateAuctionEndTime: Sender must be admin"
        );
        require(
            auctions[_garmentTokenId].endTime > 0,
            "DigitalaxAuction.updateAuctionEndTime: No Auction exists"
        );
        require(
            auctions[_garmentTokenId].startTime < _endTimestamp,
            "DigitalaxAuction.updateAuctionEndTime: End time must be greater than start"
        );
        require(
            _endTimestamp > _getNow(),
            "DigitalaxAuction.updateAuctionEndTime: End time passed. Nobody can bid"
        );

        auctions[_garmentTokenId].endTime = _endTimestamp;
        emit UpdateAuctionEndTime(_garmentTokenId, _endTimestamp);
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxAuction.updateAccessControls: Sender must be admin"
        );

        require(address(_accessControls) != address(0), "DigitalaxAuction.updateAccessControls: Zero Address");

        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }

    /**
     @notice Method for updating platform fee
     @dev Only admin
     @param _platformFee uint256 the platform fee to set
     */
    function updatePlatformFee(uint256 _platformFee) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxAuction.updatePlatformFee: Sender must be admin"
        );

        platformFee = _platformFee;
        emit UpdatePlatformFee(_platformFee);
    }

    /**
     @notice Method for updating platform fee address
     @dev Only admin
     @param _platformFeeRecipient payable address the address to sends the funds to
     */
    function updatePlatformFeeRecipient(address payable _platformFeeRecipient) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxAuction.updatePlatformFeeRecipient: Sender must be admin"
        );

        require(_platformFeeRecipient != address(0), "DigitalaxAuction.updatePlatformFeeRecipient: Zero address");

        platformFeeRecipient = _platformFeeRecipient;
        emit UpdatePlatformFeeRecipient(_platformFeeRecipient);
    }

    ///////////////
    // Accessors //
    ///////////////

    /**
     @notice Method for getting all info about the auction
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function getAuction(uint256 _garmentTokenId)
    external
    view
    returns (uint256 _reservePrice, uint256 _startTime, uint256 _endTime, bool _resulted) {
        Auction storage auction = auctions[_garmentTokenId];
        return (
        auction.reservePrice,
        auction.startTime,
        auction.endTime,
        auction.resulted
        );
    }

    /**
     @notice Method for getting all info about the highest bidder
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function getHighestBidder(uint256 _garmentTokenId) external view returns (
        address payable _bidder,
        uint256 _bid,
        uint256 _lastBidTime
    ) {
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        return (
            highestBid.bidder,
            highestBid.bid,
            highestBid.lastBidTime
        );
    }

    /////////////////////////
    // Internal and Private /
    /////////////////////////

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    /**
     @notice Private method doing the heavy lifting of creating an auction
     @param _garmentTokenId Token ID of the garment being auctioned
     @param _reservePrice Garment cannot be sold for less than this or minBidIncrement, whichever is higher
     @param _startTimestamp Unix epoch in seconds for the auction start time
     @param _endTimestamp Unix epoch in seconds for the auction end time.
     */
    function _createAuction(
        uint256 _garmentTokenId,
        uint256 _reservePrice,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) private {
        // Ensure a token cannot be re-listed if previously successfully sold
        require(auctions[_garmentTokenId].endTime == 0, "DigitalaxAuction.createAuction: Cannot relist");

        // Check end time not before start time and that end is in the future
        require(_endTimestamp > _startTimestamp, "DigitalaxAuction.createAuction: End time must be greater than start");
        require(_endTimestamp > _getNow(), "DigitalaxAuction.createAuction: End time passed. Nobody can bid.");

        // Setup the auction
        auctions[_garmentTokenId] = Auction({
        reservePrice : _reservePrice,
        startTime : _startTimestamp,
        endTime : _endTimestamp,
        resulted : false
        });

        emit AuctionCreated(_garmentTokenId);
    }

    /**
     @notice Used for sending back escrowed funds from a previous bid
     @param _currentHighestBidder Address of the last highest bidder
     @param _currentHighestBid Ether amount in WEI that the bidder sent when placing their bid
     */
    function _refundHighestBidder(address payable _currentHighestBidder, uint256 _currentHighestBid) private {
        // refund previous best (if bid exists)
        (bool successRefund,) = _currentHighestBidder.call{value : _currentHighestBid}("");
        require(successRefund, "DigitalaxAuction._refundHighestBidder: failed to refund previous bidder");
        emit BidRefunded(_currentHighestBidder, _currentHighestBid);
    }

    /**
    * @notice Reclaims ERC20 Compatible tokens for entire balance
    * @dev Only access controls admin
    * @param _tokenContract The address of the token contract
    */
    function reclaimERC20(address _tokenContract) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxAuction.reclaimERC20: Sender must be admin"
        );
        require(_tokenContract != address(0), "Invalid address");
        IERC20 token = IERC20(_tokenContract);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(msg.sender, balance), "Transfer failed");
    }

    /**
     * @notice Reclaims ETH
     * @dev Only access controls admin can access
     * @dev ONLY FOR EMERGENCY - THIS WILL DRAIN ALL ETH IN THE ACCOUNT and send it to the calling Admin
     * @dev Technically, an admin can already change platformFeeRecipient, auction end time and resultAuction,
     * @dev ...so the admin is always in control of funds on the contract anyways. This convenience method allows
     * @dev ...the admin to recover extra eth sent to the account after auctions complete, or recover all funds in
     * @dev ...case there is a malfunction in the auction operation.
     */
    function reclaimETH() external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxAuction.reclaimETH: Sender must be admin"
        );
        msg.sender.transfer(address(this).balance);
    }
}
