const {expectRevert, expectEvent, BN, ether} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxAuction = artifacts.require('DigitalaxAuctionMock');

contract('DigitalaxAuction', (accounts) => {
    const [admin, minter, owner, designer, bidder] = accounts;

    const TOKEN_ONE_ID = new BN('1');

    const randomTokenURI = 'rand';

    beforeEach(async () => {
        this.accessControls = await DigitalaxAccessControls.new({from: admin});
        await this.accessControls.addMinterRole(minter, {from: admin});

        this.token = await DigitalaxGarmentNFT.new(this.accessControls.address, {from: admin});
        this.auction = await DigitalaxAuction.new(
            this.accessControls.address,
            this.token.address,
            {from: admin}
        );

        await this.accessControls.addSmartContractRole(this.auction.address, {from: admin});
    });

    describe('Admin functions', () => {
       describe('Auction resulting', () => {
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

           it('Successfully results the auction', async () => {
               await this.auction.setNowOverride('12');
               const {receipt} = await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});
               await expectEvent(receipt, 'AuctionResulted', {
                   garmentTokenId: TOKEN_ONE_ID,
                   winner: bidder,
                   winningBid: ether('0.2')
               })
           });
       });

       describe('updateMinBidIncrement()', () => {});
       describe('updateAuctionReservePrice()', () => {});
       describe('updateAuctionStartTime()', () => {});
       describe('updateAuctionEndTime()', () => {});
       describe('updateAccessControls()', () => {});
    });
});
