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

const DigitalaxAccessControls = artifacts.require('contracts/DigitalaxAccessControls.sol:DigitalaxAccessControls');
const DigitalaxMaterialsV2 = artifacts.require('DigitalaxMaterialsV2');
const DigitalaxGarmentNFTv2 = artifacts.require('DigitalaxGarmentNFTv2');
const DigitalaxGarmentCollectionV2 = artifacts.require('DigitalaxGarmentCollectionV2');
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');
const DigitalaxMarketplaceV4 = artifacts.require('DigitalaxMarketplaceV4Mock');
const DigitalaxMarketplaceV4Real = artifacts.require('DigitalaxMarketplaceV4');
const DigitalaxMonaOracle = artifacts.require('DigitalaxMonaOracle');
const MockERC20 = artifacts.require('MockERC20');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const WethToken = artifacts.require('WethToken');

const DripOracle = artifacts.require('DripOracle');

// 1,000 * 10 ** 18
const HUNDRED_THOUSAND_TOKENS = '100000000000000000000000';
const TWO_HUNDRED_TOKENS = new BN('200000000000000000000');
const TWENTY_TOKENS = new BN('20000000000000000000');
const TWO_ETH = ether('2');

contract('DigitalaxMarketplaceV4', (accounts) => {
  const [admin, smartContract, platformFeeAddress, minter, owner, designer, tokenBuyer, newRecipient, provider] = accounts;

  const TOKEN_ONE_ID = new BN('100001');
  const TOKEN_TWO_ID = new BN('100002');
  const COLLECTION_SIZE = new BN('10');
  const MAX_SIZE = new BN('1000');

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
        HUNDRED_THOUSAND_TOKENS,
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

    this.garmentCollection = await DigitalaxGarmentCollectionV2.new()
    await this.garmentCollection.initialize(
        this.accessControls.address,
        this.token.address,
        this.digitalaxMaterials.address,
    );

    this.garmentFactory = await DigitalaxGarmentFactory.new();
    this.garmentFactory.initialize(
        this.token.address,
        this.digitalaxMaterials.address,
        this.accessControls.address,
        {from: admin}
    );

      this.dripOracle = await DripOracle.new();
    await this.dripOracle.initialize(
        '86400',
        this.accessControls.address,
        {from: admin}
    );

   await this.dripOracle.addProvider(provider, {from: admin})

    await this.dripOracle.addPayableTokensWithReports(
        [this.monaToken.address, "0x0000000000000000000000000000000000001010", this.weth.address],
        [EXCHANGE_RATE, EXCHANGE_RATE, EXCHANGE_RATE], {from: provider});
   // await time.increase(time.duration.seconds(120));
//{ A: 93, B: 173, C: 128, D: 242, E: 364 }
    this.marketplace = await DigitalaxMarketplaceV4.new();
    console.log(platformFeeAddress);
    await this.marketplace.initialize(
          this.accessControls.address,
          this.token.address,
          this.dripOracle.address,
          platformFeeAddress,
          this.weth.address,
            constants.ZERO_ADDRESS,
          3453453214,
          platformFeeAddress,
          {from: admin}
    );


    await this.accessControls.addMinterRole(this.marketplace.address, {from: admin});
    await this.accessControls.addSmartContractRole(this.marketplace.address, {from: admin});


    this.monaToken.approve(this.marketplace.address, HUNDRED_THOUSAND_TOKENS);

    await this.accessControls.addSmartContractRole(this.marketplace.address, {from: admin});

    await this.accessControls.addSmartContractRole(this.garmentFactory.address, {from: admin});
    // Create some ERC1155's for use here
    await this.garmentFactory.createNewChildren(randomChildTokenURIs, {from: minter});

    await this.oracle.addProvider(provider, {from: admin});
    await this.oracle.pushReport(EXCHANGE_RATE, {from: provider});
    await time.increase(time.duration.seconds(120));
  });


  describe('createOffer()', async () => {
    describe('validation', async () => {
      it('create offer and buy offer', async () => {
        await this.marketplace.setUriStrings(['A','B','C','D','E']);
         await this.marketplace.createOffer(
          ether('0.1'),
          '120',
           '1000000',
          '120',
          MAX_SIZE,
            [],
            [],
          {from: minter}
        );
        await this.marketplace.setNowOverride('120');
        await this.monaToken.approve(this.marketplace.address, HUNDRED_THOUSAND_TOKENS, {from: tokenBuyer});
        let counter = {
          'A' : 0,
          'B' : 0,
          'C' : 0,
          'D' : 0,
          'E' : 0,
        }
        for(let i=100001; i<101001; i++) {
          await this.marketplace.buyOffer(this.monaToken.address, 0, 0, {from: tokenBuyer});
          let tokenUri = await this.token.batchTokenURI([i]);
          counter[tokenUri] = counter[tokenUri] + 1;
        }
        console.log(counter);
        const {_primarySalePrice, _startTime, _availableAmount, _platformFee, _discountToPayERC20} = await this.marketplace.getOffer(0);
        expect(_primarySalePrice).to.be.bignumber.equal(ether('0.1'));
        expect(_startTime).to.be.bignumber.equal('120');
        expect(_startTime).to.be.bignumber.equal('120');
        expect(_availableAmount).to.be.bignumber.equal('0');
        expect(_platformFee).to.be.bignumber.equal('120');
      });
    });
  });

  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
