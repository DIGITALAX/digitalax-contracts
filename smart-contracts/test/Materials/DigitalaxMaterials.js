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
    await this.accessControls.addSmartContractRole(smart_contract, {from: admin});

    this.token = await DigitalaxMaterials.new(
      name,
      symbol,
      this.accessControls.address,
      {from: admin}
    );
  });

  describe('createStrand()', function () {
    it('Reverts when sender is not smart contract', async function() {
      await expectRevert(
        this.token.createStrand(initialURI, {from: tokenHolder}),
        "DigitalaxMaterials.createStrand: Sender must be smart contract"
      );
    });

    it('Reverts when empty uri specified', async function() {
      await expectRevert(
        this.token.createStrand("", {from: smart_contract}),
        "DigitalaxMaterials.createStrand: URI is a blank string"
      );
    });
  });

  describe('batchCreateStrands()', function() {
    it('Reverts when sender is not smart contract', async function() {
      await expectRevert(
        this.token.batchCreateStrands([], {from: tokenBatchHolder}),
        "DigitalaxMaterials.batchCreateStrands: Sender must be smart contract"
      );
    });

    it('Reverts when arrays are empty', async function() {
      await expectRevert(
        this.token.batchCreateStrands([], {from: smart_contract}),
        "DigitalaxMaterials.batchCreateStrands: No data supplied in array"
      );
    });

    it('Reverts when any elem in the _uris is empty', async function() {
      await expectRevert(
        this.token.batchCreateStrands([initialURI, ""], {from: smart_contract}),
        "DigitalaxMaterials.batchCreateStrands: URI is a blank string"
      );
    });
  });

  describe('mintStrand()', function() {
    beforeEach(async function() {
      await this.token.createStrand(
        initialURI,
        {from: smart_contract}
      );
    });

    it('Can successfully mint', async function() {
      await this.token.mintStrand(STRAND_ONE_ID, '4', tokenHolder, web3.utils.encodePacked(''), {from: smart_contract});
      expect(await this.token.balanceOf(tokenHolder, STRAND_ONE_ID)).to.be.bignumber.equal('4');
    });

    it('Reverts when sender does not have smart contract role', async function() {
      await expectRevert(
        this.token.mintStrand(STRAND_ONE_ID, '4', tokenHolder, web3.utils.encodePacked(''), {from: tokenBatchHolder}),
        "DigitalaxMaterials.mintStrand: Sender must be smart contract"
      )
    });

    it('Reverts when strand has not been created', async function() {
      await expectRevert(
        this.token.mintStrand('2', '5', tokenHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.mintStrand: Strand does not exist"
      );
    });

    it('Reverts when amount is specified as zero', async function() {
      await expectRevert(
        this.token.mintStrand(STRAND_ONE_ID, '0', tokenHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.mintStrand: No amount specified"
      );
    });
  });

  describe('batchMintStrands()', function() {
    it('Reverts when sender is not a smart contract', async function() {
      await expectRevert(
        this.token.batchMintStrands([], [], tokenBatchHolder, web3.utils.encodePacked(''), {from: tokenBatchHolder}),
        "DigitalaxMaterials.batchMintStrands: Sender must be smart contract"
      );
    });

    it('Reverts when any strand does not exist', async function() {
      await expectRevert(
        this.token.batchMintStrands(['1'], ['1'], tokenBatchHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.batchMintStrands: Strand does not exist"
      );
    });

    it('Reverts when any amount is zero', async function() {
      await this.token.createStrand(initialURI, {from: smart_contract});
      await expectRevert(
        this.token.batchMintStrands(['1'], ['0'], tokenBatchHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.batchMintStrands: Invalid amount"
      );
    });

    it('Reverts when array lengths are inconsistent', async function() {
      await expectRevert(
        this.token.batchMintStrands(['1'], [], tokenBatchHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.batchMintStrands: Array lengths are invalid"
      );
    });

    it('Reverts when arrays are empty', async function() {
      await expectRevert(
        this.token.batchMintStrands([], [], tokenBatchHolder, web3.utils.encodePacked(''), {from: smart_contract}),
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
