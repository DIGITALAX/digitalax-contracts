const {
  expectRevert,
  expectEvent,
  BN,
  constants,
} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxGarmentNFTV2 = artifacts.require('DigitalaxGarmentNFTV2');
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');
const DigitalaxRootTunnel = artifacts.require('DigitalaxRootTunnel');

contract('DigitalaxRootTunnel', (accounts) => {
  const [admin, smartContract, minter, owner, designer, tokenBuyer, randomAddress] = accounts;

  const TOKEN_ONE_ID = new BN('1');
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


    this.digitalaxMaterials = await DigitalaxMaterials.new(
        'DigitalaxMaterials',
        'DXM',
        this.accessControls.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
        {from: owner}
    );

    this.tokenV2 = await DigitalaxGarmentNFTV2.new();
    await this.tokenV2.initialize(
        this.accessControls.address,
        this.digitalaxMaterials.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
        {from: admin}
    );

    this.token = await DigitalaxGarmentNFT.new(
        this.accessControls.address,
        this.digitalaxMaterials.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
        {from: admin}
    );

    this.garmentFactory = await DigitalaxGarmentFactory.new(
        this.token.address,
        this.digitalaxMaterials.address,
        this.accessControls.address,
        {from: admin}
    );

    this.digitalaxRootTunnel = await DigitalaxRootTunnel.new(
      this.accessControls.address,
        this.token.address,
        this.digitalaxMaterials.address,
        constants.ZERO_ADDRESS,
    );


    await this.accessControls.addSmartContractRole(this.garmentFactory.address, {from: admin});
    await this.accessControls.addSmartContractRole(this.digitalaxRootTunnel.address, {from: admin});
    await this.accessControls.addMinterRole(this.digitalaxRootTunnel.address, {from: admin});

    // Create some ERC1155's for use here
    await this.garmentFactory.createNewChildren(randomChildTokenURIs, {from: minter});
  });

  describe('_processMessageFromChild()', async () => {
    beforeEach(async () => {
      await this.garmentFactory.mintParentWithoutChildren(randomTokenURI, designer, owner, {from: minter});
      await this.garmentFactory.mintParentWithoutChildren(randomTokenURI, designer, owner, {from: minter});
    });

    describe('_processMessageFromChild', async () => {
      it('can successfully _processMessageFromChild', async () => {
         // TODO use v2 to create the message and digitalaxRootTunnel to mint the message contents.
      });
    });
  });

  describe('transferNFTsDataToMatic()', async () => {
    beforeEach(async () => {
      await this.garmentFactory.mintParentWithoutChildren(randomTokenURI, designer, owner, {from: minter});
      await this.garmentFactory.mintParentWithoutChildren(randomTokenURI, designer, owner, {from: minter});
      // TODO add with children
    });

    describe('transferNFTsDataToMatic', async () => {
      it('transferNFTsDataToMatic', async () => {
        // Comment out the below on the contract to use this test.
        // _sendMessageToChild(abi.encode(_tokenIds, _salePrices, _designers, _tokenUris));
        // await this.digitalaxRootTunnel.transferNFTsDataToMatic([new BN('1'), new BN('2')]);

        // TODO find the bytes output of above and try in v2 token


      });
    });
  });

  // TODO process message from child above and then also add test for transferNFTsDataToMatic

  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
