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
const DigitalaxGarmentCollection = artifacts.require('DigitalaxGarmentCollection');

contract('DigitalaxGarmentCollection', (accounts) => {
  const [admin, smartContract, platformFeeAddress, minter, owner, designer, tokenBuyer, newRecipient] = accounts;

  const TOKEN_ONE_ID = new BN('1');
  const COLLECTION_SIZE = new BN('10');

  const randomTokenURI = 'rand';

  beforeEach(async () => {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});

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

    this.garmentCollection = await DigitalaxGarmentCollection.new(
      this.accessControls.address,
      this.token.address
    );
    await this.accessControls.addMinterRole(this.garmentCollection.address, {from: admin});
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

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
    });
  });

  describe('burnCollection()', async () => {
    beforeEach(async () => {
      await this.garmentCollection.mintCollection(minter, randomTokenURI, designer, COLLECTION_SIZE, {from: minter});
    });

    describe('validation', async () => {
      it('can successfully burn collection', async () => {
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        for (let i = 0; i < garmentIds.length; i ++) {
          await this.token.approve(this.garmentCollection.address, garmentIds[i], {from: minter});
        }

        const {receipt} = await this.garmentCollection.burnCollection(0, {from: minter});
        await expectEvent(receipt, 'BurnGarmentCollection', {
          collectionId: (new BN('0')),
        });
      });
      it('will revert on burn collection if the garment collection contract is not approved and is not owner', async () => {
        await expectRevert(
            this.garmentCollection.burnCollection(0, {from: minter}
            ),
            "DigitalaxGarmentNFT.burn: Only garment owner or approved"
        );
      });
    });
  });

  describe('getters', async () => {
    beforeEach(async () => {
      await this.garmentCollection.mintCollection(minter, randomTokenURI, designer, COLLECTION_SIZE, {from: minter});
    });

    describe('validation', async () => {
      it('can get token ids', async () => {
        const garmentIds = await this.garmentCollection.getTokenIds(0);
        expect(garmentIds.length).to.equal(10);
      });

      it('can get token collection', async () => {
        const collection = await this.garmentCollection.getCollection(0);
        expect(collection[0].length).to.equal(10);
        expect(collection[1]).to.equal === COLLECTION_SIZE;
        expect(collection[2]).to.equal(randomTokenURI);
        expect(collection[3]).to.equal(designer);
      });

      it('can get token supply', async () => {
        const supply = await this.garmentCollection.getSupply(0);
        expect(supply).to.equal === COLLECTION_SIZE;
      });

      it('can get balance of address', async () => {
        const balance = await this.garmentCollection.balanceOfAddress(0, minter);
        expect(balance).to.equal === COLLECTION_SIZE;
      });

      it('can check whether user owns entire collection', async () => {
        const owns = await this.garmentCollection.hasOwnedOf(0, minter);
        expect(owns).to.be.true;
      });
    });
  });

  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
