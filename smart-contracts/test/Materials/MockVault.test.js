const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');
const web3 = require('web3');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const MockERC20 = artifacts.require('MockERC20');
const MockVault = artifacts.require('MockVault');

contract('MockVault tests', function ([admin, minter, tokenHolder, ...otherAccounts]) {
  const randomStrandUri = 'random';

  // 1,000 * 10 ** 18
  const ONE_THOUSAND_TOKENS = '1000000000000000000000';

  const STRAND_ID = '1';

  beforeEach(async () => {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});
    await this.accessControls.addSmartContractRole(minter, {from: admin});

    this.materials = await DigitalaxMaterials.new(
      'Materials',
      'DXM',
      this.accessControls.address,
      {from: admin}
    );

    this.garment = await DigitalaxGarmentNFT.new(
      this.accessControls.address,
      this.materials.address
    );

    this.token = await MockERC20.new(
      'wBTC',
      'wBTC',
      ONE_THOUSAND_TOKENS,
      {from: tokenHolder}
    );

    this.vault = await MockVault.new();

    await this.accessControls.addSmartContractRole(this.vault.address, {from: admin});

    await this.vault.init(
      this.materials.address,
      this.token.address,
      randomStrandUri
    );
  });

  it('Can mint an asset back strand and retrieve back the asset', async () => {
    expect(await this.token.balanceOf(tokenHolder)).to.be.bignumber.equal(ONE_THOUSAND_TOKENS);
    expect(await this.token.balanceOf(this.vault.address)).to.be.bignumber.equal('0');
    expect(await this.materials.balanceOf(tokenHolder, STRAND_ID)).to.be.bignumber.equal('0');
    expect(await this.materials.tokenTotalSupply(STRAND_ID)).to.be.bignumber.equal('0');

    await this.token.approve(this.vault.address, ONE_THOUSAND_TOKENS, {from: tokenHolder});
    await this.vault.mintAssetBackedSyntheticMaterial(ONE_THOUSAND_TOKENS, {from: tokenHolder});

    expect(await this.token.balanceOf(tokenHolder)).to.be.bignumber.equal('0');
    expect(await this.token.balanceOf(this.vault.address)).to.be.bignumber.equal(ONE_THOUSAND_TOKENS);
    expect(await this.materials.balanceOf(tokenHolder, STRAND_ID)).to.be.bignumber.equal(ONE_THOUSAND_TOKENS);
    expect(await this.materials.tokenTotalSupply(STRAND_ID)).to.be.bignumber.equal(ONE_THOUSAND_TOKENS);

    await this.materials.setApprovalForAll(this.vault.address, true, {from: tokenHolder});
    await this.vault.claimUnderlyingAssetFromMaterial(STRAND_ID, ONE_THOUSAND_TOKENS, {from: tokenHolder});

    expect(await this.token.balanceOf(tokenHolder)).to.be.bignumber.equal(ONE_THOUSAND_TOKENS);
    expect(await this.token.balanceOf(this.vault.address)).to.be.bignumber.equal('0');
    expect(await this.materials.balanceOf(tokenHolder, STRAND_ID)).to.be.bignumber.equal('0');
    expect(await this.materials.tokenTotalSupply(STRAND_ID)).to.be.bignumber.equal('0');
  });

  it('Can mint an asset-backed strand direct to garment', async () => {
    await this.garment.mint(tokenHolder, 'blah', tokenHolder, {from: minter});

    await this.token.approve(this.vault.address, ONE_THOUSAND_TOKENS, {from: tokenHolder});
    await this.vault.mintAssetBackedSyntheticMaterialToGarment(
      this.garment.address,
      '1',
      ONE_THOUSAND_TOKENS,
      {from: tokenHolder}
    );

    await expectStrandBalanceOfGarmentToBe('1', STRAND_ID, ONE_THOUSAND_TOKENS);
    expect(await this.token.balanceOf(tokenHolder)).to.be.bignumber.equal('0');
    expect(await this.token.balanceOf(this.vault.address)).to.be.bignumber.equal(ONE_THOUSAND_TOKENS);
    expect(await this.materials.balanceOf(tokenHolder, STRAND_ID)).to.be.bignumber.equal('0');
    expect(await this.materials.tokenTotalSupply(STRAND_ID)).to.be.bignumber.equal(ONE_THOUSAND_TOKENS);
  });

  const expectStrandBalanceOfGarmentToBe = async (garmentTokenId, strandId, expectedStrandBalance) => {
    const garmentStrandBalance = await this.garment.childBalance(
      garmentTokenId,
      this.materials.address,
      strandId
    );
    expect(garmentStrandBalance).to.be.bignumber.equal(expectedStrandBalance);
  };
});
