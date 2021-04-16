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
const DigitalaxGarmentNFTv2 = artifacts.require('DigitalaxGarmentNFTv2');
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');
const DigitalaxGarmentUpgrader = artifacts.require('DigitalaxGarmentUpgrader');

contract('DigitalaxGarmentUpgrader', (accounts) => {
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

    this.token = await DigitalaxGarmentNFT.new(
        this.accessControls.address,
        this.digitalaxMaterials.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
        {from: admin}
    );

    this.tokenV2 = await DigitalaxGarmentNFTv2.new();
    await this.tokenV2.initialize(
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

    this.upgrader = await DigitalaxGarmentUpgrader.new();
    this.upgrader.initialize(
        this.token.address,
        this.tokenV2.address,
        this.accessControls.address,
        constants.ZERO_ADDRESS,
        {from: admin}
    );


    await this.accessControls.addSmartContractRole(this.garmentFactory.address, {from: admin});
    await this.accessControls.addSmartContractRole(this.upgrader.address, {from: admin});

    // Create some ERC1155's for use here
    await this.garmentFactory.createNewChildren(randomChildTokenURIs, {from: minter});
  });

  describe('Contract deployment', () => {
    it('Reverts when access controls is zero', async () => {
      const upgraderTemp = await DigitalaxGarmentUpgrader.new();
      await expectRevert(
        upgraderTemp.initialize(
          this.token.address,
          this.tokenV2.address,
            constants.ZERO_ADDRESS,
            constants.ZERO_ADDRESS,
          {from: admin}
        ),
        "DigitalaxGarmentUpgrader: Invalid Access Controls"
      );
    });

    it('Reverts when garment nft is zero', async () => {
      const upgraderTemp = await DigitalaxGarmentUpgrader.new();
      await expectRevert(
          upgraderTemp.initialize(
          constants.ZERO_ADDRESS,
          this.tokenV2.address,
          this.accessControls.address,
          constants.ZERO_ADDRESS,
          {from: admin}
        ),
        "DigitalaxGarmentUpgrader: Invalid NFT"
      );
    });

    it('Reverts when garment nft v2 is zero', async () => {
      const upgraderTemp = await DigitalaxGarmentUpgrader.new();
      await expectRevert(
          upgraderTemp.initialize(
          this.token.address,
          constants.ZERO_ADDRESS,
          this.accessControls.address,
          constants.ZERO_ADDRESS,
          {from: admin}
        ),
        "DigitalaxGarmentUpgrader: Invalid NFT V2"
      );
    });
  });

  describe('upgrade()', async () => {
    beforeEach(async () => {
      await this.garmentFactory.mintParentWithoutChildren(randomTokenURI, designer, owner, {from: minter});
      await this.garmentFactory.mintParentWithoutChildren(randomTokenURI, designer, owner, {from: minter});
    });

    describe('upgrade', async () => {
      it('can successfully upgrade a token', async () => {
        const ownerOf = await this.token.ownerOf(new BN('1'));
        expect(ownerOf).to.be.equal(owner);
        const ownerOf2 = await this.token.ownerOf(new BN('2'));
        expect(ownerOf2).to.be.equal(owner);

        await this.token.setApprovalForAll(this.upgrader.address, true, {from: owner});
        await this.token.setPrimarySalePrice(new BN('1'), new BN('100'), {from: admin});
        await this.token.setPrimarySalePrice(new BN('2'), new BN('100'),{from: admin});

        await this.upgrader.upgrade([new BN('1'), new BN('2')], {from: owner});

        expect(await this.token.exists(new BN('1'))).to.be.false;
        expect(await this.token.exists(new BN('2'))).to.be.false;
        expect(await this.tokenV2.ownerOf(new BN('100001'))).to.be.equal(owner);
        expect(await this.tokenV2.ownerOf(new BN('100002'))).to.be.equal(owner);

      });
      
      it('reverts if not owner of the token and tries to upgrade', async () => {
        await expectRevert(
            this.upgrader.upgrade([new BN('1'), new BN('2')], {from: minter}),
            "DigitalaxGarmentUpgrader.upgrade: Token Id is not msg sender"
        );
      });
    });
  });

  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
