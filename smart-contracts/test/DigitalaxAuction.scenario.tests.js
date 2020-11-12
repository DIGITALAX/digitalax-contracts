const {
  expectRevert,
  expectEvent,
  BN,
  ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');
const {expect} = require('chai');

const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');
const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxAuction = artifacts.require('DigitalaxAuctionMock');

const ERC1155Mock = artifacts.require('ERC1155Mock');

contract('DigitalaxAuction scenario tests', (accounts) => {
  const [admin, minter, owner, smartContract, platformFeeAddress, tokenHolder, designer, bidder, ...otherAccounts] = accounts;

  const EMPTY_BYTES = web3.utils.encodePacked('');

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
  const CHILD_FOUR_ID = new BN('4');

  const child1 = 'child1';
  const child2 = 'child2';
  const child3 = 'child3';
  const child4 = 'child4';

  const randomGarmentURI = 'randomGarmentURI';

  beforeEach(async () => {
    // Create children - creates 1155 token IDs: [1], [2], [3], [4]
    await this.factory.createNewChildren([child1, child2, child3, child4], {from: minter});
    expect(await this.digitalaxMaterials.uri(CHILD_ONE_ID)).to.be.equal(child1);
    expect(await this.digitalaxMaterials.uri(CHILD_TWO_ID)).to.be.equal(child2);
    expect(await this.digitalaxMaterials.uri(CHILD_THREE_ID)).to.be.equal(child3);

    // token 4 used as the attack token
    expect(await this.digitalaxMaterials.uri(CHILD_FOUR_ID)).to.be.equal(child4);

    // Create parent with children
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

  describe('scenario 1: happy path creation, auction and burn', async () => {

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

      describe('Given a user burns it', async () => {
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

      describe('Given user now tops up there existing child balances', async () => {

        // mint more balances of the children and send them to the new owner so they can topup
        beforeEach(async () => {

          // check balance are zero before
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_ONE_ID)).to.be.bignumber.equal('0');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_TWO_ID)).to.be.bignumber.equal('0');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_THREE_ID)).to.be.bignumber.equal('0');

          // send 5 tokens to the bidder
          await this.digitalaxMaterials.mintChild(CHILD_ONE_ID, '5', bidder, EMPTY_BYTES, {from: smartContract});
          await this.digitalaxMaterials.mintChild(CHILD_TWO_ID, '5', bidder, EMPTY_BYTES, {from: smartContract});
          await this.digitalaxMaterials.mintChild(CHILD_THREE_ID, '5', bidder, EMPTY_BYTES, {from: smartContract});

          // check balance are 5 for each type
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_ONE_ID)).to.be.bignumber.equal('5');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_TWO_ID)).to.be.bignumber.equal('5');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_THREE_ID)).to.be.bignumber.equal('5');
        });

        it('balances are updated', async () => {
          // Top up balances
          await this.digitalaxMaterials.safeTransferFrom(
            bidder, this.token.address, CHILD_ONE_ID, '5', web3.utils.encodePacked(TOKEN_ONE_ID),
            {from: bidder}
          );
          await this.digitalaxMaterials.safeTransferFrom(
            bidder, this.token.address, CHILD_TWO_ID, '5', web3.utils.encodePacked(TOKEN_ONE_ID),
            {from: bidder}
          );
          await this.digitalaxMaterials.safeTransferFrom(
            bidder, this.token.address, CHILD_THREE_ID, '5', web3.utils.encodePacked(TOKEN_ONE_ID),
            {from: bidder}
          );

          // check direct balance are now 0 for each type
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_ONE_ID)).to.be.bignumber.equal('0');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_TWO_ID)).to.be.bignumber.equal('0');
          expect(await this.digitalaxMaterials.balanceOf(bidder, CHILD_THREE_ID)).to.be.bignumber.equal('0');

          // Check token now owns them
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '6');
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_TWO_ID, '7');
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_THREE_ID, '8');
        });

        it('cannot top-up receive parent tokens is msg.data is not 32 bytes in size (boolean)', async () => {
          // give tokenHolder 5 children
          await this.digitalaxMaterials.mintChild(CHILD_ONE_ID, '5', tokenHolder, EMPTY_BYTES, {from: smartContract});
          expect(await this.digitalaxMaterials.balanceOf(tokenHolder, CHILD_ONE_ID)).to.be.bignumber.equal('5');

          const randomlyEncodedBoolean = web3.utils.encodePacked(true);
          await expectRevert(
            this.digitalaxMaterials.safeTransferFrom(
              tokenHolder, this.token.address, CHILD_ONE_ID, '5', randomlyEncodedBoolean,
              {from: tokenHolder}
            ),
            'ERC998: data must contain the unique uint256 tokenId to transfer the child token to'
          );

          // balances stay the same
          expect(await this.digitalaxMaterials.balanceOf(tokenHolder, CHILD_ONE_ID)).to.be.bignumber.equal('5');
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '1');
        });

        it('cannot top-up receive parent tokens is msg.data is not 32 bytes in size (random bytes)', async () => {
          await this.digitalaxMaterials.mintChild(CHILD_ONE_ID, '5', tokenHolder, EMPTY_BYTES, {from: smartContract});
          expect(await this.digitalaxMaterials.balanceOf(tokenHolder, CHILD_ONE_ID)).to.be.bignumber.equal('5');

          const randomBytes = web3.utils.padLeft('0x3456ff', 20);
          await expectRevert(
            this.digitalaxMaterials.safeTransferFrom(
              tokenHolder, this.token.address, CHILD_ONE_ID, '5', randomBytes,
              {from: tokenHolder}
            ),
            'ERC998: data must contain the unique uint256 tokenId to transfer the child token to'
          );

          // balances stay the same
          expect(await this.digitalaxMaterials.balanceOf(tokenHolder, CHILD_ONE_ID)).to.be.bignumber.equal('5');
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '1');
        });

        it('cannot top-up existing children to someone else parent', async () => {
          // give tokenHolder 5 children
          await this.digitalaxMaterials.mintChild(CHILD_ONE_ID, '5', tokenHolder, EMPTY_BYTES, {from: smartContract});
          expect(await this.digitalaxMaterials.balanceOf(tokenHolder, CHILD_ONE_ID)).to.be.bignumber.equal('5');

          // Attempt to top up the child balances of another user
          const bidderOwnedToken = web3.utils.encodePacked(TOKEN_ONE_ID);
          await expectRevert(
            this.digitalaxMaterials.safeTransferFrom(
              tokenHolder, this.token.address, CHILD_ONE_ID, '5', bidderOwnedToken,
              {from: tokenHolder}
            ),
            'Cannot add children to tokens you dont own'
          );

          // balances stay the same
          expect(await this.digitalaxMaterials.balanceOf(tokenHolder, CHILD_ONE_ID)).to.be.bignumber.equal('5');
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '1');
        });

        it('cannot top-up existing children to someone else parent even with approval', async () => {
          await this.digitalaxMaterials.setApprovalForAll(tokenHolder, true, {from: bidder});

          // Top up balances
          await expectRevert(
            this.digitalaxMaterials.safeTransferFrom(
              bidder, this.token.address, CHILD_ONE_ID, '5', web3.utils.encodePacked(TOKEN_ONE_ID),
              {from: tokenHolder}
            ),
            'Operator is not owner'
          );
        });

        it('cannot add new children from the materials contract to someone else parent', async () => {

          // give tokenHolder 5 children of a new token
          await this.digitalaxMaterials.mintChild(CHILD_FOUR_ID, '5', tokenHolder, EMPTY_BYTES, {from: smartContract});
          expect(await this.digitalaxMaterials.balanceOf(tokenHolder, CHILD_FOUR_ID)).to.be.bignumber.equal('5');

          // Attempt to top up the child balances of another user for a new token
          const bidderOwnedToken = web3.utils.encodePacked(TOKEN_ONE_ID);
          await expectRevert(
            this.digitalaxMaterials.safeTransferFrom(
              tokenHolder, this.token.address, CHILD_FOUR_ID, '5', bidderOwnedToken,
              {from: tokenHolder}
            ),
            'Cannot add children to tokens you dont own'
          );

          // balances stay the same
          expect(await this.digitalaxMaterials.balanceOf(tokenHolder, CHILD_FOUR_ID)).to.be.bignumber.equal('5');
          await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_FOUR_ID, '0');
        });

        it('cannot add new children from another 1155 token to another token', async () => {
          const anotherChildContract = await ERC1155Mock.new();

          const ANOTHER_TOKEN_ID = 1;

          // Bidder owns 5 1155s from another contract
          await anotherChildContract.mint(ANOTHER_TOKEN_ID, '3', {from: bidder});
          expect(await anotherChildContract.balanceOf(bidder, ANOTHER_TOKEN_ID)).to.be.bignumber.equal('3');

          // try send from another 1155 to the parent
          await expectRevert(
            anotherChildContract.safeTransferFrom(
              bidder, this.token.address, ANOTHER_TOKEN_ID, '3', web3.utils.encodePacked(TOKEN_ONE_ID),
              {from: bidder}
            ),
            'Invalid child token contract'
          );
        });
      });
    });
  });

  describe('scenario 3: happy path creation, can add additional children up to max children allowed', async () => {

    it('Garment and children are created', async () => {
      await expectEvent(this.receipt, 'GarmentCreated', {garmentTokenId: TOKEN_ONE_ID});
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '1');
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_TWO_ID, '2');
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_THREE_ID, '3');
    });

    beforeEach(async () => {
      // token holder owns the token
      expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.equal(tokenHolder);

      // Mint 10 more new tokens
      const newTokens = _.range(4, 14);
      await Promise.all(newTokens.map((tokenId) => {
        return Promise.all([
          this.digitalaxMaterials.createChild(`child-${tokenId}`, {from: smartContract}),
          this.digitalaxMaterials.mintChild(tokenId, '5', tokenHolder, EMPTY_BYTES, {from: smartContract})
        ]);
      }));

      // Check ownership
      await Promise.all(newTokens.map(async (tokenId) => {
        const balanceOf = await this.digitalaxMaterials.balanceOf(tokenHolder, tokenId);
        expect(balanceOf).to.be.bignumber.equal('5');
        return balanceOf;
      }));
    });

    it('should fail when trying to batch send more tokens than limit', async () => {
      const tokenId = web3.utils.encodePacked(TOKEN_ONE_ID);

      // Confirm 3 children
      let totalChildrenMapped = await this.token.totalChildrenMapped(TOKEN_ONE_ID);
      expect(totalChildrenMapped).to.be.bignumber.equal('3');

      // try move move than 10 children
      await expectRevert(
        this.digitalaxMaterials.safeBatchTransferFrom(
          tokenHolder,
          this.token.address,
          [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          tokenId,
          {from: tokenHolder}),
        'Cannot exceed max child token allocation'
      );

      // Check still 3
      totalChildrenMapped = await this.token.totalChildrenMapped(TOKEN_ONE_ID);
      expect(totalChildrenMapped).to.be.bignumber.equal('3');
    });

    it('is fine sending children up to the limit, after this it fails', async () => {
      const tokenId = web3.utils.encodePacked(TOKEN_ONE_ID);

      // Confirm 3 children
      let totalChildrenMapped = await this.token.totalChildrenMapped(TOKEN_ONE_ID);
      expect(totalChildrenMapped).to.be.bignumber.equal('3');

      // Add up to the limit
      await this.digitalaxMaterials.safeBatchTransferFrom(
        tokenHolder,
        this.token.address,
        [4, 5, 6, 7, 8, 9, 10],
        [1, 1, 1, 1, 1, 1, 1],
        tokenId,
        {from: tokenHolder});

      // Check now 10
      totalChildrenMapped = await this.token.totalChildrenMapped(TOKEN_ONE_ID);
      expect(totalChildrenMapped).to.be.bignumber.equal('10');

      // try move move 1 more to trigger the failure
      await expectRevert(
        this.digitalaxMaterials.safeTransferFrom(
          tokenHolder,
          this.token.address,
          11,
          1,
          tokenId,
          {from: tokenHolder}),
        'Cannot exceed max child token allocation'
      );

      // Check still 10
      totalChildrenMapped = await this.token.totalChildrenMapped(TOKEN_ONE_ID);
      expect(totalChildrenMapped).to.be.bignumber.equal('10');
    });

  });

  describe('scenario 4: topping up multiple children to a parent but the children are a mixture of new and old children', async () => {

    beforeEach(async () => {
      // token holder owns the token
      expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.equal(tokenHolder);

      // Mint 5 more NWT tokens
      const newTokens = _.range(4, 9);
      await Promise.all(newTokens.map((tokenId) => {
        return Promise.all([
          this.digitalaxMaterials.createChild(`child-${tokenId}`, {from: smartContract}),
          this.digitalaxMaterials.mintChild(tokenId, '5', tokenHolder, EMPTY_BYTES, {from: smartContract})
        ]);
      }));

      // Check ownership
      await Promise.all(newTokens.map(async (tokenId) => {
        const balanceOf = await this.digitalaxMaterials.balanceOf(tokenHolder, tokenId);
        expect(balanceOf).to.be.bignumber.equal('5');
        return balanceOf;
      }));

      // mint more tokens of existing children to the token holder
      this.digitalaxMaterials.mintChild(CHILD_ONE_ID, '5', tokenHolder, EMPTY_BYTES, {from: smartContract});
      this.digitalaxMaterials.mintChild(CHILD_TWO_ID, '5', tokenHolder, EMPTY_BYTES, {from: smartContract});
      this.digitalaxMaterials.mintChild(CHILD_THREE_ID, '5', tokenHolder, EMPTY_BYTES, {from: smartContract});
    });

    it('sending a mix of new and existing children', async () => {
      // confirm 3 child balances
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '1');
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_TWO_ID, '2');
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_THREE_ID, '3');

      // Check total children mapped is 3
      let totalChildrenMapped = await this.token.totalChildrenMapped(TOKEN_ONE_ID);
      expect(totalChildrenMapped).to.be.bignumber.equal('3');

      // send a mixture - 2 existing children and 2 new children
      await this.digitalaxMaterials.safeBatchTransferFrom(
        tokenHolder,
        this.token.address,
        [CHILD_ONE_ID, CHILD_TWO_ID, 4, 5],
        [1, 1, 1, 1],
        web3.utils.encodePacked(TOKEN_ONE_ID),
        {from: tokenHolder});

      // check 5 are now mapped
      totalChildrenMapped = await this.token.totalChildrenMapped(TOKEN_ONE_ID);
      expect(totalChildrenMapped).to.be.bignumber.equal('5');

      // Confirm balances updated accordingly
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_ONE_ID, '2');
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_TWO_ID, '3');
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, CHILD_THREE_ID, '3'); // no change
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, 4, '1');
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, 5, '1');
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

});
