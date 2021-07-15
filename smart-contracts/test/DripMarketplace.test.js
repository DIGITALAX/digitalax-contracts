const {
  expectRevert,
  expectEvent,
  BN,
  ether,
  send,
  constants,
  balance,
  time
} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterialsV2 = artifacts.require('DigitalaxMaterialsV2');
const DigitalaxGarmentNFTv2 = artifacts.require('DigitalaxGarmentNFTv2');
const DigitalaxGarmentCollectionV2 = artifacts.require('DigitalaxGarmentCollectionV2');
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');
const DripMarketplace = artifacts.require('DripMarketplaceMock');
const DripMarketplaceReal = artifacts.require('DripMarketplace');
const DigitalaxMonaOracle = artifacts.require('DigitalaxMonaOracle');
const DripOracle = artifacts.require('DripOracle');
const MockERC20 = artifacts.require('MockERC20');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const WethToken = artifacts.require('WethToken');

// 1,000 * 10 ** 18
const ONE_THOUSAND_TOKENS = '1000000000000000000000';
const TWO_HUNDRED_TOKENS = new BN('200000000000000000000');
const TWENTY_TOKENS = new BN('20000000000000000000');
const TWO_ETH = ether('2');

contract('DripMarketplace', (accounts) => {
  const [admin, smartContract, platformFeeAddress, minter, owner, designer, tokenBuyer, newRecipient, provider] = accounts;

  const TOKEN_ONE_ID = new BN('100001');
  const TOKEN_TWO_ID = new BN('100002');
  const COLLECTION_SIZE = new BN('10');
  const MAX_SIZE = new BN('5');

  const randomTokenURI = 'rand';
  const randomChildTokenURIs = ['randChild1', "randChild2"];
  const amountsOfChildToken = [new BN('1'), new BN('1')]
  const STRAND_ONE_ID = new BN('100001');
  const STRAND_TWO_ID = new BN('100002');
  const erc1155ChildStrandIds = [STRAND_ONE_ID, STRAND_TWO_ID];

  const bundleID = new BN('0');
  const EXCHANGE_RATE = new BN('1000000000000000000');

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

    this.digitalaxMaterials = await DigitalaxMaterialsV2.new(
      'DigitalaxMaterialsV2',
      'DXM',
      this.accessControls.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
      {from: owner}
    );

    this.token = await DigitalaxGarmentNFTv2.new();
    await this.token.initialize(
      this.accessControls.address,
      this.digitalaxMaterials.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
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

    this.oracle = await DigitalaxMonaOracle.new(
        '86400',
        '120',
        '1',
        this.accessControls.address,
        {from: admin}
    );

    this.dripOracle = await DripOracle.new();
    await this.dripOracle.initialize(
        '86400',
        this.accessControls.address,
        {from: admin}
    );

    this.garmentCollection = await DigitalaxGarmentCollectionV2.new()
    await this.garmentCollection.initialize(
        this.accessControls.address,
        this.token.address,
        this.digitalaxMaterials.address,
    );

    await this.accessControls.addMinterRole(this.garmentCollection.address, {from: admin});
    await this.accessControls.addSmartContractRole(this.garmentCollection.address, {from: admin});

    this.garmentFactory = await DigitalaxGarmentFactory.new();
    this.garmentFactory.initialize(
        this.token.address,
        this.digitalaxMaterials.address,
        this.accessControls.address,
        {from: admin}
    );

    this.marketplace = await DripMarketplace.new();
    await this.marketplace.initialize(
      this.accessControls.address,
      this.token.address,
      this.garmentCollection.address,
        this.dripOracle.address,
      platformFeeAddress,
      this.weth.address,
        constants.ZERO_ADDRESS,
      {from: admin}
    );

    this.monaToken.approve(this.marketplace.address, ONE_THOUSAND_TOKENS);

    await this.accessControls.addSmartContractRole(this.marketplace.address, {from: admin});

    await this.accessControls.addSmartContractRole(this.garmentFactory.address, {from: admin});
    // Create some ERC1155's for use here
    await this.garmentFactory.createNewChildren(randomChildTokenURIs, {from: minter});

    await this.dripOracle.addProvider(provider, {from: admin})

    await this.dripOracle.addPayableTokensWithReports(
        [this.monaToken.address, "0x0000000000000000000000000000000000001010", this.weth.address],
        [EXCHANGE_RATE, EXCHANGE_RATE, EXCHANGE_RATE], {from: provider});
    await time.increase(time.duration.seconds(120));
  });

  describe('Admin functions', () => {
    beforeEach(async () => {
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
      const garmentIds = await this.garmentCollection.getTokenIds(0);
      for (let i = 0; i < garmentIds.length; i ++) {
        await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
      }
      //await this.garmentCollection.approve(this.marketplace.address, TOKEN_ONE_ID, {from: minter});
      await this.marketplace.setNowOverride('120');
      await this.marketplace.createOffer(
        0,
        ether('0.1'),  // Price of 0.1 eth
        '120',
        '1000000',
        '20',
        MAX_SIZE,
        {from: minter}
      );
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

      it('successfully updates max amount', async () => {

        const _maxAmount = await this.marketplace.getOfferMaxAmount(0);
        expect(_maxAmount).to.be.bignumber.equal(MAX_SIZE);

        await this.marketplace.updateOfferMaxAmount(0, 20, {from: admin});

        const _maxAmount2 = await this.marketplace.getOfferMaxAmount(0);
        expect(_maxAmount2).to.be.bignumber.equal(new BN('20'));
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

    describe('toggleFreezeERC20Payment()', () => {
      it('can successfully toggle as admin', async () => {
        expect(await this.marketplace.freezeERC20Payment()).to.be.false;

        const {receipt} = await this.marketplace.toggleFreezeERC20Payment({from: admin});
        await expectEvent(receipt, 'FreezeERC20PaymentToggled', {
          freezeERC20Payment: true
        });

        expect(await this.marketplace.freezeERC20Payment()).to.be.true;
      })

      it('reverts when not admin', async () => {
        await expectRevert(
          this.marketplace.toggleFreezeERC20Payment({from: tokenBuyer}),
          "DigitalaxMarketplace.toggleFreezeERC20Payment: Sender must be admin"
        );
      })
    });
  });

  describe('createOffer()', async () => {

    describe('validation', async () => {
      beforeEach(async () => {
        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
      });


      it('fails if token already has marketplace in play', async () => {
        await this.marketplace.setNowOverride('120');
        await this.marketplace.createOffer(0,  ether('0.1'), '120',
            '1000000', '20', MAX_SIZE, {from: minter});

        await expectRevert(
          this.marketplace.createOffer(0,  ether('0.1'), '120',
              '1000000', '20', MAX_SIZE, {from: minter}),
          'DigitalaxMarketplace.createOffer: Cannot duplicate current offer'
        );
      });

      it('fails if you try to create an offer with a non minter address', async () => {
        await this.marketplace.setNowOverride('120');
        await expectRevert(
           this.marketplace.createOffer('98', ether('0.05'), '120',
               '1000000', '20', MAX_SIZE, {from: tokenBuyer}),
          "DigitalaxMarketplace.createOffer: Sender must have the minter or admin role"
        );
      });
    });

    describe('successful creation', async () => {
      it('Token retains in the ownership of the marketplace creator', async () => {
        await this.marketplace.setNowOverride('120');
        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
        await this.marketplace.createOffer(0, ether('0.1'), '120',
            '1000000', '20', MAX_SIZE, {from: minter});

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
    });

    describe('creating using real contract (not mock)', () => {
      it('can successfully create', async () => {
        const marketplaceNew = await DripMarketplaceReal.new();
        await marketplaceNew.initialize(
          this.accessControls.address,
          this.token.address,
          this.garmentCollection.address,
          this.oracle.address,
          platformFeeAddress,
          this.monaToken.address,
            constants.ZERO_ADDRESS,
          {from: admin}
        );

        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(marketplaceNew.address, garmentIds[i], {from: minter});
        }
        await marketplaceNew.createOffer(0, ether('0.1'), '120',
            '1000000', '20', MAX_SIZE, {from: minter});

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
    });
  });

  describe('buyOffer()', async () => {
    describe('validation', () => {
      beforeEach(async () => {
        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
        await this.marketplace.setNowOverride('120');

        await this.marketplace.createOffer(
          0, // ID
          ether('0.1'),
          '120',
            '1000000',
          '20',
          MAX_SIZE,
          {from: minter}
        );
      });

      it('will fail when contract is paused', async () => {
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS, {from: tokenBuyer});
        await this.marketplace.toggleIsPaused({from: admin});
        await expectRevert(
          this.marketplace.buyOffer(TOKEN_ONE_ID, this.monaToken.address, 0,0, {from: tokenBuyer}),
          "Function is currently paused"
        );
      });
    });

    describe('try to buy offer', () => {

      beforeEach(async () => {
        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', [], [], {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
        await this.marketplace.setNowOverride('100');
        await this.marketplace.createOffer(
          0, // ID
          ether('0.1'),
          '120',
            '1000000',
          '20',
          MAX_SIZE,
          {from: minter}
        );
      });

      it('buys the offer', async () => {
        await this.marketplace.setNowOverride('120');
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS, {from: tokenBuyer});
        await this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer});
        const {_primarySalePrice, _startTime, _availableAmount, _discountToPayERC20} = await this.marketplace.getOffer(0);
        expect(_primarySalePrice).to.be.bignumber.equal(ether('0.1'));
        expect(_startTime).to.be.bignumber.equal('120');
        expect(_startTime).to.be.bignumber.equal('120');
        expect(_availableAmount).to.be.bignumber.equal('9');
        expect(_discountToPayERC20).to.be.bignumber.equal('20');
      });

      it('will fail when cooldown not reached', async () => {
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS, {from: tokenBuyer});
        await this.marketplace.setNowOverride('120');
        await this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer});
        await expectRevert(
            this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer}),
            "DigitalaxMarketplace.buyOffer: Cooldown not reached"
        );
      })

      it('will fail if mona payments are frozen', async () => {
        await this.marketplace.setNowOverride('120');
        await this.marketplace.toggleFreezeERC20Payment({from: admin});
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS, {from: tokenBuyer});
        await expectRevert(
            this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer}),
            "DigitalaxMarketplace.buyOffer: erc20 payments currently frozen"
        );
      });

      it('will fail if we have not reached start time', async () => {
        await this.marketplace.setNowOverride('120');
        await this.marketplace.updateOfferStartEndTime(0, '150', '1000', {from: admin});
        const {_primarySalePrice, _startTime, _endTime, _availableAmount, _discountToPayERC20} = await this.marketplace.getOffer(0);
        expect(_startTime).to.be.bignumber.equal('150');
        expect(_endTime).to.be.bignumber.equal('1000');
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS, {from: tokenBuyer});
        await expectRevert(
            this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer}),
            "DigitalaxMarketplace.buyOffer: Purchase outside of the offer window"
        );
      });

      it('will fail if erc20 payments are frozen', async () => {
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS, {from: tokenBuyer});
        await this.marketplace.setNowOverride('120');
        await this.marketplace.toggleFreezeERC20Payment({from: admin});
        await expectRevert(
            this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer}),
            "DigitalaxMarketplace.buyOffer: erc20 payments currently frozen"
        );
        await this.marketplace.toggleFreezeERC20Payment({from: admin});
      });

      it('records primary sale price on garment NFT', async () => {
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS, {from: tokenBuyer});
        await this.marketplace.setNowOverride('121');
        await this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer});

        const primarySalePrice = await this.token.primarySalePrice(100001);
        expect(primarySalePrice).to.be.bignumber.equal(ether('0.1'));
      });

      it('transfer Mona only to the token creator and platform', async () => {
        const platformFeeTracker = await balance.tracker(platformFeeAddress);
        const designerTracker = await balance.tracker(designer);

        // 1 MONA for 2 ETH
        await this.weth.deposit({from: tokenBuyer, value: ether('20')})

        // We get a discount, so we only need 100 - 2 % of the MONA
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS.mul(new BN('0.98')), {from: tokenBuyer});


        await this.marketplace.setNowOverride('121');
        await this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer});

        // Platform gets 12%
        const platformChanges = await platformFeeTracker.delta('wei');
        expect(platformChanges).to.be.bignumber.equal(ether('0')); // But no change in eth


        const designerChanges = await designerTracker.delta('wei');
        expect(designerChanges).to.be.bignumber.equal(ether('0')); // But no change in eth

        expect(await this.monaToken.balanceOf(designer)).to.be.bignumber.equal(new BN('0'));

        // Validate that the treasury wallet (platformFeeRecipient) received platformFee minus discount for paying in Mona
        // (so 12-2, is 10% of final fee is given to the platform recipient)
        expect(await this.monaToken.balanceOf(platformFeeAddress)).to.be.bignumber.equal(new BN('98000000000000000'));
      });

      it('transfer MATIC (ETH) only to the token designer and platform', async () => {
        const platformFeeTracker = await balance.tracker(platformFeeAddress);
        const designerTracker = await balance.tracker(designer);

        // We get a discount, so we only need 100 - 2 % of the MONA
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS.mul(new BN('0.98')), {from: tokenBuyer});


        await this.marketplace.setNowOverride('121');
        await this.marketplace.buyOffer(0,
            "0x0000000000000000000000000000000000001010", 0,0,
            {value: new BN('98000000000000000'), from: tokenBuyer});

        // Platform gets 12%
        const platformChanges = await platformFeeTracker.delta('wei');
        expect(platformChanges).to.be.bignumber.equal(new BN('98000000000000000')); // But no change in eth

        // Designer gets 88%
        const designerChanges = await designerTracker.delta('wei');
        expect(designerChanges).to.be.bignumber.equal(new BN('0')); // But no change in eth

        // No change in MONA
        expect(await this.monaToken.balanceOf(designer)).to.be.bignumber.equal(new BN('0'));

        // Validate that the treasury wallet (platformFeeRecipient) received platformFee minus discount for paying in Mona
        // (so 12-2, is 10% of final fee is given to the platform recipient)
        expect(await this.monaToken.balanceOf(platformFeeAddress)).to.be.bignumber.equal(new BN('0'));
      });
    });
  });

  describe('buyOffer() real values', async () => {
    describe('try to buy offer', () => {

      beforeEach(async () => {
        await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', [], [], {from: minter});
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
        await this.marketplace.setNowOverride('100');

        // 400$ mona, 1$ matic, 2000$ eth
        await this.dripOracle.pushReports(
            [this.monaToken.address, "0x0000000000000000000000000000000000001010", this.weth.address],
            [ether('0.0025'), EXCHANGE_RATE, ether('0.0005')], {from: provider});

        await this.marketplace.createOffer(
          0, // ID
          ether('10'), //10$
          '120',
          '1000000',
          '20',
          MAX_SIZE,
          {from: minter}
        );

      });

      it('buys the offer', async () => {
        await this.marketplace.setNowOverride('120');
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS, {from: tokenBuyer});
        await this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer});
        const {_primarySalePrice, _startTime, _availableAmount, _discountToPayERC20} = await this.marketplace.getOffer(0);
        expect(_primarySalePrice).to.be.bignumber.equal(ether('10'));
        expect(_startTime).to.be.bignumber.equal('120');
        expect(_startTime).to.be.bignumber.equal('120');
        expect(_availableAmount).to.be.bignumber.equal('9');
        expect(_discountToPayERC20).to.be.bignumber.equal('20');
      });

      it('records primary sale price on garment NFT', async () => {

        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS, {from: tokenBuyer});
        await this.marketplace.setNowOverride('121');
        await this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer});

        // 100$ * (1 eth/2000$)
        const primarySalePrice = await this.token.primarySalePrice(100001);
        expect(primarySalePrice).to.be.bignumber.equal(ether('0.005'));
      });

      it('transfer Mona only to the token creator and platform', async () => {
        const platformFeeTracker = await balance.tracker(platformFeeAddress);
        const designerTracker = await balance.tracker(designer);

        await this.weth.deposit({from: tokenBuyer, value: ether('20')})

        // We get a discount, so we only need 100 - 2 % of the MONA
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS.mul(new BN('0.98')), {from: tokenBuyer});


        await this.marketplace.setNowOverride('121');
        await this.marketplace.buyOffer(0, this.monaToken.address, 0,0, {from: tokenBuyer});

        // Platform gets 12%
        const platformChanges = await platformFeeTracker.delta('wei');
        expect(platformChanges).to.be.bignumber.equal(ether('0')); // But no change in eth


        const designerChanges = await designerTracker.delta('wei');
        expect(designerChanges).to.be.bignumber.equal(ether('0')); // But no change in eth

        // Validate that the garment owner/designer received FEE * (100% minus platformFEE of 12%)
        expect(await this.monaToken.balanceOf(designer)).to.be.bignumber.equal(new BN('0'));

        // Validate that the treasury wallet (platformFeeRecipient) received platformFee minus discount for paying in Mona
        // (so 12-2, is 10% of final fee is given to the platform recipient)
        expect(await this.monaToken.balanceOf(platformFeeAddress)).to.be.bignumber.equal(new BN('24500000000000000'));
      });

      it('transfer MATIC (ETH) only to the token designer and platform', async () => {
        const platformFeeTracker = await balance.tracker(platformFeeAddress);
        const designerTracker = await balance.tracker(designer);

        // We get a discount, so we only need 100 - 2 % of the MONA
        await this.monaToken.approve(this.marketplace.address, TWO_HUNDRED_TOKENS.mul(new BN('0.98')), {from: tokenBuyer});


        await this.marketplace.setNowOverride('121');
        await this.marketplace.buyOffer(0,
            "0x0000000000000000000000000000000000001010", 0,0,
            {value: new BN('9800000000000000000'), from: tokenBuyer});

        // Platform gets 12%
        const platformChanges = await platformFeeTracker.delta('wei');
        expect(platformChanges).to.be.bignumber.equal(new BN('9800000000000000000')); // But no change in eth

        // Designer gets 88%
        const designerChanges = await designerTracker.delta('wei');
        expect(designerChanges).to.be.bignumber.equal(new BN('0')); // But no change in eth

        // No change in MONA
        // Validate that the garment owner/designer received FEE * (100% minus platformFEE of 12%)
        expect(await this.monaToken.balanceOf(designer)).to.be.bignumber.equal(new BN('0'));

        // Validate that the treasury wallet (platformFeeRecipient) received platformFee minus discount for paying in Mona
        // (so 12-2, is 10% of final fee is given to the platform recipient)
        expect(await this.monaToken.balanceOf(platformFeeAddress)).to.be.bignumber.equal(new BN('0'));
      });
    });
  });

  describe('cancelOffer()', async () => {

    beforeEach(async () => {
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', [], [], {from: minter});
      const garmentIds = await this.garmentCollection.getTokenIds(0);
      for (let i = 0; i < garmentIds.length; i ++) {
        await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
      }
      await this.marketplace.setNowOverride('120');
      await this.marketplace.createOffer(
        0,
        ether('0.1'),
        '120',
          '1000000',
        '20',
        MAX_SIZE,
        {from: minter},
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
          bundleTokenId: (new BN('0'))
        });
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
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', [], [], {from: minter});
      const garmentIds = await this.garmentCollection.getTokenIds(0);
      for (let i = 0; i < garmentIds.length; i ++) {
        await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
      }
      await this.marketplace.setNowOverride('120');
      await this.marketplace.createOffer(
        0,
        ether('0.1'),
        '120',
          '1000000',
        '20',
        MAX_SIZE,
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

  describe('updateMarketplaceDiscountToPayInErc20()', async () => {
    beforeEach(async () => {
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, bundleID, 'Common', [], [], {from: minter});
      const garmentIds = await this.garmentCollection.getTokenIds(0);
      for (let i = 0; i < garmentIds.length; i ++) {
        await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
      }
      await this.marketplace.setNowOverride('120');
      await this.marketplace.createOffer(
          0,
          ether('0.1'),
          '120',
          '1000000',
          '20',
          MAX_SIZE,
          {from: minter}
      );
    });

    describe('updateMarketplaceDiscountToPayInErc20()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
            this.marketplace.updateMarketplaceDiscountToPayInErc20(0, '10' , {from: tokenBuyer}),
            'DigitalaxMarketplace.updateMarketplaceDiscountToPayInErc20: Sender must be admin'
        );
      });
      it('fails when more than the 1000', async () => {
        await expectRevert(
            this.marketplace.updateMarketplaceDiscountToPayInErc20(0, '1200', {from: admin}),
            'DigitalaxMarketplace.updateMarketplaceDiscountToPayInErc20: Discount cannot be greater then fee'
        );
      });
      it('successfully updates discount', async () => {
        await this.marketplace.updateMarketplaceDiscountToPayInErc20(0, '30', {from: admin});
        const {_primarySalePrice, _startTime, _availableAmount, _discountToPayERC20} = await this.marketplace.getOffer(0);
        expect(_discountToPayERC20).to.be.bignumber.equal('30');
      });
    });
  });

  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
