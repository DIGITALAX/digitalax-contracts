const {
  expectRevert,
  expectEvent,
  BN,
  ether,
  send,
  constants,
  balance
} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxGarmentCollection = artifacts.require('DigitalaxGarmentCollection');
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');
const DigitalaxMarketplace = artifacts.require('DigitalaxMarketplaceMock');
const DigitalaxMarketplaceReal = artifacts.require('DigitalaxMarketplace');
const MockERC20 = artifacts.require('MockERC20');
const MarketplaceBuyingContractMock = artifacts.require('MarketplaceBuyingContractMock');
const UniswapPairOracle_MONA_WETH = artifacts.require('UniswapPairOracle_MONA_WETH');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const WethToken = artifacts.require('WethToken');

// 1,000 * 10 ** 18
const ONE_THOUSAND_TOKENS = '1000000000000000000000';
const TWO_HUNDRED_TOKENS = new BN('200000000000000000000');
const TWENTY_TOKENS = new BN('20000000000000000000');
const TWO_ETH = ether('2');

contract('DigitalaxMarketplace', (accounts) => {
  const [admin, smartContract, platformFeeAddress, minter, owner, designer, tokenBuyer, newRecipient] = accounts;

  const TOKEN_ONE_ID = new BN('1');
  const TOKEN_TWO_ID = new BN('2');
  const COLLECTION_SIZE = new BN('10');

  const randomTokenURI = 'rand';
  const randomChildTokenURIs = ['randChild1', "randChild2"];
  const amountsOfChildToken = [new BN('1'), new BN('1')]
  const STRAND_ONE_ID = new BN('1');
  const STRAND_TWO_ID = new BN('2');
  const erc1155ChildStrandIds = [STRAND_ONE_ID, STRAND_TWO_ID];

  const auctionID = new BN('0');

  beforeEach(async () => {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});
    await this.accessControls.addSmartContractRole(smartContract, {from: admin});

    this.monaToken = this.token = await MockERC20.new(
        'MONA',
        'MONA',
        ONE_THOUSAND_TOKENS,
        {from: tokenBuyer}
    );

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

    this.factory = await UniswapV2Factory.new(
      owner, 
      { from: owner }
    );

    this.weth = await WethToken.new(
      { from: minter }
    );

    this.monaWETH = await UniswapV2Pair.at(
        (await this.factory.createPair(this.monaToken.address, this.weth.address)).logs[0].args.pair
    );
    await this.weth.transfer(this.monaWETH.address, TWENTY_TOKENS, { from: minter });
    await this.monaToken.transfer(this.monaWETH.address, TWO_HUNDRED_TOKENS, { from: tokenBuyer });
    await this.monaWETH.mint(minter);

    this.router02 = await UniswapV2Router02.new(
      this.factory.address,
      this.weth.address
    );

    this.oracle = await UniswapPairOracle_MONA_WETH.new(
      this.factory.address,
      this.monaToken.address,
      this.weth.address
    );

    this.garmentCollection = await DigitalaxGarmentCollection.new(
      this.accessControls.address,
      this.token.address,
      this.digitalaxMaterials.address,
    );
    await this.accessControls.addMinterRole(this.garmentCollection.address, {from: admin});
    await this.accessControls.addSmartContractRole(this.garmentCollection.address, {from: admin});

    this.garmentFactory = await DigitalaxGarmentFactory.new(
        this.token.address,
        this.digitalaxMaterials.address,
        this.accessControls.address,
        {from: admin}
    );

    this.marketplace = await DigitalaxMarketplace.new(
      this.accessControls.address,
      this.token.address,
      this.garmentCollection.address,
      this.oracle.address,
      platformFeeAddress,
      this.monaToken.address,
      this.weth.address,
      {from: admin}
    );

    this.monaToken.approve(this.marketplace.address, ONE_THOUSAND_TOKENS);

    await this.accessControls.addSmartContractRole(this.marketplace.address, {from: admin});

    await this.accessControls.addSmartContractRole(this.garmentFactory.address, {from: admin});
    // Create some ERC1155's for use here
    await this.garmentFactory.createNewChildren(randomChildTokenURIs, {from: minter});
  });

  describe('Contract deployment', () => {
    it('Reverts when access controls is zero', async () => {
      await expectRevert(
        DigitalaxMarketplace.new(
          constants.ZERO_ADDRESS,
          this.token.address,
          this.garmentCollection.address,
          this.oracle.address,
          platformFeeAddress,
          this.monaToken.address,
          this.weth.address,
          {from: admin}
        ),
        "DigitalaxMarketplace: Invalid Access Controls"
      );
    });

    it('Reverts when garment is zero', async () => {
      await expectRevert(
        DigitalaxMarketplace.new(
          this.accessControls.address,
          constants.ZERO_ADDRESS,
          this.garmentCollection.address,
          this.oracle.address,
          platformFeeAddress,
          this.monaToken.address,
          this.weth.address,
          {from: admin}
        ),
        "DigitalaxMarketplace: Invalid NFT"
      );
    });

    it('Reverts when swap maker contract address is zero', async () => {
      await expectRevert(
        DigitalaxMarketplace.new(
          this.accessControls.address,
          this.token.address,
          constants.ZERO_ADDRESS,
          this.oracle.address,
          platformFeeAddress,
          this.monaToken.address,
          this.weth.address,
          {from: admin}
        ),
        "DigitalaxMarketplace: Invalid Collection"
      );
    });

    it('Reverts when platform fee recipient is zero', async () => {
      await expectRevert(
        DigitalaxMarketplace.new(
          this.accessControls.address,
          this.token.address,
          this.garmentCollection.address,
          this.oracle.address,
          constants.ZERO_ADDRESS,
          this.monaToken.address,
          this.weth.address,
          {from: admin}
        ),
        "DigitalaxMarketplace: Invalid Platform Fee Recipient"
      );
    });

    it('Reverts when mona token address is zero', async () => {
      await expectRevert(
        DigitalaxMarketplace.new(
          this.accessControls.address,
          this.token.address,
          this.garmentCollection.address,
          this.oracle.address,
          platformFeeAddress,
          constants.ZERO_ADDRESS,
          this.weth.address,
          {from: admin}
        ),
        "DigitalaxMarketplace: Invalid ERC20 Token"
      );
    });
    
  });

  describe('Admin functions', () => {
    beforeEach(async () => {
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
      const garmentIds = await this.garmentCollection.getTokenIds(0);
      for (let i = 0; i < garmentIds.length; i ++) {
        await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
      }
      //await this.garmentCollection.approve(this.marketplace.address, TOKEN_ONE_ID, {from: minter});
      await this.marketplace.setNowOverride('2');
      await this.marketplace.createOffer(
        0,
        ether('0.1'),  // Price of 1 eth
          '1',
        {from: minter}
      );
    });

    describe('updateMarketplacePlatformFee()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.marketplace.updateMarketplacePlatformFee(200, {from: tokenBuyer}),
          'DigitalaxMarketplace.updateMarketplacePlatformFee: Sender must be admin'
        );
      });
      it('fails when less than the discount', async () => {
        const discount = await this.marketplace.discountToPayERC20();
        expect(discount).to.be.bignumber.equal('20');
        await expectRevert(
          this.marketplace.updateMarketplacePlatformFee(10, {from: admin}),
          'DigitalaxMarketplace.updateMarketplacePlatformFee: Discount cannot be greater then fee'
        );
      });
      it('successfully updates platform fee', async () => {
        const original = await this.marketplace.platformFee();
        expect(original).to.be.bignumber.equal('120');

        await this.marketplace.updateMarketplacePlatformFee('200', {from: admin});

        const updated = await this.marketplace.platformFee();
        expect(updated).to.be.bignumber.equal('200');
      });
    });

    describe('updateMarketplaceDiscountToPayInErc20()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
            this.marketplace.updateMarketplaceDiscountToPayInErc20(10, {from: tokenBuyer}),
            'DigitalaxMarketplace.updateMarketplaceDiscountToPayInErc20: Sender must be admin'
        );
      });
      it('fails when more than the platform fee', async () => {
        const platformFee = await this.marketplace.platformFee();
        expect(platformFee).to.be.bignumber.equal('120');
        await expectRevert(
            this.marketplace.updateMarketplaceDiscountToPayInErc20(200, {from: admin}),
            'DigitalaxMarketplace.updateMarketplaceDiscountToPayInErc20: Discount cannot be greater then fee'
        );
      });
      it('successfully updates discount', async () => {
        const original = await this.marketplace.discountToPayERC20();
        expect(original).to.be.bignumber.equal('20');

        await this.marketplace.updateMarketplaceDiscountToPayInErc20(30, {from: admin});

        const updated = await this.marketplace.discountToPayERC20();
        expect(updated).to.be.bignumber.equal('30');
      });
    });

    describe('updateAccessControls()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
          this.marketplace.updateAccessControls(this.accessControls.address, {from: tokenBuyer}),
          'DigitalaxMarketplace.updateAccessControls: Sender must be admin'
        );
      });

      it('reverts when trying to set recipient as ZERO address', async () => {
        await expectRevert(
          this.marketplace.updateAccessControls(constants.ZERO_ADDRESS, {from: admin}),
          'DigitalaxMarketplace.updateAccessControls: Zero Address'
        );
      });

      it('successfully updates access controls', async () => {
        const accessControlsV2 = await DigitalaxAccessControls.new({from: admin});

        const original = await this.marketplace.accessControls();
        expect(original).to.be.equal(this.accessControls.address);

        await this.marketplace.updateAccessControls(accessControlsV2.address, {from: admin});

        const updated = await this.marketplace.accessControls();
        expect(updated).to.be.equal(accessControlsV2.address);
      });
    });

    describe('updatePlatformFeeRecipient()', () => {
      it('reverts when not admin', async () => {
        await expectRevert(
          this.marketplace.updatePlatformFeeRecipient(owner, {from: tokenBuyer}),
          'DigitalaxMarketplace.updatePlatformFeeRecipient: Sender must be admin'
        );
      });

      it('reverts when trying to set recipient as ZERO address', async () => {
        await expectRevert(
          this.marketplace.updatePlatformFeeRecipient(constants.ZERO_ADDRESS, {from: admin}),
          'DigitalaxMarketplace.updatePlatformFeeRecipient: Zero address'
        );
      });

      it('successfully updates platform fee recipient', async () => {
        const original = await this.marketplace.platformFeeRecipient();
        expect(original).to.be.equal(platformFeeAddress);

        await this.marketplace.updatePlatformFeeRecipient(newRecipient, {from: admin});

        const updated = await this.marketplace.platformFeeRecipient();
        expect(updated).to.be.equal(newRecipient);
      });
    });

    describe('toggleIsPaused()', () => {
      it('can successfully toggle as admin', async () => {
        expect(await this.marketplace.isPaused()).to.be.false;

        const {receipt} = await this.marketplace.toggleIsPaused({from: admin});
        await expectEvent(receipt, 'PauseToggled', {
          isPaused: true
        });

        expect(await this.marketplace.isPaused()).to.be.true;
      })

      it('reverts when not admin', async () => {
        await expectRevert(
          this.marketplace.toggleIsPaused({from: tokenBuyer}),
          "DigitalaxMarketplace.toggleIsPaused: Sender must be admin"
        );
      })
    });

    describe('toggleFreezeMonaERC20Payment()', () => {
      it('can successfully toggle as admin', async () => {
        expect(await this.marketplace.freezeMonaERC20Payment()).to.be.false;

        const {receipt} = await this.marketplace.toggleFreezeMonaERC20Payment({from: admin});
        await expectEvent(receipt, 'FreezeMonaERC20PaymentToggled', {
          freezeMonaERC20Payment: true
        });

        expect(await this.marketplace.freezeMonaERC20Payment()).to.be.true;
      })

      it('reverts when not admin', async () => {
        await expectRevert(
          this.marketplace.toggleFreezeMonaERC20Payment({from: tokenBuyer}),
          "DigitalaxMarketplace.toggleFreezeMonaERC20Payment: Sender must be admin"
        );
      })
    });

    describe('toggleFreezeETHPayment()', () => {
      it('can successfully toggle as admin', async () => {
        expect(await this.marketplace.freezeETHPayment()).to.be.false;

        const {receipt} = await this.marketplace.toggleFreezeETHPayment({from: admin});
        await expectEvent(receipt, 'FreezeETHPaymentToggled', {
          freezeETHPayment: true
        });

        expect(await this.marketplace.freezeETHPayment()).to.be.true;
      })

      it('reverts when not admin', async () => {
        await expectRevert(
          this.marketplace.toggleFreezeETHPayment({from: tokenBuyer}),
          "DigitalaxMarketplace.toggleFreezeETHPayment: Sender must be admin"
        );
      })
    });
  });

  describe('createOffer()', async () => {

    describe('validation', async () => {
      beforeEach(async () => {
        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
      });


      it('fails if token already has marketplace in play', async () => {
        await this.marketplace.setNowOverride('2');
        await this.marketplace.createOffer(0,  ether('0.1'), '1', {from: minter});

        await expectRevert(
          this.marketplace.createOffer(0,  ether('0.1'), '1', {from: minter}),
          'DigitalaxMarketplace.createOffer: Cannot duplicate current offer'
        );
      });

      it('fails if contract is paused', async () => {
        await this.marketplace.setNowOverride('2');
        await this.marketplace.toggleIsPaused({from: admin});
        await expectRevert(
           this.marketplace.createOffer('99', ether('0.1'), '1', {from: minter}),
          "Function is currently paused"
        );
      });

      it('fails if you try to create an offer with a non minter address', async () => {
        await this.marketplace.setNowOverride('2');
        await expectRevert(
           this.marketplace.createOffer('98', ether('0.05'), '1', {from: tokenBuyer}),
          "DigitalaxMarketplace.createOffer: Sender must have the minter or admin role"
        );
      });
    });

    describe('successful creation', async () => {
      it('Token retains in the ownership of the marketplace creator', async () => {
        await this.marketplace.setNowOverride('2');
        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
        await this.marketplace.createOffer(0, ether('0.1'), '1', {from: minter});

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
    });

    describe('creating using real contract (not mock)', () => {
      it('can successfully create', async () => {
        const marketplace = await DigitalaxMarketplaceReal.new(
          this.accessControls.address,
          this.token.address,
          this.garmentCollection.address,
          this.oracle.address,
          platformFeeAddress,
          this.monaToken.address,
          this.weth.address,
          {from: admin}
        );

        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(marketplace.address, garmentIds[i], {from: minter});
        }
        await marketplace.createOffer(0, ether('0.1'), '1', {from: minter});

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
    });
  });

  describe('buyOffer()', async () => {

    describe('validation', () => {

      beforeEach(async () => {
        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
        await this.marketplace.setNowOverride('2');

        await this.marketplace.createOffer(
          0, // ID
          ether('0.1'),
            '1',
          {from: minter}
        );
      });

      it('will revert if sender is smart contract', async () => {
        this.biddingContract = await MarketplaceBuyingContractMock.new(this.marketplace.address,
            {from: admin});
        await expectRevert(
          this.biddingContract.buyOfferWithEth(TOKEN_ONE_ID, {from: tokenBuyer, value: ether('0.1')}),
          "DigitalaxMarketplace.buyOffer: No contracts permitted"
        );
      });

      it('will fail when contract is paused', async () => {
        await this.marketplace.toggleIsPaused({from: admin});
        await expectRevert(
          this.marketplace.buyOffer(TOKEN_ONE_ID, false, {from: tokenBuyer, value: ether('1.0')}),
          "Function is currently paused"
        );
      });
    });

    describe('try to buy offer', () => {

      beforeEach(async () => {
        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', [], [], {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
        await this.marketplace.setNowOverride('1');
        await this.marketplace.createOffer(
          0, // ID
          ether('0.1'),
            '1',
          {from: minter}
        );
      });

      it('buys the offer', async () => {
        await this.marketplace.setNowOverride('2');
        await this.marketplace.buyOffer(0, false, {from: tokenBuyer, value: ether('0.1')});

        const {_primarySalePrice, _startTime, _availableAmount} = await this.marketplace.getOffer(0);
        expect(_primarySalePrice).to.be.bignumber.equal(ether('0.1'));
        expect(_startTime).to.be.bignumber.equal('1');
        expect(_availableAmount).to.be.bignumber.equal('9');
      });

      it('will fail if eth payments are frozen', async () => {
        await this.marketplace.setNowOverride('2');
        await this.marketplace.toggleFreezeETHPayment({from: admin});
        await expectRevert(
            this.marketplace.buyOffer(0, false, {from: tokenBuyer, value: ether('0.1')}),
            "DigitalaxMarketplace.buyOffer: eth payments currently frozen"
        );
        await this.marketplace.toggleFreezeETHPayment({from: admin});
      });

      it('will fail if we have not reached start time', async () => {
        await this.marketplace.setNowOverride('0');
        await expectRevert(
            this.marketplace.buyOffer(0, false, {from: tokenBuyer, value: ether('0.1')}),
            "DigitalaxMarketplace.buyOffer: Purchase outside of the offer window"
        );
      });

      it('will fail if mona erc20 payments are frozen', async () => {
        await this.marketplace.setNowOverride('2');
        await this.marketplace.toggleFreezeMonaERC20Payment({from: admin});
        await expectRevert(
            this.marketplace.buyOffer(0, true, {from: tokenBuyer}),
            "DigitalaxMarketplace.buyOffer: mona erc20 payments currently frozen"
        );
        await this.marketplace.toggleFreezeMonaERC20Payment({from: admin});
      });

      it('transfer funds to the token creator and platform', async () => {
        const platformFeeTracker = await balance.tracker(platformFeeAddress);
        const designerTracker = await balance.tracker(designer);
        
        await this.marketplace.buyOffer(0, false, {from: tokenBuyer, value: ether('0.1')});
        await this.marketplace.setNowOverride('12');
        // Platform gets 12%
        const platformChanges = await platformFeeTracker.delta('wei');
        expect(platformChanges).to.be.bignumber.equal(
          (ether('0.1')) // total minus reserve
            .div(new BN('1000'))
            .mul(new BN('120')) // only 12% of total
        );
      
        // Remaining funds sent to designer on completion
        const changes = await designerTracker.delta('wei');
        expect(changes).to.be.bignumber.equal(
          ether('0.1').sub(platformChanges)
        );
      });

      it('records primary sale price on garment NFT', async () => {
        await this.marketplace.buyOffer(0, false, {from: tokenBuyer, value: ether('0.4')});
        await this.marketplace.setNowOverride('12');

        const primarySalePrice = await this.token.primarySalePrice(1);
        expect(primarySalePrice).to.be.bignumber.equal(ether('0.1'));
      });

      it('transfer Mona only to the token creator and platform', async () => {
        const platformFeeTracker = await balance.tracker(platformFeeAddress);
        const designerTracker = await balance.tracker(designer);

        // 10 MONA for 1 ETH
        await this.weth.deposit({from: tokenBuyer, value: ether('20')})

        // We get a discount, so we only need 100 - 2 % of the MONA
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS.mul(new BN('0.98')), {from: tokenBuyer});

        await this.oracle.update();
        const amountOfMona = await this.marketplace.estimateMonaAmount(ether('0.1'));
        expect(amountOfMona).to.be.bignumber.equal(ether('1'));

        await this.marketplace.buyOffer(0, true, {from: tokenBuyer});
        await this.marketplace.setNowOverride('12');

        // Platform gets 12%
        const platformChanges = await platformFeeTracker.delta('wei');
        expect(platformChanges).to.be.bignumber.equal(ether('0')); // But no change in eth


        const designerChanges = await designerTracker.delta('wei');
        expect(designerChanges).to.be.bignumber.equal(ether('0')); // But no change in eth

        // Validate that the garment owner/designer received FEE * (100% minus platformFEE of 12%)
        expect(await this.monaToken.balanceOf(designer)).to.be.bignumber.equal(ether('0.88'));

        // Validate that the treasury wallet (platformFeeRecipient) received platformFee minus discount for paying in Mona
        // (so 12-2, is 10% of final fee is given to the platform recipient)
        expect(await this.monaToken.balanceOf(platformFeeAddress)).to.be.bignumber.equal(ether('0.1'));

      });
    });
  });

  describe('cancelOffer()', async () => {

    beforeEach(async () => {
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', [], [], {from: minter});
      const garmentIds = await this.garmentCollection.getTokenIds(0);
      for (let i = 0; i < garmentIds.length; i ++) {
        await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
      }
      await this.marketplace.setNowOverride('2');
      await this.marketplace.createOffer(
        0,
        ether('0.1'),
          '1',
        {from: minter}
      );
    });

    describe('validation', async () => {

      it('cannot cancel if not an admin', async () => {
        await expectRevert(
          this.marketplace.cancelOffer(0, {from: tokenBuyer}),
          'DigitalaxMarketplace.cancelOffer: Sender must be admin or minter contract'
        );
      });

      it('cannot cancel if marketplace does not exist', async () => {
        await expectRevert(
          this.marketplace.cancelOffer(9999, {from: admin}),
          'DigitalaxMarketplace.cancelOffer: Offer does not exist'
        );
      });

      it('can cancel an offer', async () => {
        const {receipt} = await this.marketplace.cancelOffer(0, {from: admin});
        await expectEvent(receipt, 'OfferCancelled', {
          garmentTokenId: (new BN('0'))
        });
      });
  });
  });

  describe('reclaimETH()', async () => {
    describe('validation', async () => {
      it('cannot reclaim eth if it is not Admin', async () => {
        await expectRevert(
          this.marketplace.reclaimETH( {from: tokenBuyer}),
          'DigitalaxMarketplace.reclaimETH: Sender must be admin'
        );
      });

      it('can reclaim Eth', async () => {
        await send.ether(tokenBuyer, this.marketplace.address, TWO_ETH); // Token buyer sends 2 random eth into contract
        const marketplaceBalanceTracker = await balance.tracker(this.marketplace.address, 'ether');
        const adminBalanceTracker = await balance.tracker(admin, 'ether');

        const adminBalanceBeforeReclaim = await adminBalanceTracker.get('ether');

        // Reclaim eth from contract
        await this.marketplace.reclaimETH({from: admin});

        expect(await marketplaceBalanceTracker.delta('ether')).to.be.bignumber.equal('-2');
        expect((await marketplaceBalanceTracker.get('ether')).toString()).to.be.equal('0');

        // Admin receives eth minus gas fees.
        expect(await adminBalanceTracker.get('ether')).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
      });
    });
  });

  describe('reclaimERC20()', async () => {
    describe('validation', async () => {
      it('cannot reclaim erc20 if it is not Admin', async () => {
        await expectRevert(
          this.marketplace.reclaimERC20(this.weth.address, {from: tokenBuyer}),
          'DigitalaxMarketplace.reclaimERC20: Sender must be admin'
        );
      });

      it('can reclaim Erc20', async () => {
        // Send some wrapped eth
        await this.weth.transfer(this.marketplace.address, TWENTY_TOKENS, { from: minter });

        const adminBalanceBeforeReclaim = await this.weth.balanceOf(admin);
        expect(await this.weth.balanceOf(this.marketplace.address)).to.be.bignumber.equal(TWENTY_TOKENS);

        // Reclaim erc20 from contract
        await this.marketplace.reclaimERC20(this.weth.address, {from: admin});

        expect(await this.weth.balanceOf(this.marketplace.address)).to.be.bignumber.equal(new BN('0'));

        // Admin receives eth minus gas fees.
        expect(await this.weth.balanceOf(admin)).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
      });
    });
  });

  describe('updateOfferPrimarySalePrice()', async () => {

    beforeEach(async () => {
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', [], [], {from: minter});
      const garmentIds = await this.garmentCollection.getTokenIds(0);
      for (let i = 0; i < garmentIds.length; i ++) {
        await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
      }
      await this.marketplace.setNowOverride('2');
      await this.marketplace.createOffer(
        0,
        ether('0.1'),
          '1',
        {from: minter}
      );
    });

    describe('validation', async () => {

      it('cannot update the offer primary sale price if not an admin', async () => {
        await expectRevert(
          this.marketplace.updateOfferPrimarySalePrice(0, ether('0.05'), {from: tokenBuyer}),
            'DigitalaxMarketplace.updateOfferPrimarySalePrice: Sender must be admin'
        );
      });

      it('can update the offer primary sale price', async () => {
        const {receipt} = await this.marketplace.updateOfferPrimarySalePrice(0, ether('0.05'), {from: admin});
        await expectEvent(receipt, 'UpdateOfferPrimarySalePrice', {
          garmentCollectionId: (new BN('0')),
          primarySalePrice: (ether('0.05'))
        });
      });
    });
  });

  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
