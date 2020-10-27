const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const { shouldBehaveLikeERC1155 } = require('./ERC1155.behavior');
const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');

contract('DigitalaxMaterials 1155 behaviour tests', function ([admin, minter, tokenHolder, tokenBatchHolder, smart_contract, ...otherAccounts]) {
  const name = "DigitalaxMaterials";
  const symbol = "DXM";

  const initialURI = 'https://token-cdn-domain/{id}.json';

  const STRAND_ONE_ID = new BN('1');

  beforeEach(async function () {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});

    this.token = await DigitalaxMaterials.new(
      name,
      symbol,
      this.accessControls.address,
      {from: admin}
    );
  });

  describe('createStrand()', function () {
    it('Reverts when sender is not minter', async function() {
      await expectRevert(
        this.token.createStrand('1', tokenHolder, initialURI, {from: tokenHolder}),
        "DigitalaxMaterials.createStrand: Sender must be minter"
      );
    });

    it('Reverts when zero supply specified', async function() {
      await expectRevert(
        this.token.createStrand('0', tokenHolder, initialURI, {from: minter}),
        "DigitalaxMaterials.createStrand: No initial supply"
      );
    });

    it('Reverts when empty uri specified', async function() {
      await expectRevert(
        this.token.createStrand('1', tokenHolder, "", {from: minter}),
        "DigitalaxMaterials.createStrand: URI is a blank string"
      );
    });
  });

  describe('batchCreateStrand()', function() {
    it('Reverts when sender is not minter', async function() {
      await expectRevert(
        this.token.batchCreateStrand([], tokenBatchHolder, [], {from: tokenBatchHolder}),
        "DigitalaxMaterials.batchCreateStrand: Sender must be minter"
      );
    });

    it('Reverts when array lengths differ', async function() {
      await expectRevert(
        this.token.batchCreateStrand(['1'], tokenBatchHolder, [], {from: minter}),
        "DigitalaxMaterials.batchCreateStrand: Array lengths are invalid"
      );
    });

    it('Reverts when arrays are empty', async function() {
      await expectRevert(
        this.token.batchCreateStrand([], tokenBatchHolder, [], {from: minter}),
        "DigitalaxMaterials.batchCreateStrand: No data supplied in arrays"
      );
    });

    it('Reverts when any elem in the _initialSupplies is zero', async function() {
      await expectRevert(
        this.token.batchCreateStrand(['1', '0'], tokenBatchHolder, [initialURI, initialURI], {from: minter}),
        "DigitalaxMaterials.batchCreateStrand: No initial supply"
      );
    });

    it('Reverts when any elem in the _uris is empty', async function() {
      await expectRevert(
        this.token.batchCreateStrand(['1', '1'], tokenBatchHolder, [initialURI, ""], {from: minter}),
        "DigitalaxMaterials.batchCreateStrand: URI is a blank string"
      );
    });
  });

  describe('mintStrand()', function() {
    beforeEach(async function() {
      await this.token.createStrand(
        '1',
        tokenHolder,
        initialURI,
        {from: minter}
      );
    });

    it('Can successfully mint', async function() {
      await this.token.mintStrand(STRAND_ONE_ID, '4', tokenHolder, {from: minter});
      expect(await this.token.balanceOf(tokenHolder, STRAND_ONE_ID)).to.be.bignumber.equal('5');
    });

    it('Reverts when sender does not have minter role', async function() {
      await expectRevert(
        this.token.mintStrand(STRAND_ONE_ID, '4', tokenHolder, {from: tokenHolder}),
        "DigitalaxMaterials.mintStrand: Sender must be minter"
      )
    });

    it('Reverts when strand has not been created', async function() {
      await expectRevert(
        this.token.mintStrand('2', '5', tokenHolder, {from: minter}),
        "DigitalaxMaterials.mintStrand: Strand does not exist"
      );
    });

    it('Reverts when amount is specified as zero', async function() {
      await expectRevert(
        this.token.mintStrand(STRAND_ONE_ID, '0', tokenHolder, {from: minter}),
        "DigitalaxMaterials.mintStrand: No amount specified"
      );
    });
  });

  describe('updateAccessControls()', function() {
    it('Successfully updates access controls as admin', async function() {
      const currentAccessControlsAddress = await this.token.accessControls();
      await this.token.updateAccessControls(smart_contract, {from: admin});
      expect(await this.token.accessControls()).to.be.equal(smart_contract);
      expect(await this.token.accessControls()).to.not.be.equal(currentAccessControlsAddress);
    });

    it('Reverts when sender does not have admin role', async function() {
      await expectRevert(
        this.token.updateAccessControls(smart_contract, {from: tokenHolder}),
        "DigitalaxMaterials.updateAccessControls: Sender must be admin"
      );
    });

    it('Reverts when setting access controls to ZERO address', async function() {
      await expectRevert(
        this.token.updateAccessControls(ZERO_ADDRESS, {from: admin}),
        "DigitalaxMaterials.updateAccessControls: New access controls cannot be ZERO address"
      );
    });
  });
});
