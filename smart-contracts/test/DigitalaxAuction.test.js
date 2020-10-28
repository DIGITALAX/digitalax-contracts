const {expectRevert, expectEvent, BN, ether, constants} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxAuction = artifacts.require('DigitalaxAuctionMock');

contract('DigitalaxAuction', (accounts) => {
  const [admin, minter, owner, designer, bidder, bidder2] = accounts;

  const TOKEN_ONE_ID = new BN('1');

  const randomTokenURI = 'rand';

  beforeEach(async () => {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});

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

    this.auction = await DigitalaxAuction.new(
      this.accessControls.address,
      this.token.address,
      {from: admin}
    );

    await this.accessControls.addSmartContractRole(this.auction.address, {from: admin});
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
        expect(original).to.be.bignumber.equal(ether('0.01'));

        await this.auction.updateMinBidIncrement(ether('0.2'), {from: admin});

        const updated = await this.auction.minBidIncrement();
        expect(updated).to.be.bignumber.equal(ether('0.2'));
      });
    });

    describe('updateAuctionReservePrice()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.auction.updateAuctionReservePrice(TOKEN_ONE_ID, '1', {from: bidder}),
          'DigitalaxAuction.updateAuctionReservePrice: Sender must be admin'
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
      it('successfully updates access controls', async () => {
        const accessControlsV2 = await DigitalaxAccessControls.new({from: admin});

        const original = await this.auction.accessControls();
        expect(original).to.be.equal(this.accessControls.address);

        await this.auction.updateAccessControls(accessControlsV2.address, {from: admin});

        const updated = await this.auction.accessControls();
        expect(updated).to.be.equal(accessControlsV2.address);
      });
    });
  });

  describe('createAuction()', async () => {

    describe('validation', async () => {
      it('fails if does not have minter role', async () => {
        await expectRevert(
          this.auction.createAuction(TOKEN_ONE_ID, '1', '0', '10', {from: bidder}),
          'DigitalaxAuction.createAuction: Sender must have the minter role'
        );
      });

      it('fails if reserve is zero', async () => {
        await expectRevert(
          this.auction.createAuction(TOKEN_ONE_ID, '0', '0', '10', {from: minter}),
          'DigitalaxAuction.createAuction: Invalid reserve price'
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
        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
        await this.auction.createAuction(TOKEN_ONE_ID, '1', '0', '10', {from: minter});

        await expectRevert(
          this.auction.createAuction(TOKEN_ONE_ID, '1', '1', '3', {from: minter}),
          'DigitalaxAuction.createAuction: Cannot create an auction in the middle of another'
        );
      });

      it('fails if token does not exist', async () => {
        await this.auction.setNowOverride('10');

        await expectRevert(
          this.auction.createAuction(TOKEN_ONE_ID, '1', '1', '3', {from: minter}),
          'ERC721: operator query for nonexistent token'
        );
      });
    });

    describe('successful creation', async () => {
      it('Token transferred to the auction', async () => {
        await this.auction.setNowOverride('2');
        await this.token.mint(minter, randomTokenURI, designer, {from: minter});
        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});
        await this.auction.createAuction(TOKEN_ONE_ID, '1', '0', '10', {from: minter});

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(this.auction.address);
      });
    });

  });

  describe('placeBid()', async () => {

    describe('validation', () => {

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

      it('will fail with 721 token not on auction', async () => {
        await expectRevert(
          this.auction.placeBid(999, {from: bidder, value: 1}),
          'DigitalaxAuction.placeBid: Auction does not exist'
        );
      });

      it('will fail when auction not started', async () => {
        await this.auction.setNowOverride('0');
        await expectRevert(
          this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: 1}),
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

        const {_reservePrice, _startTime, _endTime} = await this.auction.getAuction(TOKEN_ONE_ID);
        expect(_reservePrice).to.be.bignumber.equal('1');
        expect(_startTime).to.be.bignumber.equal('1');
        expect(_endTime).to.be.bignumber.equal('10');
      });

      it('will refund the top bidder if found', async () => {
        await this.auction.setNowOverride('2');
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});

        const {_bidder: originalBidder, _bid: originalBid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(originalBid).to.be.bignumber.equal(ether('0.2'));
        expect(originalBidder).to.equal(bidder);

        // TODO validate money returned to top bidder

        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder2, value: ether('0.4')});

        const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
        expect(_bid).to.be.bignumber.equal(ether('0.4'));
        expect(_bidder).to.equal(bidder2);
      });
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

    it('successfully withdraw the bid', async () => {
      const {_bidder: originalBidder, _bid: originalBid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
      expect(originalBid).to.be.bignumber.equal(ether('0.2'));
      expect(originalBidder).to.equal(bidder);

      // TODO validate money returned to top bidder

      await this.auction.withdrawBid(TOKEN_ONE_ID, {from: bidder});

      const {_bidder, _bid} = await this.auction.getHighestBidder(TOKEN_ONE_ID);
      expect(_bid).to.be.bignumber.equal('0');
      expect(_bidder).to.equal(constants.ZERO_ADDRESS);
    });
  });

});
