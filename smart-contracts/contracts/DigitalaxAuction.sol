// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DigitalaxAccessControls.sol";
import "./DigitalaxGarmentNFT.sol";

// TODO add 721 receiver hook

contract DigitalaxAuction is Context, ReentrancyGuard {
    using SafeMath for uint256;

    event AuctionCreated(
        uint256 indexed garmentTokenId
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

    struct Auction {
        uint256 reservePrice;
        uint256 startTime;
        uint256 endTime;
        address lister;
        bool resulted;
    }

    struct HighestBid {
        address payable bidder;
        uint256 bid;
    }

    /// @notice Garment Token ID -> Auction info
    mapping(uint256 => Auction) public auctions;

    /// @notice Garment Token ID -> highest bidder info
    mapping(uint256 => HighestBid) public highestBids;

    /// @notice The NFT contract backing the tokens for auction
    DigitalaxGarmentNFT public garmentNft;

    // @notice responsible for enforcing admin access
    DigitalaxAccessControls public accessControls;

    /// @notice globally and across all auctions, the amount by which a bid has to increase
    uint256 public minBidIncrement = 0.1 ether;

    constructor(DigitalaxAccessControls _accessControls, DigitalaxGarmentNFT _garmentNft) public {
        accessControls = _accessControls;
        garmentNft = _garmentNft;
    }

    // TODO add test for creating an action, cancelling it, creating it again - confirm flow works as expected

    /**
     @notice Creates a new auction for the given token
     @dev Only callable when the auction is open
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function createAuction(
        uint256 _garmentTokenId,
        uint256 _reservePrice,
        uint256 _startTime,
        uint256 _endTime
    // TODO may need to take in lister is setup is done from a orchestrating contract
    ) external {
        // Ensure caller has privileges
        require(
        // TODO change this to smart contract check assuming something else is orchestrating it
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxAuction.createAuction: Sender must have the minter role"
        );

        // Check end time not before start time
        require(_endTime > _startTime, "DigitalaxAuction.createAuction: End time must be greater than start");

        // Check another auction not already flight
        require(
            _getNow() > auctions[_garmentTokenId].endTime,
            "DigitalaxAuction.createAuction: Cannot create an auction in the middle of another"
        );

        // Setup the auction
        auctions[_garmentTokenId] = Auction({
        reservePrice : _reservePrice,
        startTime : _startTime,
        endTime : _endTime,
        lister : _msgSender(),
        resulted : false
        });

        // TODO use safeTransferFrom
        // TODO confirm escrow vs approve and pull pattern preference
        // Escrow in NFT
        garmentNft.transferFrom(_msgSender(), address(this), _garmentTokenId);

        emit AuctionCreated(_garmentTokenId);
    }

    // TODO add test for increasing bid -> placeBid() -> placeBid() again to bump it

    /**
     @notice Places a new bid, out bidding the existing bidder if found and criteria is reached
     @dev Only callable when the auction is open
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function placeBid(uint256 _garmentTokenId) external payable nonReentrant {
        // Check the auction to see if this is a valid bid
        Auction storage auction = auctions[_garmentTokenId];

        // TODO is this check needed as the one below would fail if endtime was not in the future
        require(auction.endTime > 0, "DigitalaxAuction.placeBid: Auction does not exist");

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

        // assign top bidder
        highestBid.bidder = _msgSender();
        highestBid.bid = bidAmount;

        emit BidPlaced(_garmentTokenId, _msgSender(), bidAmount);
    }

    /**
     @notice Withdraws the top bidders winning bid from the contract, removing them as the current winner
     @dev Only callable by the existing top bidder
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function withdrawBid(uint256 _garmentTokenId) external nonReentrant {
        HighestBid storage highestBid = highestBids[_garmentTokenId];

        // TODO add hold time for bidder cannot withdraw there bid quickly

        // Ensure highest bidder is the caller
        require(highestBid.bidder == _msgSender(), "DigitalaxAuction.withdrawBid: You are not the highest bidder");

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
     @notice Results a finished auction, sending the token to the winner, sending all funds to the original designer
     @dev Only admin
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function resultAuction(uint256 _garmentTokenId) external nonReentrant {

        // TODO check this should be admin and smart contract role check
        // Admin only resulting function
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.resultAuction: Sender must be admin");

        // Check the auction to see if it can be resulted
        Auction storage auction = auctions[_garmentTokenId];

        // FIXME AMG - drop this require as the next one will do the job?
        // Check the auction real
        require(auction.lister != address(0), "DigitalaxAuction.resultAuction: Auction does not exist");

        // Check the auction has ended
        require(_getNow() > auction.endTime, "DigitalaxAuction.resultAuction: The auction has not ended");

        // Ensure auction not already resulted
        require(!auction.resulted, "DigitalaxAuction.resultAuction: auction already resulted");

        // Result the auction
        auctions[_garmentTokenId].resulted = true;

        // Get info on who the highest bidder is
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        address winner = highestBid.bidder;
        uint256 winningBid = highestBid.bid;

        // Ensure there is a winner
        require(winner != address(0), "DigitalaxAuction.resultAuction: No one has bid");

        // FIXME check to ensure reserve is met

        // Clean up the highest winner
        delete highestBids[_garmentTokenId];

        // FIXME delete auction too (maybe)?

        // TODO check this feature against the spec? Does this need to be on-chain?
        // Record the primary sale price for the garment
        garmentNft.setPrimarySalePrice(_garmentTokenId, winningBid);

        // Send the designer their earnings
        (bool designerTransferSuccess,) = garmentNft.garmentDesigners(_garmentTokenId).call{value : winningBid}("");
        require(designerTransferSuccess, "DigitalaxAuction.resultAuction: Failed to send the designer their royalties");

        // TODO use safeTransferFrom
        // Transfer the token to the winner
        garmentNft.transferFrom(address(this), winner, _garmentTokenId);

        emit AuctionResulted(_garmentTokenId, winner, winningBid);
    }

    /**
     @notice Cancels and inflight and un-resulted auctions, returning the funds to the top bidder if found and sending the token back to the lister
     @dev Only admin
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function cancelAuction(uint256 _garmentTokenId) external nonReentrant {
        // TODO check this should be admin and smart contract role check
        // Admin only resulting function
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.cancelAuction: Sender must be admin");

        // Check valid and not resulted
        Auction storage auction = auctions[_garmentTokenId];

        // Check auction is real
        require(auction.lister != address(0), "DigitalaxAuction.cancelAuction: Auction does not exist");

        // Check auction not already resulted
        require(!auction.resulted, "DigitalaxAuction.cancelAuction: auction already resulted");

        // refund existing top bidder if found
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        if (highestBid.bidder != address(0)) {
            _refundHighestBidder(highestBid.bidder, highestBid.bid);

            // Clear up highest bid
            delete highestBids[_garmentTokenId];
        }

        // Transfer the token back to the lister
        garmentNft.transferFrom(address(this), auction.lister, _garmentTokenId);

        // Remove auction and top bidder
        delete auctions[_garmentTokenId];

        emit AuctionCancelled(_garmentTokenId);
    }

    /**
     @notice Update the amount by which bids have to increase, across all auctions
     @dev Only admin
     @param _minBidIncrement New bid step in WEI
     */
    function updateMinBidIncrement(uint256 _minBidIncrement) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.updateMinBidIncrement: Sender must be admin");
        minBidIncrement = _minBidIncrement;
    }

    /**
     @notice Update the current reserve price for an auction
     @dev Only admin
     @param _garmentTokenId Token ID of the garment being auctioned
     @param _reservePrice New Ether reserve price (WEI value)
     */
    function updateAuctionReservePrice(uint256 _garmentTokenId, uint256 _reservePrice) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.updateAuctionReservePrice: Sender must be admin");
        auctions[_garmentTokenId].reservePrice = _reservePrice;
    }

    /**
     @notice Update the current start time for an auction
     @dev Only admin
     @param _garmentTokenId Token ID of the garment being auctioned
     @param _startTime New start time (unix epoch in seconds)
     */
    function updateAuctionStartTime(uint256 _garmentTokenId, uint256 _startTime) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.updateAuctionStartTime: Sender must be admin");
        auctions[_garmentTokenId].startTime = _startTime;
    }

    /**
     @notice Update the current end time for an auction
     @dev Only admin
     @param _garmentTokenId Token ID of the garment being auctioned
     @param _endTime New end time (unix epoch in seconds)
     */
    function updateAuctionEndTime(uint256 _garmentTokenId, uint256 _endTime) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.updateAuctionEndTime: Sender must be admin");
        auctions[_garmentTokenId].endTime = _endTime;
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.updateAccessControls: Sender must be admin");
        accessControls = _accessControls;
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
    returns (uint256 _reservePrice, uint256 _startTime, uint256 _endTime, address _lister, bool _resulted) {
        Auction storage auction = auctions[_garmentTokenId];
        return (
        auction.reservePrice,
        auction.startTime,
        auction.endTime,
        auction.lister,
        auction.resulted
        );
    }

    /**
     @notice Method for getting all info about the highest bidder
     @param _garmentTokenId Token ID of the garment being auctioned
     */
    function getHighestBidder(uint256 _garmentTokenId) external view returns (address payable _bidder, uint256 _bid) {
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        return (
        highestBid.bidder,
        highestBid.bid
        );
    }

    /////////////////////////
    // Internal and Private /
    /////////////////////////

    function _getNow() internal virtual view returns (uint256) {
        return now;
    }

    /**
     @notice Used for sending back escrowed funds from a previous bid
     @param _currentHighestBidder Address of the last highest bidder
     @param _currentHighestBid Ether amount in WEI that the bidder sent when placing their bid
     */
    function _refundHighestBidder(address payable _currentHighestBidder, uint256 _currentHighestBid) private {
        // refund previous best (if bid exists)
        // FIXME this check is already being made or not required - drop
        if (_currentHighestBidder != address(0)) {
            (bool successRefund,) = _currentHighestBidder.call{value : _currentHighestBid}("");
            require(successRefund, "DigitalaxAuction._refundHighestBidder: failed to refund previous bidder");
            emit BidRefunded(_currentHighestBidder, _currentHighestBid);
        }
    }
}
