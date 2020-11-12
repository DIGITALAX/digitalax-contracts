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

  describe('createChild()', function () {
    it('Reverts when sender is not smart contract', async function() {
      await expectRevert(
        this.token.createChild(initialURI, {from: tokenHolder}),
        "DigitalaxMaterials.createChild: Sender must be smart contract"
      );
    });

    it('Reverts when empty uri specified', async function() {
      await expectRevert(
        this.token.createChild("", {from: smart_contract}),
        "DigitalaxMaterials.createChild: URI is a blank string"
      );
    });
  });

  describe('batchCreateChildren()', function() {
    it('Reverts when sender is not smart contract', async function() {
      await expectRevert(
        this.token.batchCreateChildren([], {from: tokenBatchHolder}),
        "DigitalaxMaterials.batchCreateChildren: Sender must be smart contract"
      );
    });

    it('Reverts when arrays are empty', async function() {
      await expectRevert(
        this.token.batchCreateChildren([], {from: smart_contract}),
        "DigitalaxMaterials.batchCreateChildren: No data supplied in array"
      );
    });

    it('Reverts when any elem in the _uris is empty', async function() {
      await expectRevert(
        this.token.batchCreateChildren([initialURI, ""], {from: smart_contract}),
        "DigitalaxMaterials.batchCreateChildren: URI is a blank string"
      );
    });
  });

  describe('mintChild()', function() {
    beforeEach(async function() {
      await this.token.createChild(
        initialURI,
        {from: smart_contract}
      );
    });

    it('Can successfully mint', async function() {
      await this.token.mintChild(STRAND_ONE_ID, '4', tokenHolder, web3.utils.encodePacked(''), {from: smart_contract});
      expect(await this.token.balanceOf(tokenHolder, STRAND_ONE_ID)).to.be.bignumber.equal('4');
    });

    it('Reverts when sender does not have smart contract role', async function() {
      await expectRevert(
        this.token.mintChild(STRAND_ONE_ID, '4', tokenHolder, web3.utils.encodePacked(''), {from: tokenBatchHolder}),
        "DigitalaxMaterials.mintChild: Sender must be smart contract"
      )
    });

    it('Reverts when strand has not been created', async function() {
      await expectRevert(
        this.token.mintChild('2', '5', tokenHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.mintChild: Strand does not exist"
      );
    });

    it('Reverts when amount is specified as zero', async function() {
      await expectRevert(
        this.token.mintChild(STRAND_ONE_ID, '0', tokenHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.mintChild: No amount specified"
      );
    });
  });

  describe('batchMintChildren()', function() {
    it('Reverts when sender is not a smart contract', async function() {
      await expectRevert(
        this.token.batchMintChildren([], [], tokenBatchHolder, web3.utils.encodePacked(''), {from: tokenBatchHolder}),
        "DigitalaxMaterials.batchMintChildren: Sender must be smart contract"
      );
    });

    it('Reverts when any strand does not exist', async function() {
      await expectRevert(
        this.token.batchMintChildren(['1'], ['1'], tokenBatchHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.batchMintChildren: Strand does not exist"
      );
    });

    it('Reverts when any amount is zero', async function() {
      await this.token.createChild(initialURI, {from: smart_contract});
      await expectRevert(
        this.token.batchMintChildren(['1'], ['0'], tokenBatchHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.batchMintChildren: Invalid amount"
      );
    });

    it('Reverts when array lengths are inconsistent', async function() {
      await expectRevert(
        this.token.batchMintChildren(['1'], [], tokenBatchHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.batchMintChildren: Array lengths are invalid"
      );
    });

    it('Reverts when arrays are empty', async function() {
      await expectRevert(
        this.token.batchMintChildren([], [], tokenBatchHolder, web3.utils.encodePacked(''), {from: smart_contract}),
        "DigitalaxMaterials.batchMintChildren: No data supplied in arrays"
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
