const {
  expectRevert,
  expectEvent,
  BN,
  ether,
  constants,
  balance
} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');
const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxAuction = artifacts.require('DigitalaxAuctionMock');

contract('DigitalaxAuction scenario tests', (accounts) => {
  const [admin, minter, owner, smartContract, platformFeeAddress, tokenHolder, designer, bidder, ...otherAccounts] = accounts;

  beforeEach(async () => {
    // Setup access controls and enabled admin
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});
    await this.accessControls.addSmartContractRole(smartContract, {from: admin});

    // Setup child 1155 contract
    this.digitalaxMaterials = await DigitalaxMaterials.new(
      'DigitalaxMaterials',
      'DXM',
      this.accessControls.address,
      {from: owner}
    );

    // Setup parent 721 contract
    this.token = await DigitalaxGarmentNFT.new(
      this.accessControls.address,
      this.digitalaxMaterials.address,
      {from: admin}
    );

    // Setup auction
    this.auction = await DigitalaxAuction.new(
      this.accessControls.address,
      this.token.address,
      platformFeeAddress,
      {from: admin}
    );
    await this.accessControls.addSmartContractRole(this.auction.address, {from: admin});

    // Setup factory
    this.factory = await DigitalaxGarmentFactory.new(
      this.token.address,
      this.digitalaxMaterials.address,
      this.accessControls.address,
      {from: admin}
    );
    await this.accessControls.addSmartContractRole(this.factory.address, {from: admin});
  });

  const TOKEN_ONE_ID = new BN('1');

  const CHILD_ONE_ID = new BN('1');
  const CHILD_TWO_ID = new BN('2');
  const CHILD_THREE_ID = new BN('3');

  const child1 = 'child1';
  const child2 = 'child2';
  const child3 = 'child3';

  beforeEach(async () => {
    // Create children - creates 1155 token IDs: [1], [2], [3]
    await this.factory.createNewChildren([child1, child2, child3], {from: minter});
    expect(await this.digitalaxMaterials.uri(CHILD_ONE_ID)).to.be.equal(child1);
    expect(await this.digitalaxMaterials.uri(CHILD_TWO_ID)).to.be.equal(child2);
    expect(await this.digitalaxMaterials.uri(CHILD_THREE_ID)).to.be.equal(child3);
  });

  describe.only('scenario 1: happy path creation, auction and burn', async () => {
    const randomGarmentURI = 'randomGarmentURI';

    beforeEach(async () => {
      const {receipt} = await this.factory.mintParentWithChildren(
        randomGarmentURI,
        designer,
        [CHILD_ONE_ID, CHILD_TWO_ID, CHILD_THREE_ID],
        [1, 2, 3],
        tokenHolder,
        {from: minter}
      );
      this.receipt = receipt;
    });

    it('Garment and children are created', async () => {
      await expectEvent(this.receipt, 'GarmentCreated', {garmentTokenId: TOKEN_ONE_ID});
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '1');
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_TWO_ID, '2');
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_THREE_ID, '3');
    });

    describe('Given an auction', async () => {

      beforeEach(async () => {
        // Give token holder minter role to setup an auction and approve auction
        await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: tokenHolder});
        await this.accessControls.addMinterRole(tokenHolder, {from: admin});

        // Create auction
        await this.auction.setNowOverride('2');
        await this.auction.createAuction(
          TOKEN_ONE_ID,
          '1',
          '0',
          '10',
          {from: tokenHolder}
        );

        // Place bid
        await this.auction.placeBid(TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
        await this.auction.setNowOverride('12');

        // Result it
        const {receipt} = await this.auction.resultAuction(TOKEN_ONE_ID, {from: admin});
        this.receipt = receipt;
      });

      it('the auction is resulted properly and token ownership assigned', async () => {
        await expectEvent(this.receipt, 'AuctionResulted', {
          garmentTokenId: TOKEN_ONE_ID,
          winner: bidder,
          winningBid: ether('0.2')
        });

        // top bidder now owns token
        expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.equal(bidder);

        // Token still owns children
        await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '1');
        await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_TWO_ID, '2');
        await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_THREE_ID, '3');
      });

      describe('Given user burns it', async () => {
        it('user destroys parent token and is assigned the composite children', async () => {

          // check balance are zero before burn
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_ONE_ID)).to.be.bignumber.equal('0');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_TWO_ID)).to.be.bignumber.equal('0');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_THREE_ID)).to.be.bignumber.equal('0');

          // bidder burns token to get at the 1155s
          await this.token.burn(TOKEN_ONE_ID, {from: bidder});

          // Token now burnt
          expect(await this.token.exists(TOKEN_ONE_ID)).to.equal(false);
          await expectRevert(
            this.token.tokenURI(TOKEN_ONE_ID), 'ERC721Metadata: URI query for nonexistent token',
          );

          // Token no long owns any balances
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '0');
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_TWO_ID, '0');
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_THREE_ID, '0');

          // check owner now owns tokens
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_ONE_ID)).to.be.bignumber.equal('1');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_TWO_ID)).to.be.bignumber.equal('2');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_THREE_ID)).to.be.bignumber.equal('3');
        });
      });

    });
  });

  describe('scenario 2: happy path creation, auction and increasing balance post purchase', async () => {

    beforeEach(async () => {

    });

  });

  describe('scenario 3: happy path creation, auction and additional children added', async () => {

    beforeEach(async () => {

    });

  });

  const expectStrandBalanceOfGarmentToBe = async (garmentTokenId, strandId, expectedStrandBalance) => {
    const garmentStrandBalance = await this.token.childBalance(
      garmentTokenId,
      this.digitalaxMaterials.address,
      strandId
    );
    expect(garmentStrandBalance).to.be.bignumber.equal(expectedStrandBalance);
  };

  const expectGarmentToOwnAGivenSetOfStrandIds = async (garmentId, childTokenIds) => {
    const garmentStrandIdsOwned = await this.token.childIdsForOn(
      garmentId,
      this.digitalaxMaterials.address
    );

    expect(garmentStrandIdsOwned.length).to.be.equal(childTokenIds.length);
    garmentStrandIdsOwned.forEach((strandId, idx) => {
      expect(strandId).to.be.bignumber.equal(childTokenIds[idx]);
    });
  };
});
