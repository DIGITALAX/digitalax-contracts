const {
  expectRevert,
  expectEvent,
  BN,
  ether,
  constants,
  balance,
  send
} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxAuction = artifacts.require('DigitalaxAuctionMock');
const DigitalaxAuctionReal = artifacts.require('DigitalaxAuction');
const BiddingContractMock = artifacts.require('BiddingContractMock');
const WethToken = artifacts.require('WethToken');

contract('DigitalaxAuction', (accounts) => {
  const [admin, smartContract, platformFeeAddress, minter, owner, designer, bidder, bidder2] = accounts;

  const TOKEN_ONE_ID = new BN('1');
  const TOKEN_TWO_ID = new BN('2');
  const TWENTY_TOKENS = new BN('20000000000000000000');

  const randomTokenURI = 'rand';

  beforeEach(async () => {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});
    await this.accessControls.addSmartContractRole(smartContract, {from: admin});

    this.digitalaxMaterials = await DigitalaxMaterials.new(
      'DigitalaxMaterials',
      'DXM',
      this.accessControls.address,
      {from: owner}
    );

    this.token = await DigitalaxGarmentNFT.new(
      this.accessControls.address,
      this.digitalaxMaterials.address,
      {from: admin}
    );

    this.weth = await WethToken.new(
        { from: minter }
    );

    this.auction = await DigitalaxAuction.new(
      this.accessControls.address,
      this.token.address,
      platformFeeAddress,
      {from: admin}
    );

    await this.accessControls.addSmartContractRole(this.auction.address, {from: admin});
  });

  describe('Contract deployment', () => {
    it('Reverts when access controls is zero', async () => {
      await expectRevert(
        DigitalaxAuction.new(
          constants.ZERO_ADDRESS,
          this.token.address,
          platformFeeAddress,
          {from: admin}
        ),
        "DigitalaxAuction: Invalid Access Controls"
      );
    });

    it('Reverts when garment is zero', async () => {
      await expectRevert(
        DigitalaxAuction.new(
          this.accessControls.address,
          constants.ZERO_ADDRESS,
          platformFeeAddress,
          {from: admin}
        ),
        "DigitalaxAuction: Invalid NFT"
      );
    });

    it('Reverts when platform fee recipient is zero', async () => {
      await expectRevert(
        DigitalaxAuction.new(
          this.accessControls.address,
          this.token.address,
          constants.ZERO_ADDRESS,
          {from: admin}
        ),
        "DigitalaxAuction: Invalid Platform Fee Recipient"
      );
    });
  });

  describe('Admin functions', () => {
    beforeEach(async () => {
      await this.token.mint(minter, randomTokenURI, designer, {from: minter});
      await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
      await this.auction.setNowOverride('2');
      await this.auction.createAuction(
        TOKEN_ONE_ID,
        '1',
        '0',
        '10',
        {from: minter}
      );
      await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
    });

    describe('Auction resulting', () => {
      it('Successfully results the auction', async () => {
        await this.auction.setNowOverride('12');

        const {receipt} = await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});

        await expectEvent(receipt, 'AuctionResulted', {
          garmentTokenId: TOKEN_ONE_ID,
          winner: bidder,
          winningBid: ether('0.2')
        });

        const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(_bid).to.be.bignumber.equal('0');
        expect(_bidder).to.equal(constants.ZERO_ADDRESS);

        const {_reservePrice, _startTime, _endTime, _resulted} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(_reservePrice).to.be.bignumber.equal('1');
        expect(_startTime).to.be.bignumber.equal('0');
        expect(_endTime).to.be.bignumber.equal('10');
        expect(_resulted).to.be.equal(true);
      });
    });

    describe('updateMinBidIncrement()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.auction.updateMinBidIncrement('1', {from: bidder}),
          'DigitalaxAuction.updateMinBidIncrement: Sender must be admin'
        );
      });
      it('successfully updates min bid', async () => {
        const original = await this.auction.minBidIncrement();
        expect(original).to.be.bignumber.equal(ether('0.1'));

        await this.auction.updateMinBidIncrement(ether('0.2'), {from: admin});

        const updated = await this.auction.minBidIncrement();
        expect(updated).to.be.bignumber.equal(ether('0.2'));
      });
    });

    describe('updateBidWithdrawalLockTime()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.auction.updateBidWithdrawalLockTime('1', {from: bidder}),
          'DigitalaxAuction.updateBidWithdrawalLockTime: Sender must be admin'
        );
      });
      it('successfully updates min bid', async () => {
        const original = await this.auction.bidWithdrawalLockTime();
        expect(original).to.be.bignumber.equal('1200');

        await this.auction.updateBidWithdrawalLockTime('123', {from: admin});

        const updated = await this.auction.bidWithdrawalLockTime();
        expect(updated).to.be.bignumber.equal('123');
      });
    });

    describe('updateAuctionReservePrice()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.auction.updateAuctionReservePrice(TOKEN_ONE_ID, '1', {from: bidder}),
          'DigitalaxAuction.updateAuctionReservePrice: Sender must be admin'
        );
      });

      it('fails when auction doesnt exist', async () => {
        await expectRevert(
          this.auction.updateAuctionReservePrice(TOKEN_TWO_ID, '1', {from: admin}),
          "DigitalaxAuction.updateAuctionReservePrice: No Auction exists"
        );
      });

      it('successfully updates auction reserve', async () => {
        let {_reservePrice} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(_reservePrice).to.be.bignumber.equal('1');

        await this.auction.updateAuctionReservePrice(TOKEN_ONE_ID, '2', {from: admin});

        let {_reservePrice: updateReservePrice} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(updateReservePrice).to.be.bignumber.equal('2');
      });
    });

    describe('updateAuctionStartTime()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.auction.updateAuctionStartTime(TOKEN_ONE_ID, '1', {from: bidder}),
          'DigitalaxAuction.updateAuctionStartTime: Sender must be admin'
        );
      });

      it('fails when auction does not exist', async () => {
        await expectRevert(
          this.auction.updateAuctionStartTime(TOKEN_TWO_ID, '1', {from: admin}),
          "DigitalaxAuction.updateAuctionStartTime: No Auction exists"
        );
      });

      it('successfully updates auction start time', async () => {
        let {_startTime} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(_startTime).to.be.bignumber.equal('0');

        await this.auction.updateAuctionStartTime(TOKEN_ONE_ID, '2', {from: admin});

        let {_startTime: updated} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(updated).to.be.bignumber.equal('2');
      });
    });

    describe('updateAuctionEndTime()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.auction.updateAuctionEndTime(TOKEN_ONE_ID, '1', {from: bidder}),
          'DigitalaxAuction.updateAuctionEndTime: Sender must be admin'
        );
      });

      it('fails when no auction exists', async () => {
        await expectRevert(
          this.auction.updateAuctionEndTime(TOKEN_TWO_ID, '1', {from: admin}),
          "DigitalaxAuction.updateAuctionEndTime: No Auction exists"
        );
      });

      it('fails when wnd time must be greater than start', async () => {
        this.auction.updateAuctionStartTime(TOKEN_ONE_ID, '10', {from: admin});
        await expectRevert(
          this.auction.updateAuctionEndTime(TOKEN_ONE_ID, '9', {from: admin}),
          'DigitalaxAuction.updateAuctionEndTime: End time must be greater than start'
        );
      });

      it('fails when end time has passed', async () => {
        await this.auction.setNowOverride('12');
        await expectRevert(
          this.auction.updateAuctionEndTime(TOKEN_ONE_ID, '11', {from: admin}),
          'DigitalaxAuction.updateAuctionEndTime: End time passed. Nobody can bid'
        );
      });

      it('successfully updates auction end time', async () => {
        let {_endTime} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(_endTime).to.be.bignumber.equal('10');

        await this.auction.updateAuctionEndTime(TOKEN_ONE_ID, '20', {from: admin});

        let {_endTime: updated} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(updated).to.be.bignumber.equal('20');
      });
    });

    describe('updateAccessControls()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.auction.updateAccessControls(this.accessControls.address, {from: bidder}),
          'DigitalaxAuction.updateAccessControls: Sender must be admin'
        );
      });

      it('reverts when trying to set recipient as ZERO address', async () => {
        await expectRevert(
          this.auction.updateAccessControls(constants.ZERO_ADDRESS, {from: admin}),
          'DigitalaxAuction.updateAccessControls: Zero Address'
        );
      });

      it('successfully updates access controls', async () => {
        const accessControlsV2 = await DigitalaxAccessControls.new({from: admin});

        const original = await this.auction.accessControls();
        expect(original).to.be.equal(this.accessControls.address);

        await this.auction.updateAccessControls(accessControlsV2.address, {from: admin});

        const updated = await this.auction.accessControls();
        expect(updated).to.be.equal(accessControlsV2.address);
      });
    });

    describe('updatePlatformFee()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.auction.updatePlatformFee('123', {from: bidder}),
          'DigitalaxAuction.updatePlatformFee: Sender must be admin'
        );
      });
      it('successfully updates access controls', async () => {
        const original = await this.auction.platformFee();
        expect(original).to.be.bignumber.equal('120');

        await this.auction.updatePlatformFee('999', {from: admin});

        const updated = await this.auction.platformFee();
        expect(updated).to.be.bignumber.equal('999');
      });
    });

    describe('updatePlatformFeeRecipient()', () => {
      it('reverts when not admin', async () => {
        await expectRevert(
          this.auction.updatePlatformFeeRecipient(owner, {from: bidder}),
          'DigitalaxAuction.updatePlatformFeeRecipient: Sender must be admin'
        );
      });

      it('reverts when trying to set recipient as ZERO address', async () => {
        await expectRevert(
          this.auction.updatePlatformFeeRecipient(constants.ZERO_ADDRESS, {from: admin}),
          'DigitalaxAuction.updatePlatformFeeRecipient: Zero address'
        );
      });

      it('successfully updates platform fee recipient', async () => {
        const original = await this.auction.platformFeeRecipient();
        expect(original).to.be.equal(platformFeeAddress);

        await this.auction.updatePlatformFeeRecipient(bidder2, {from: admin});

        const updated = await this.auction.platformFeeRecipient();
        expect(updated).to.be.equal(bidder2);
      });
    });

    describe('toggleIsPaused()', () => {
      it('can successfully toggle as admin', async () => {
        expect(await this.auction.isPaused()).to.be.false;

        const {receipt} = await this.auction.toggleIsPaused({from: admin});
        await expectEvent(receipt, 'PauseToggled', {
          isPaused: true
        });

        expect(await this.auction.isPaused()).to.be.true;
      })

      it('reverts when not admin', async () => {
        await expectRevert(
          this.auction.toggleIsPaused({from: bidder}),
          "DigitalaxAuction.toggleIsPaused: Sender must be admin"
        );
      })
    });
  });

  describe('createAuction()', async () => {

    describe('validation', async () => {
      beforeEach(async () => {
        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
      });

      it('fails if does not have minter role', async () => {
        await expectRevert(
          this.auction.createAuction(TOKEN_ONE_ID, '1', '0', '10', {from: bidder}),
          'DigitalaxAuction.createAuction: Sender must have the minter role'
        );
      });

      it('fails if endTime is in the past', async () => {
        await this.auction.setNowOverride('12');
        await expectRevert(
          this.auction.createAuction(TOKEN_ONE_ID, '1', '0', '10', {from: minter}),
          "DigitalaxAuction.createAuction: End time passed. Nobody can bid."
        );
      });

      it('fails if endTime greater than startTime', async () => {
        await this.auction.setNowOverride('2');
        await expectRevert(
          this.auction.createAuction(TOKEN_ONE_ID, '1', '1', '0', {from: minter}),
          'DigitalaxAuction.createAuction: End time must be greater than start'
        );
      });

      it('fails if token already has auction in play', async () => {
        await this.auction.setNowOverride('2');
        await this.auction.createAuction(TOKEN_ONE_ID, '1', '0', '10', {from: minter});

        await expectRevert(
          this.auction.createAuction(TOKEN_ONE_ID, '1', '1', '3', {from: minter}),
          'DigitalaxAuction.createAuction: Cannot relist'
        );
      });

      it('fails if you dont own the token', async () => {
        await this.auction.setNowOverride('2');
        await this.token.mint(bidder, randomTokenURI, designer, {from: minter});

        await this.auction.createAuction(TOKEN_ONE_ID, '1', '0', '10', {from: minter});

        await expectRevert(
          this.auction.createAuction(TOKEN_TWO_ID, '1', '1', '3', {from: minter}),
          'DigitalaxAuction.createAuction: Not owner and or contract not approved'
        );
      });

      it('fails if token does not exist', async () => {
        await this.auction.setNowOverride('10');

        await expectRevert(
          this.auction.createAuction('99', '1', '1', '11', {from: minter}),
          'ERC721: owner query for nonexistent token'
        );
      });

      it('fails if contract is paused', async () => {
        await this.auction.setNowOverride('2');
        await this.auction.toggleIsPaused({from: admin});
        await expectRevert(
          this.auction.createAuction(TOKEN_ONE_ID, '1', '0', '10', {from: minter}),
          "Function is currently paused"
        );
      });
    });

    describe('successful creation', async () => {
      it('Token retains in the ownership of the auction creator', async () => {
        await this.auction.setNowOverride('2');
        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
        await this.auction.createAuction(TOKEN_ONE_ID, '1', '0', '10', {from: minter});

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
    });

    describe('creating using real contract (not mock)', () => {
      it('can successfully create', async () => {
        const auction = await DigitalaxAuctionReal.new(
          this.accessControls.address,
          this.token.address,
          platformFeeAddress,
          {from: admin}
        );

        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.token.approve(auction.address, TOKEN_ONE_ID, {from: minter});
        await auction.createAuction(TOKEN_ONE_ID, '1', '0', '99999999999999', {from: minter});

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
    });
  });

  describe('createAuctionOnBehalfOfOwner()', () => {
    beforeEach(async () => {
      await this.auction.setNowOverride('2');
      await this.token.mint(minter, randomTokenURI, designer, {from: minter});
    });

    describe('validation', () => {
      it('fails when sender does not have admin or smart contract role', async () => {
        await expectRevert(
          this.auction.createAuctionOnBehalfOfOwner(TOKEN_ONE_ID, "0", "0", "10", {from: bidder}),
          "DigitalaxAuction.createAuctionOnBehalfOfOwner: Sender must have admin or smart contract role"
        );
      });

      it('fails when auction does not have approval for garment', async () => {
        await expectRevert(
          this.auction.createAuctionOnBehalfOfOwner(TOKEN_ONE_ID, "0", "0", "10", {from: admin}),
          "DigitalaxAuction.createAuctionOnBehalfOfOwner: Cannot create an auction if you do not have approval"
        );
      });
    });

    describe('successful creation', () => {
      beforeEach(async () => {
        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
      });

      const createAuctionOnBehalfOfOwnerGivenSenderIs = async (sender) => {
        const {receipt} = await this.auction.createAuctionOnBehalfOfOwner(TOKEN_ONE_ID, "0", "0", "10", {from: sender});

        await expectEvent(receipt, 'AuctionCreated', {
          garmentTokenId: TOKEN_ONE_ID
        });

        const {_reservePrice, _startTime, _endTime, _resulted} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(_reservePrice).to.be.bignumber.equal('0');
        expect(_startTime).to.be.bignumber.equal('0');
        expect(_endTime).to.be.bignumber.equal('10');
        expect(_resulted).to.be.equal(false);

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      };

      it('succeeds with admin role', async () => {
        await createAuctionOnBehalfOfOwnerGivenSenderIs(admin);
      });


      it('succeeds with smart contract role', async () => {
        await createAuctionOnBehalfOfOwnerGivenSenderIs(smartContract);
      });
    });
  });

  describe('placeBid()', async () => {

    describe('validation', () => {

      beforeEach(async () => {
        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.auction.setNowOverride('2');

        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
        await this.token.approve(this.auction.address, TOKEN_TWO_ID, {from: minter});
        await this.auction.createAuction(
          TOKEN_ONE_ID, // ID
          '1',  // reserve
          '1', // start
          '10', // end
          {from: minter}
        );
      });

      it('will revert if sender is smart contract', async () => {
        this.biddingContract = await BiddingContractMock.new(this.auction.address);
        await expectRevert(
          this.biddingContract.bid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')}),
          "DigitalaxAuction.placeBid: No contracts permitted"
        );
      });

      it('will fail with 721 token not on auction', async () => {
        await expectRevert(
          this.auction.placeBid(999, {from: bidder, value: 1}),
          'DigitalaxAuction.placeBid: Bidding outside of the auction window'
        );
      });

      it('will fail with valid token but no auction', async () => {
        await expectRevert(
          this.auction.placeBid(TOKEN_TWO_ID, {from: bidder, value: 1}),
          'DigitalaxAuction.placeBid: Bidding outside of the auction window'
        );
      });

      it('will fail when auction finished', async () => {
        await this.auction.setNowOverride('11');
        await expectRevert(
          this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: 1}),
          'DigitalaxAuction.placeBid: Bidding outside of the auction window'
        );
      });

      it('will fail when contract is paused', async () => {
        await this.auction.toggleIsPaused({from: admin});
        await expectRevert(
          this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('1.0')}),
          "Function is currently paused"
        );
      });

      it('will fail when outbidding someone by less than the increment', async () => {
        await this.auction.setNowOverride('2');
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

        await expectRevert(
          this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')}),
          'DigitalaxAuction.placeBid: Failed to outbid highest bidder'
        );
      });
    });

    describe('successfully places bid', () => {

      beforeEach(async () => {
        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
        await this.auction.setNowOverride('1');
        await this.auction.createAuction(
          TOKEN_ONE_ID, // ID
          '1',  // reserve
          '1', // start
          '10', // end
          {from: minter}
        );
      });

      it('places bid and you are the top owner', async () => {
        await this.auction.setNowOverride('2');
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

        const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(_bid).to.be.bignumber.equal(ether('0.2'));
        expect(_bidder).to.equal(bidder);

        const {_reservePrice, _startTime, _endTime, _resulted} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(_reservePrice).to.be.bignumber.equal('1');
        expect(_startTime).to.be.bignumber.equal('1');
        expect(_endTime).to.be.bignumber.equal('10');
        expect(_resulted).to.be.equal(false);
      });

      it('will refund the top bidder if found', async () => {
        await this.auction.setNowOverride('2');
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

        const {_bidder: originalBidder, _bid: originalBid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(originalBid).to.be.bignumber.equal(ether('0.2'));
        expect(originalBidder).to.equal(bidder);

        const bidderTracker = await balance.tracker(bidder);

        // make a new bid, out bidding the previous bidder
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder2, value: ether('0.4')});

        // Funds sent back to original bidder
        const changes = await bidderTracker.delta('wei');
        expect(changes).to.be.bignumber.equal(ether('0.2'));

        const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(_bid).to.be.bignumber.equal(ether('0.4'));
        expect(_bidder).to.equal(bidder2);
      });

      it('successfully increases bid', async () => {
        await this.auction.setNowOverride('2');

        const bidderTracker = await balance.tracker(bidder);
        const receipt = await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

        expect(await bidderTracker.delta()).to.be.bignumber.equal(ether('0.2').add(await getGasCosts(receipt)).mul(new BN('-1')));

        const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(_bid).to.be.bignumber.equal(ether('0.2'));
        expect(_bidder).to.equal(bidder);

        const receipt2 = await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('1')});

        // check that the bidder has only really spent 0.8 ETH plus gas due to 0.2 ETH refund
        expect(await bidderTracker.delta()).to.be.bignumber.equal((ether('1').sub(ether('0.2'))).add(await getGasCosts(receipt2)).mul(new BN('-1')));

        const {_bidder: newBidder, _bid: newBid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(newBid).to.be.bignumber.equal(ether('1'));
        expect(newBidder).to.equal(bidder);
      })

      it('successfully outbid bidder', async () => {
        await this.auction.setNowOverride('2');

        const bidderTracker = await balance.tracker(bidder);
        const bidder2Tracker = await balance.tracker(bidder2);

        // Bidder 1 makes first bid
        const receipt = await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
        expect(await bidderTracker.delta()).to.be.bignumber.equal(ether('0.2').add(await getGasCosts(receipt)).mul(new BN('-1')));
        const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(_bid).to.be.bignumber.equal(ether('0.2'));
        expect(_bidder).to.equal(bidder);

        // Bidder 2 outbids bidder 1
        const receipt2 = await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder2, value: ether('1')});

        // check that the bidder has only really spent 0.8 ETH plus gas due to 0.2 ETH refund
        expect(await bidder2Tracker.delta()).to.be.bignumber.equal(ether('1').add(await getGasCosts(receipt2)).mul(new BN('-1')));
        expect(await bidderTracker.delta()).to.be.bignumber.equal(ether('0.2'));

        const {_bidder: newBidder, _bid: newBid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(newBid).to.be.bignumber.equal(ether('1'));
        expect(newBidder).to.equal(bidder2);
      })
    });
  });

  describe('withdrawBid()', async () => {

    beforeEach(async () => {
      await this.token.mint(minter, randomTokenURI, designer, {from: minter});
      await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
      await this.auction.setNowOverride('2');
      await this.auction.createAuction(
        TOKEN_ONE_ID,
        '1',
        '0',
        '10',
        {from: minter}
      );
      await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
    });

    it('fails with withdrawing a bid which does not exist', async () => {
      await expectRevert(
        this.auction.withdrawBid(999, {from: bidder2}),
        'DigitalaxAuction.withdrawBid: You are not the highest bidder'
      );
    });

    it('fails with withdrawing a bid which you did not make', async () => {
      await expectRevert(
        this.auction.withdrawBid(TOKEN_ONE_ID, {from: bidder2}),
        'DigitalaxAuction.withdrawBid: You are not the highest bidder'
      );
    });

    it('fails with withdrawing when lockout time not passed', async () => {
      await this.auction.updateBidWithdrawalLockTime('6');
      await this.auction.setNowOverride('5');
      await expectRevert(
        this.auction.withdrawBid(TOKEN_ONE_ID, {from: bidder}),
        "DigitalaxAuction.withdrawBid: Cannot withdraw until lock time has passed"
      );
    });

    it('fails when withdrawing after auction end', async () => {
      await this.auction.setNowOverride('12');
      await this.auction.updateBidWithdrawalLockTime('0', {from: admin});
      await expectRevert(
        this.auction.withdrawBid(TOKEN_ONE_ID, {from: bidder}),
        "DigitalaxAuction.withdrawBid: Past auction end"
      );
    });

    it('fails when the contract is paused', async () => {
      const {_bidder: originalBidder, _bid: originalBid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
      expect(originalBid).to.be.bignumber.equal(ether('0.2'));
      expect(originalBidder).to.equal(bidder);

      const bidderTracker = await balance.tracker(bidder);

      // remove the withdrawal lock time for the test
      await this.auction.updateBidWithdrawalLockTime('0', {from: admin});

      await this.auction.toggleIsPaused({from: admin});
      await expectRevert(
        this.auction.withdrawBid(TOKEN_ONE_ID, {from: bidder}),
        "Function is currently paused"
      );
    });

    it('successfully withdraw the bid', async () => {
      const {_bidder: originalBidder, _bid: originalBid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
      expect(originalBid).to.be.bignumber.equal(ether('0.2'));
      expect(originalBidder).to.equal(bidder);

      const bidderTracker = await balance.tracker(bidder);

      // remove the withdrawal lock time for the test
      await this.auction.updateBidWithdrawalLockTime('0', {from: admin});

      const receipt = await this.auction.withdrawBid(TOKEN_ONE_ID, {from: bidder});

      // Funds sent back to original bidder, minus GAS costs
      const changes = await bidderTracker.delta('wei');
      expect(changes).to.be.bignumber.equal(
        ether('0.2').sub(await getGasCosts(receipt))
      );

      const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
      expect(_bid).to.be.bignumber.equal('0');
      expect(_bidder).to.equal(constants.ZERO_ADDRESS);
    });
  });

  describe('resultAuction()', async () => {

    describe('validation', () => {

      beforeEach(async () => {
        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
        await this.auction.setNowOverride('2');
        await this.auction.createAuction(
          TOKEN_ONE_ID,
          ether('1'),
          '0',
          '10',
          {from: minter}
        );
      });

      it('cannot result if not an admin', async () => {
        await expectRevert(
          this.auction.resultAuction(TOKEN_ONE_ID, {from: bidder}),
          'DigitalaxAuction.resultAuction: Sender must be admin or smart contract'
        );
      });

      it('cannot result if auction has not ended', async () => {
        await expectRevert(
          this.auction.resultAuction(TOKEN_ONE_ID, {from: admin}),
          'DigitalaxAuction.resultAuction: The auction has not ended'
        );
      });

      it('cannot result if auction does not exist', async () => {
        await expectRevert(
          this.auction.resultAuction(9999, {from: admin}),
          'DigitalaxAuction.resultAuction: Auction does not exist'
        );
      });

      it('cannot result if the auction is reserve not reached', async () => {
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: (await this.auction.minBidIncrement())});
        await this.auction.setNowOverride('12');
        await expectRevert(
          this.auction.resultAuction(TOKEN_ONE_ID, {from: admin}),
          'DigitalaxAuction.resultAuction: reserve not reached'
        );
      });

      it('cannot result if the auction has no winner', async () => {
        // Lower reserve to zero
        await this.auction.updateAuctionReservePrice(TOKEN_ONE_ID, '0', {from: admin});
        await this.auction.setNowOverride('12');
        await expectRevert(
          this.auction.resultAuction(TOKEN_ONE_ID, {from: admin}),
          'DigitalaxAuction.resultAuction: no open bids'
        );
      });

      it('cannot result if there is no approval', async () => {
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('1')});
        await this.auction.setNowOverride('12');

        await this.token.approve(constants.ZERO_ADDRESS, TOKEN_ONE_ID, {from: minter});

        await expectRevert(
          this.auction.resultAuction(TOKEN_ONE_ID, {from: admin}),
          "DigitalaxAuction.resultAuction: auction not approved"
        );
      });

      it('cannot result if the auction if its already resulted', async () => {
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('1')});
        await this.auction.setNowOverride('12');

        // result it
        await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});

        // try result it again
        await expectRevert(
          this.auction.resultAuction(TOKEN_ONE_ID, {from: admin}),
          'DigitalaxAuction.resultAuction: auction already resulted'
        );
      });
    });

    describe('successfully resulting an auction', async () => {

      beforeEach(async () => {
        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
        await this.auction.setNowOverride('2');
        await this.auction.createAuction(
          TOKEN_ONE_ID,
          ether('0.1'),
          '0',
          '10',
          {from: minter}
        );
      });

      it('transfer token to the winner', async () => {
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
        await this.auction.setNowOverride('12');

        expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.equal(minter);

        await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});

        expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.equal(bidder);
      });

      it('transfer funds to the token creator and platform', async () => {
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.4')});
        await this.auction.setNowOverride('12');

        const platformFeeTracker = await balance.tracker(platformFeeAddress);
        const designerTracker = await balance.tracker(designer);

        // Result it successfully
        await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});

        // Platform gets 12%
        const platformChanges = await platformFeeTracker.delta('wei');
        expect(platformChanges).to.be.bignumber.equal(
          (ether('0.4').sub(ether('0.1'))) // total minus reserve
            .div(new BN('1000'))
            .mul(new BN('120')) // only 12% of total
        );

        // Remaining funds sent to designer on completion
        const changes = await designerTracker.delta('wei');
        expect(changes).to.be.bignumber.equal(
          ether('0.4').sub(platformChanges)
        );
      });

      it('transfer funds to the token to only the creator when reserve meet directly', async () => {
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.1')});
        await this.auction.setNowOverride('12');

        const platformFeeTracker = await balance.tracker(platformFeeAddress);
        const designerTracker = await balance.tracker(designer);

        // Result it successfully
        await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});

        // Platform gets 12%
        const platformChanges = await platformFeeTracker.delta('wei');
        expect(platformChanges).to.be.bignumber.equal('0');

        // Remaining funds sent to designer on completion
        const changes = await designerTracker.delta('wei');
        expect(changes).to.be.bignumber.equal(
          ether('0.1')
        );
      });

      it('records primary sale price on garment NFT', async () => {
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.4')});
        await this.auction.setNowOverride('12');

        // Result it successfully
        await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});

        const primarySalePrice = await this.token.primarySalePrice(TOKEN_ONE_ID);
        expect(primarySalePrice).to.be.bignumber.equal(ether('0.4'));
      });

    });

  });

  describe('cancelAuction()', async () => {

    beforeEach(async () => {
      await this.token.mint(minter, randomTokenURI, designer, {from: minter});
      await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
      await this.auction.setNowOverride('2');
      await this.auction.createAuction(
        TOKEN_ONE_ID,
        '1',
        '0',
        '10',
        {from: minter}
      );
    });

    describe('validation', async () => {

      it('cannot cancel if not an admin', async () => {
        await expectRevert(
          this.auction.cancelAuction(TOKEN_ONE_ID, {from: bidder}),
          'DigitalaxAuction.cancelAuction: Sender must be admin or smart contract'
        );
      });

      it('cannot cancel if auction already cancelled', async () => {
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
        await this.auction.setNowOverride('12');

        await this.auction.cancelAuction(TOKEN_ONE_ID, {from: admin});

        await expectRevert(
          this.auction.cancelAuction(TOKEN_ONE_ID, {from: admin}),
          'DigitalaxAuction.cancelAuction: Auction does not exist'
        );
      });

      it('cannot cancel if auction already resulted', async () => {
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
        await this.auction.setNowOverride('12');

        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
        await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});

        await expectRevert(
          this.auction.cancelAuction(TOKEN_ONE_ID, {from: admin}),
          'DigitalaxAuction.cancelAuction: auction already resulted'
        );
      });

      it('cannot cancel if auction does not exist', async () => {
        await expectRevert(
          this.auction.cancelAuction(9999, {from: admin}),
          'DigitalaxAuction.cancelAuction: Auction does not exist'
        );
      });

      it('Can cancel as smart contract', async () => {
        // Stick a bid on it
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

        // Cancel it
        await this.auction.cancelAuction(TOKEN_ONE_ID, {from: smartContract});

        // Check auction cleaned up
        const {_reservePrice, _startTime, _endTime, _resulted} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(_reservePrice).to.be.bignumber.equal('0');
        expect(_startTime).to.be.bignumber.equal('0');
        expect(_endTime).to.be.bignumber.equal('0');
        expect(_resulted).to.be.equal(false);

        // Check auction cleaned up
        const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(_bid).to.be.bignumber.equal('0');
        expect(_bidder).to.equal(constants.ZERO_ADDRESS);
      });

      it('Cancel clears down auctions and top bidder', async () => {
        // Stick a bid on it
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

        // Cancel it
        await this.auction.cancelAuction(TOKEN_ONE_ID, {from: admin});

        // Check auction cleaned up
        const {_reservePrice, _startTime, _endTime, _resulted} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(_reservePrice).to.be.bignumber.equal('0');
        expect(_startTime).to.be.bignumber.equal('0');
        expect(_endTime).to.be.bignumber.equal('0');
        expect(_resulted).to.be.equal(false);

        // Check auction cleaned up
        const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(_bid).to.be.bignumber.equal('0');
        expect(_bidder).to.equal(constants.ZERO_ADDRESS);
      });

      it('funds are sent back to the highest bidder if found', async () => {
        // Stick a bid on it
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

        const bidderTracker = await balance.tracker(bidder);

        //cancel it
        await this.auction.cancelAuction(TOKEN_ONE_ID, {from: admin});

        // Funds sent back
        const changes = await bidderTracker.delta('wei');
        expect(changes).to.be.bignumber.equal(ether('0.2'));
      });

      it('no funds transferred if no bids', async () => {
        //cancel it
        await this.auction.cancelAuction(TOKEN_ONE_ID, {from: admin});
      });
    });

  });

  describe('create, cancel and re-create an auction', async () => {

    beforeEach(async () => {
      await this.token.mint(minter, randomTokenURI, designer, {from: minter});
      await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
      await this.auction.setNowOverride('2');
      await this.auction.createAuction(
        TOKEN_ONE_ID, // ID
        '1',  // reserve
        '1', // start
        '10', // end
        {from: minter}
      );
    });

    it('once created and then cancelled, can be created and resulted properly', async () => {

      // Stick a bid on it
      await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

      const bidderTracker = await balance.tracker(bidder);

      // Cancel it
      await this.auction.cancelAuction(TOKEN_ONE_ID, {from: admin});

      // Funds sent back to bidder
      const changes = await bidderTracker.delta('wei');
      expect(changes).to.be.bignumber.equal(ether('0.2'));

      // Check auction cleaned up
      const {_reservePrice, _startTime, _endTime, _resulted} = await this.auction.getAuction(TOKEN_ONE_ID);
      expect(_reservePrice).to.be.bignumber.equal('0');
      expect(_startTime).to.be.bignumber.equal('0');
      expect(_endTime).to.be.bignumber.equal('0');
      expect(_resulted).to.be.equal(false);

      // Crate new one
      await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
      await this.auction.createAuction(
        TOKEN_ONE_ID, // ID
        '1',  // reserve
        '1', // start
        '10', // end
        {from: minter}
      );

      // Check auction newly setup
      const {
        _reservePrice: newReservePrice,
        _startTime: newStartTime,
        _endTime: newEndTime,
        _resulted: newResulted
      } = await this.auction.getAuction(TOKEN_ONE_ID);
      expect(newReservePrice).to.be.bignumber.equal('1');
      expect(newStartTime).to.be.bignumber.equal('1');
      expect(newEndTime).to.be.bignumber.equal('10');
      expect(newResulted).to.be.equal(false);

      // Stick a bid on it
      await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

      await this.auction.setNowOverride('12');

      // Result it
      const {receipt} = await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});
      await expectEvent(receipt, 'AuctionResulted', {
        garmentTokenId: TOKEN_ONE_ID,
        winner: bidder,
        winningBid: ether('0.2')
      });

      await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: bidder});
      await expectRevert(
        this.auction.createAuctionOnBehalfOfOwner(
          TOKEN_ONE_ID, // ID
          '1',  // reserve
          '1', // start
          '13', // end
          {from: admin}
        ),
        "DigitalaxAuction.createAuction: Cannot relist"
      );
    });

  });

  describe('reclaimETH()', async () => {
    beforeEach(async () => {
      await this.token.mint(minter, randomTokenURI, designer, {from: minter});
      await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
      await this.auction.setNowOverride('2');
      await this.auction.createAuction(
          TOKEN_ONE_ID,
          '1',
          '0',
          '10',
          {from: minter}
      );
      await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
    });
    describe('validation', async () => {
      it('cannot reclaim eth if it is not Admin', async () => {
        await expectRevert(
            this.auction.reclaimETH( {from: bidder}),
            'DigitalaxAuction.reclaimETH: Sender must be admin'
        );
      });

      it('can reclaim Eth', async () => {
        const auctionBalanceTracker = await balance.tracker(this.auction.address, 'ether');
        const adminBalanceTracker = await balance.tracker(admin, 'ether');

        const adminBalanceBeforeReclaim = await adminBalanceTracker.get('ether');

        // Reclaim eth from contract
        await this.auction.reclaimETH({from: admin});

        expect((await auctionBalanceTracker.get('ether')).toString()).to.be.equal('0');

        // Admin receives eth minus gas fees.
        expect(await adminBalanceTracker.get('ether')).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
      });
    });
  });

  describe('reclaimERC20()', async () => {
    describe('validation', async () => {
      it('cannot reclaim erc20 if it is not Admin', async () => {
        await expectRevert(
            this.auction.reclaimERC20(this.weth.address, {from: bidder}),
            'DigitalaxAuction.reclaimERC20: Sender must be admin'
        );
      });

      it('can reclaim Erc20', async () => {
        // Send some wrapped eth
        await this.weth.transfer(this.auction.address, TWENTY_TOKENS, { from: minter });

        const adminBalanceBeforeReclaim = await this.weth.balanceOf(admin);
        expect(await this.weth.balanceOf(this.auction.address)).to.be.bignumber.equal(TWENTY_TOKENS);

        // Reclaim erc20 from contract
        await this.auction.reclaimERC20(this.weth.address, {from: admin});

        expect(await this.weth.balanceOf(this.auction.address)).to.be.bignumber.equal(new BN('0'));

        // Admin receives eth minus gas fees.
        expect(await this.weth.balanceOf(admin)).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
      });
    });
  });

  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
