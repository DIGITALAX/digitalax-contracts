// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DigitalaxAccessControls.sol";
import "./DigitalaxGarmentNFT.sol";

contract DigitalaxAuction is Context, ReentrancyGuard {
    using SafeMath for uint256;

    event AuctionCreated(uint256 indexed garmentTokenId);

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

    struct Auction {
        uint256 reservePrice;
        uint256 startTime;
        uint256 endTime;
    }

    struct HighestBid {
        address payable bidder;
        uint256 bid;
    }

    /// @notice Garment Token ID -> Auction info
    mapping(uint256 => Auction) public auctions;

    /// @notice Garment Token ID -> highest bidder info
    mapping(uint256 => HighestBid) public highestBids;

    DigitalaxAccessControls public accessControls;
    DigitalaxGarmentNFT public garmentNft;

    /// @notice globally and across all auctions, the amount by which a bid has to increase
    uint256 public minBidIncrement = 0.01 ether;

    constructor(DigitalaxAccessControls _accessControls, DigitalaxGarmentNFT _garmentNft) public {
        accessControls = _accessControls;
        garmentNft = _garmentNft;
    }

    function createAuction(
        uint256 _garmentTokenId,
        uint256 _reservePrice,
        uint256 _startTime,
        uint256 _endTime
    ) external {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "DigitalaxAuction.createAuction: Sender must have the minter role"
        );

        // FIXME allow zero price reserve - ensure other checks dont use zero as validation property

        require(_reservePrice > 0, "DigitalaxAuction.createAuction: Invalid reserve price");

        require(_endTime > _startTime, "DigitalaxAuction.createAuction: End time must be greater than start");

        require(
            _getNow() > auctions[_garmentTokenId].endTime,
            "DigitalaxAuction.createAuction: Cannot create an auction in the middle of another"
        );

        auctions[_garmentTokenId] = Auction({
        reservePrice : _reservePrice,
        startTime : _startTime,
        endTime : _endTime
        });

        // Escrow in NFT
        garmentNft.transferFrom(_msgSender(), address(this), _garmentTokenId);

        emit AuctionCreated(_garmentTokenId);
    }

    function placeBid(uint256 _garmentTokenId) external payable {
        // Check the auction to see if this is a valid bid
        Auction storage auction = auctions[_garmentTokenId];
        require(auction.endTime > 0, "DigitalaxAuction.placeBid: Auction does not exist");
        require(
            _getNow() >= auction.startTime && _getNow() <= auction.endTime,
            "DigitalaxAuction.placeBid: Bidding outside of the auction window"
        );

        uint256 bidAmount = msg.value;

        // check bid outbids someone else
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        uint256 minBidRequired = highestBid.bid.add(minBidIncrement);
        require(bidAmount >= minBidRequired, "DigitalaxAuction.placeBid: Failed to outbid highest bidder");

        // refund existing top bidder
        if (highestBid.bidder != address(0)) {
            _refundHighestBidder(highestBid.bidder, highestBid.bid);
        }

        // assign top bidder
        highestBid.bidder = _msgSender();
        highestBid.bid = bidAmount;

        emit BidPlaced(_garmentTokenId, _msgSender(), bidAmount);
    }

    function withdrawBid(uint256 _garmentTokenId) external nonReentrant {
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        require(highestBid.bidder == _msgSender(), "DigitalaxAuction.withdrawBid: You are not the highest bidder");

        uint256 previousBid = highestBid.bid;

        delete highestBids[_garmentTokenId];

        _refundHighestBidder(_msgSender(), previousBid);

        emit BidWithdrawn(_garmentTokenId, _msgSender(), previousBid);
    }

    //////////
    // Admin /
    //////////

    function resultAuction(uint256 _garmentTokenId) external nonReentrant {
        require(accessControls.hasAdminRole(_msgSender()), "DigitalaxAuction.resultAuction: Sender must be admin");

        // Check the auction to see if it can be resulted
        Auction storage auction = auctions[_garmentTokenId];
        require(auction.endTime > 0, "DigitalaxAuction.placeBid: Auction does not exist");
        require(
            _getNow() > auction.endTime,
            "DigitalaxAuction.resultAuction: The auction has not ended"
        );

        // Get info on who the highest bidder is
        HighestBid storage highestBid = highestBids[_garmentTokenId];
        address winner = highestBid.bidder;
        uint256 winningBid = highestBid.bid;

        require(winner != address(0), "DigitalaxAuction.resultAuction: No one has bid");

        // For future auctions on this token, clear down the highest bid info
        delete highestBids[_garmentTokenId];

        // Record the primary sale price for the garment
        garmentNft.setPrimarySalePrice(_garmentTokenId, winningBid);

        // Send the designer their earnings
        (bool designerTransferSuccess,) = garmentNft.garmentDesigners(_garmentTokenId).call{value : winningBid}("");
        require(designerTransferSuccess, "DigitalaxAuction.resultAuction: Failed to send the designer their royalties");

        garmentNft.transferFrom(address(this), winner, _garmentTokenId);

        emit AuctionResulted(_garmentTokenId, winner, winningBid);
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

    function getAuction(uint256 _garmentTokenId) external view returns (uint256 _reservePrice, uint256 _startTime, uint256 _endTime) {
        Auction storage auction = auctions[_garmentTokenId];
        return (
        auction.reservePrice,
        auction.startTime,
        auction.endTime
        );
    }

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
        if (_currentHighestBidder != address(0)) {
            (bool successRefund,) = _currentHighestBidder.call{value : _currentHighestBid}("");
            require(successRefund, "DigitalaxAuction._refundHighestBidder: failed to refund previous bidder");
            emit BidRefunded(_currentHighestBidder, _currentHighestBid);
        }
    }
}
