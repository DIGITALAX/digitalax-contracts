const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');
const web3 = require('web3');

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
        this.token.createStrand('1', tokenHolder, initialURI, web3.utils.encodePacked(''), {from: tokenHolder}),
        "DigitalaxMaterials.createStrand: Sender must be minter"
      );
    });

    it('Reverts when zero supply specified', async function() {
      await expectRevert(
        this.token.createStrand('0', tokenHolder, initialURI, web3.utils.encodePacked(''), {from: minter}),
        "DigitalaxMaterials.createStrand: No initial supply"
      );
    });

    it('Reverts when empty uri specified', async function() {
      await expectRevert(
        this.token.createStrand('1', tokenHolder, "", web3.utils.encodePacked(''), {from: minter}),
        "DigitalaxMaterials.createStrand: URI is a blank string"
      );
    });
  });

  describe('batchCreateStrands()', function() {
    const emptyData = web3.utils.encodePacked('');
    it('Reverts when sender is not minter', async function() {
      await expectRevert(
        this.token.batchCreateStrands([], tokenBatchHolder, [], [], {from: tokenBatchHolder}),
        "DigitalaxMaterials.batchCreateStrands: Sender must be minter"
      );
    });

    it('Reverts when array lengths differ', async function() {
      await expectRevert(
        this.token.batchCreateStrands(['1'], tokenBatchHolder, [], [], {from: minter}),
        "DigitalaxMaterials.batchCreateStrands: Array lengths are invalid"
      );
    });

    it('Reverts when arrays are empty', async function() {
      await expectRevert(
        this.token.batchCreateStrands([], tokenBatchHolder, [], [], {from: minter}),
        "DigitalaxMaterials.batchCreateStrands: No data supplied in arrays"
      );
    });

    it('Reverts when any elem in the _initialSupplies is zero', async function() {
      await expectRevert(
        this.token.batchCreateStrands(['1', '0'], tokenBatchHolder, [initialURI, initialURI], [emptyData, emptyData], {from: minter}),
        "DigitalaxMaterials.batchCreateStrands: No initial supply"
      );
    });

    it('Reverts when any elem in the _uris is empty', async function() {
      await expectRevert(
        this.token.batchCreateStrands(['1', '1'], tokenBatchHolder, [initialURI, ""], [emptyData, emptyData], {from: minter}),
        "DigitalaxMaterials.batchCreateStrands: URI is a blank string"
      );
    });
  });

  describe('mintStrand()', function() {
    beforeEach(async function() {
      await this.token.createStrand(
        '1',
        tokenHolder,
        initialURI,
        web3.utils.encodePacked(''),
        {from: minter}
      );
    });

    it('Can successfully mint', async function() {
      await this.token.mintStrand(STRAND_ONE_ID, '4', tokenHolder, web3.utils.encodePacked(''), {from: minter});
      expect(await this.token.balanceOf(tokenHolder, STRAND_ONE_ID)).to.be.bignumber.equal('5');
    });

    it('Reverts when sender does not have minter role', async function() {
      await expectRevert(
        this.token.mintStrand(STRAND_ONE_ID, '4', tokenHolder, web3.utils.encodePacked(''), {from: tokenHolder}),
        "DigitalaxMaterials.mintStrand: Sender must be minter"
      )
    });

    it('Reverts when strand has not been created', async function() {
      await expectRevert(
        this.token.mintStrand('2', '5', tokenHolder, web3.utils.encodePacked(''), {from: minter}),
        "DigitalaxMaterials.mintStrand: Strand does not exist"
      );
    });

    it('Reverts when amount is specified as zero', async function() {
      await expectRevert(
        this.token.mintStrand(STRAND_ONE_ID, '0', tokenHolder, web3.utils.encodePacked(''), {from: minter}),
        "DigitalaxMaterials.mintStrand: No amount specified"
      );
    });
  });

  describe('batchMintStrands()', function() {
    it('Reverts when sender is not a minter', async function() {
      await expectRevert(
        this.token.batchMintStrands([], [], tokenBatchHolder, web3.utils.encodePacked(''), {from: tokenBatchHolder}),
        "DigitalaxMaterials.batchMintStrands: Sender must be minter"
      );
    });

    it('Reverts when any strand does not exist', async function() {
      await expectRevert(
        this.token.batchMintStrands(['1'], ['1'], tokenBatchHolder, web3.utils.encodePacked(''), {from: minter}),
        "DigitalaxMaterials.batchMintStrands: Strand does not exist"
      );
    });

    it('Reverts when any amount is zero', async function() {
      await this.token.createStrand('1', tokenBatchHolder, initialURI, web3.utils.encodePacked(''), {from: minter});
      await expectRevert(
        this.token.batchMintStrands(['1'], ['0'], tokenBatchHolder, web3.utils.encodePacked(''), {from: minter}),
        "DigitalaxMaterials.batchMintStrands: Invalid amount"
      );
    });

    it('Reverts when array lengths are inconsistent', async function() {
      await expectRevert(
        this.token.batchMintStrands(['1'], [], tokenBatchHolder, web3.utils.encodePacked(''), {from: minter}),
        "DigitalaxMaterials.batchMintStrands: Array lengths are invalid"
      );
    });

    it('Reverts when arrays are empty', async function() {
      await expectRevert(
        this.token.batchMintStrands([], [], tokenBatchHolder, web3.utils.encodePacked(''), {from: minter}),
        "DigitalaxMaterials.batchMintStrands: No data supplied in arrays"
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
