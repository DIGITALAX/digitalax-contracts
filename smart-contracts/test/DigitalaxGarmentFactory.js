const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');
const web3 = require('web3');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');

contract('DigitalaxGarmentFactory', function ([admin, minter, tokenHolder, designer, ...otherAccounts]) {
  const name = "DigitalaxMaterials";
  const symbol = "DXM";

  const randomStrandURI = 'randomStrandUri';
  const randomGarmentURI = 'randomGarmentUri';

  const TOKEN_ONE_ID = new BN('1');

  const STRAND_ONE_ID = new BN('1');
  const STRAND_TWO_ID = new BN('2');
  const STRAND_THREE_ID = new BN('3');

  beforeEach(async () => {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});

    this.digitalaxMaterials = await DigitalaxMaterials.new(
      name,
      symbol,
      this.accessControls.address,
      {from: admin}
    );

    this.garment = await DigitalaxGarmentNFT.new(
      this.accessControls.address,
      this.digitalaxMaterials.address,
      {from: admin}
    );

    this.factory = await DigitalaxGarmentFactory.new(
      this.garment.address,
      this.digitalaxMaterials.address,
      this.accessControls.address,
      {from: admin}
    );

    await this.accessControls.addSmartContractRole(this.factory.address, {from: admin});
  });

  describe('createNewStrand()', () => {
    it('Creates a new strand successfully', async () => {
      await this.factory.createNewStrand(randomStrandURI, {from: minter});
      expect(await this.digitalaxMaterials.uri(STRAND_ONE_ID)).to.be.equal(randomStrandURI);
    });

    it('Reverts when sender is not a minter', async () => {
      await expectRevert(
        this.factory.createNewStrand(randomStrandURI, {from: tokenHolder}),
        "DigitalaxGarmentFactory.createNewStrand: Sender must be minter"
      );
    });
  });

  describe('createNewStrands()', () => {
    it('Creates a multiple strands successfully', async () => {
      const strand2Uri = 'strand2uri';
      await this.factory.createNewStrands([randomStrandURI, strand2Uri], {from: minter});
      expect(await this.digitalaxMaterials.uri(STRAND_ONE_ID)).to.be.equal(randomStrandURI);
      expect(await this.digitalaxMaterials.uri(STRAND_TWO_ID)).to.be.equal(strand2Uri);
    });

    it('Reverts when sender is not a minter', async () => {
      await expectRevert(
        this.factory.createNewStrands([randomStrandURI, randomStrandURI], {from: tokenHolder}),
        "DigitalaxGarmentFactory.createNewStrands: Sender must be minter"
      );
    });
  });

  describe('createGarmentAndMintStrands()', () => {
    beforeEach(async () => {
      await this.factory.createNewStrands(
        [randomStrandURI, randomStrandURI, randomStrandURI],
        {from: minter}
      ); // This will create strands with strand IDs: [1], [2], [3]
    });

    it('Can mint and link a strand', async () => {
      const strand1Amount = '1';
      const strand2Amount = '5';
      const strand3Amount = '2';
      const { receipt } = await this.factory.createGarmentAndMintStrands(
        randomGarmentURI,
        designer,
        [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID],
        [strand1Amount, strand2Amount, strand3Amount], // amounts to mint and link
        tokenHolder,
        {from: minter}
      );

      await expectEvent(receipt, 'GarmentCreated', {garmentTokenId: TOKEN_ONE_ID});

      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, strand1Amount);
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_TWO_ID, strand2Amount);
      await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_THREE_ID, strand3Amount);
      await expectGarmentToOwnAGivenSetOfStrandIds(TOKEN_ONE_ID, [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID]);
    });

    it('Reverts when sender does not have the minter role', async () => {
      await expectRevert(
        this.factory.createGarmentAndMintStrands(
          randomGarmentURI,
          designer,
          [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID],
          ['1', '1','1'],
          tokenHolder,
          {from: tokenHolder}
        ),
        "DigitalaxGarmentFactory.createGarmentAndMintStrands: Sender must be minter"
      );
    });
  });

  const expectStrandBalanceOfGarmentToBe = async (garmentTokenId, strandId, expectedStrandBalance) => {
    const garmentStrandBalance = await this.garment.childBalance(
      garmentTokenId,
      this.digitalaxMaterials.address,
      strandId
    );
    expect(garmentStrandBalance).to.be.bignumber.equal(expectedStrandBalance);
  };

  const expectGarmentToOwnAGivenSetOfStrandIds = async (garmentId, strandIds) => {
    const garmentStrandIdsOwned = await this.garment.childIdsForOn(
      garmentId,
      this.digitalaxMaterials.address
    );

    expect(garmentStrandIdsOwned.length).to.be.equal(strandIds.length);
    garmentStrandIdsOwned.forEach((strandId, idx) => {
      expect(strandId).to.be.bignumber.equal(strandIds[idx]);
    });
  };
});
