const {
  expectRevert,
  expectEvent,
  BN,
  ether,
  constants,
  balance
} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxGarmentCollection = artifacts.require('DigitalaxGarmentCollection');
const DigitalaxMarketplace = artifacts.require('DigitalaxMarketplaceMock');
const MockERC20 = artifacts.require('MockERC20');
const UniswapPairOracle_MONA_WETH = artifacts.require('UniswapPairOracle_MONA_WETH');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const WethToken = artifacts.require('WethToken');

// 1,000 * 10 ** 18
const ONE_THOUSAND_TOKENS = '1000000000000000000000';
const TWO_HUNDRED_TOKENS = new BN('200000000000000000000');
const TWENTY_TOKENS = new BN('20000000000000000000');

contract('DigitalaxGarmentCollection', (accounts) => {
  const [admin, smartContract, platformFeeAddress, minter, owner, designer, tokenBuyer, newRecipient] = accounts;

  const TOKEN_ONE_ID = new BN('1');
  const COLLECTION_SIZE = new BN('10');

  const randomTokenURI = 'rand';

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
      this.token.address
    );
    await this.accessControls.addMinterRole(this.garmentCollection.address, {from: admin});

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
  });

  describe('Contract deployment', () => {
    it('Reverts when access controls is zero', async () => {
      await expectRevert(
        DigitalaxGarmentCollection.new(
          constants.ZERO_ADDRESS,
          this.token.address,
          {from: admin}
        ),
        "DigitalaxGarmentCollection: Invalid Access Controls"
      );
    });

    it('Reverts when garment nft is zero', async () => {
      await expectRevert(
          DigitalaxGarmentCollection.new(
          this.accessControls.address,
          constants.ZERO_ADDRESS,
          {from: admin}
        ),
        "DigitalaxGarmentCollection: Invalid NFT"
      );
    });
  });

  describe('mintCollection()', async () => {
    describe('validation', async () => {
      it('can successfully mint collection', async () => {
        const {receipt} = await this.garmentCollection.mintCollection(minter, randomTokenURI, designer, COLLECTION_SIZE, {from: minter});

        await expectEvent(receipt, 'MintGarmentCollection', {
          collectionId: (new BN('0')),
        });

        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.marketplace.address, garmentIds[i], {from: minter});
        }
        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
    });
  });

  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
