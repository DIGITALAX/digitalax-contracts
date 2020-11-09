const {
  expectEvent,
  BN,
} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxAuction = artifacts.require('DigitalaxAuctionMock');
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');

contract('Digitalax Garment Sale', (accounts) => {
  const [admin, minter, platformFeeAddress, owner, designer, bidder, bidder2] = accounts;

  const TOKEN_ONE_ID = new BN('1');

  const STRAND_ONE_ID = new BN('1');
  const STRAND_TWO_ID = new BN('2');
  const STRAND_THREE_ID = new BN('3');
  const STRAND_FOUR_ID = new BN('4');
  const STRAND_FIVE_ID = new BN('5');

  const randomStrandURI = 'randStrand';
  const randomTokenURI = 'rand';

  beforeEach(async () => {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});

    this.digitalaxMaterials = await DigitalaxMaterials.new(
      'DigitalaxMaterials',
      'DXM',
      this.accessControls.address,
      {from: admin}
    );

    this.token = await DigitalaxGarmentNFT.new(
      this.accessControls.address,
      this.digitalaxMaterials.address,
      {from: admin}
    );

    this.auction = await DigitalaxAuction.new(
      this.accessControls.address,
      this.token.address,
      platformFeeAddress,
      {from: admin}
    );

    await this.auction.setNowOverride('2');

    await this.accessControls.addSmartContractRole(this.auction.address, {from: admin});

    this.factory = await DigitalaxGarmentFactory.new(
      this.token.address,
      this.digitalaxMaterials.address,
      this.accessControls.address,
      {from: admin}
    );

    await this.accessControls.addSmartContractRole(this.factory.address, {from: admin});
  });

  it('Can setup a garment sale', async () => {
    // Create the strands first
    expect(await this.digitalaxMaterials.tokenIdPointer()).to.be.bignumber.equal('0'); //No strands exist

    await this.factory.createNewChildren(
      [randomStrandURI, randomStrandURI, randomStrandURI, randomStrandURI, randomStrandURI],
      {from: minter}
    ); // this will create strand with IDs [1], [2], [3]

    expect(await this.digitalaxMaterials.tokenIdPointer()).to.be.bignumber.equal('5'); //5 strands exist
    expect(await this.token.balanceOf(minter)).to.be.bignumber.equal('0'); // no garments minted to owner

    // Create the garment and wrap strands
    const childTokenIds = [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID, STRAND_FOUR_ID, STRAND_FIVE_ID];
    const strand1Amount = '4';
    const strand2Amount = '2';
    const strand3Amount = '1';
    const strand4Amount = '1';
    const strand5Amount = '1';
    await this.factory.mintParentWithChildren(
      randomTokenURI,
      designer,
      childTokenIds,
      [strand1Amount, strand2Amount, strand3Amount, strand4Amount, strand5Amount],
      minter,
      {from: minter}
    );

    expect(await this.token.balanceOf(minter)).to.be.bignumber.equal('1');
    expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.bignumber.equal(minter);

    await expectGarmentToOwnAGivenSetOfStrandIds(TOKEN_ONE_ID, childTokenIds);
    await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, strand1Amount);
    await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_TWO_ID, strand2Amount);
    await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_THREE_ID, strand3Amount);
    await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_FOUR_ID, strand4Amount);
    await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_FIVE_ID, strand5Amount);

    // Setup auction
    await this.token.approve(this.auction.address, TOKEN_ONE_ID, {from: minter});

    const {receipt} = await this.auction.createAuction(
      TOKEN_ONE_ID,
      '0',
      '2',
      '10',
      {from: minter}
    );

    await expectEvent(receipt, 'AuctionCreated', {
      garmentTokenId: TOKEN_ONE_ID
    })
  });

  const expectStrandBalanceOfGarmentToBe = async (garmentTokenId, strandId, expectedStrandBalance) => {
    const garmentStrandBalance = await this.token.childBalance(
      garmentTokenId,
      this.digitalaxMaterials.address,
      strandId
    );
    expect(garmentStrandBalance).to.be.bignumber.equal(expectedStrandBalance);
  };

  const expectGarmentToOwnAGivenSetOfStrandIds = async (garmentId, childTokenIds) => {
    const garmentStrandIdsOwned = await this.token.childIdsForOn(
      garmentId,
      this.digitalaxMaterials.address
    );

    expect(garmentStrandIdsOwned.length).to.be.equal(childTokenIds.length);
    garmentStrandIdsOwned.forEach((strandId, idx) => {
      expect(strandId).to.be.bignumber.equal(childTokenIds[idx]);
    });
  };
});
