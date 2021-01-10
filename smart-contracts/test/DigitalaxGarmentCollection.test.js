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
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');

contract('DigitalaxGarmentCollection', (accounts) => {
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
      {from: owner}
    );

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

    this.garmentFactory = await DigitalaxGarmentFactory.new(
        this.token.address,
        this.digitalaxMaterials.address,
        this.accessControls.address,
        {from: admin}
    );

    this.garmentCollection = await DigitalaxGarmentCollection.new(
      this.accessControls.address,
      this.token.address,
      this.digitalaxMaterials.address,
    );
    await this.accessControls.addMinterRole(this.garmentCollection.address, {from: admin});
    await this.accessControls.addSmartContractRole(this.garmentCollection.address, {from: admin});
    await this.accessControls.addSmartContractRole(this.garmentFactory.address, {from: admin});

    // Create some ERC1155's for use here
    await this.garmentFactory.createNewChildren(randomChildTokenURIs, {from: minter});
  });

  describe('Contract deployment', () => {
    it('Reverts when access controls is zero', async () => {
      await expectRevert(
        DigitalaxGarmentCollection.new(
          constants.ZERO_ADDRESS,
          this.token.address,
          this.digitalaxMaterials.address,
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
          this.digitalaxMaterials.address,
          {from: admin}
        ),
        "DigitalaxGarmentCollection: Invalid NFT"
      );
    });

    it('Reverts when materials is zero', async () => {
      await expectRevert(
          DigitalaxGarmentCollection.new(
          this.accessControls.address,
          this.token.address,
          constants.ZERO_ADDRESS,
          {from: admin}
        ),
        "DigitalaxGarmentCollection: Invalid Child ERC1155 address"
      );
    });
  });

  describe('mintCollection()', async () => {
    describe('validation', async () => {
      it('can successfully mint collection with Child nfts that have been created previously', async () => {

        const {receipt} = await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common',erc1155ChildStrandIds, amountsOfChildToken, {from: minter});

        await expectEvent(receipt, 'MintGarmentCollection', {
          collectionId: (new BN('0')),
        });

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
      it('can successfully mint collection without any child nfts', async () => {
        const {receipt} = await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', [], [], {from: minter});

        await expectEvent(receipt, 'MintGarmentCollection', {
          collectionId: (new BN('0')),
        });

        const owner = await this.token.ownerOf(TOKEN_ONE_ID);
        expect(owner).to.be.equal(minter);
      });
      it('reverts if sender not admin or minter ', async () => {
        await expectRevert(
            this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: designer}
            ),
            "DigitalaxGarmentCollection.mintCollection: Sender must have the minter or contract role"
          );
      });
      it('reverts if collection size is greater then the max garment per collection ', async () => {
        const maxGarments = await this.garmentCollection.maxGarmentsPerCollection();
        await expectRevert(
            this.garmentCollection.mintCollection(randomTokenURI, designer, (maxGarments + 1), auctionID, 'Common',erc1155ChildStrandIds, amountsOfChildToken, {from: minter}
            ),
            "DigitalaxGarmentCollection.mintCollection: Amount cannot exceed maxGarmentsPerCollection"
          );
      });
    });
  });

  describe('burnCollection()', async () => {
    beforeEach(async () => {
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common',erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
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
            "ERC721: transfer caller is not owner nor approved"
        );
      });
    });
  });

  describe('updateMaxGarmentsPerCollection()', async () => {
    beforeEach(async () => {
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common',erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
    });

    describe('validation', async () => {
      it('Can update max garments per collection as admin', async () => {
        expect(await this.garmentCollection.maxGarmentsPerCollection()).to.be.bignumber.equal("10");
        await this.garmentCollection.updateMaxGarmentsPerCollection("20", {from: admin});
        expect(await this.garmentCollection.maxGarmentsPerCollection()).to.be.bignumber.equal("20");
      });

      it('Reverts when sender is not admin', async () => {
        await expectRevert(
            this.garmentCollection.updateMaxGarmentsPerCollection("20", {from: designer}),
            "DigitalaxGarmentCollection.updateMaxGarmentsPerCollection: Sender must be admin"
        );
      });

      it('can successfully update max garments per collection and mint up to 20 tokens', async () => {
        await this.garmentCollection.updateMaxGarmentsPerCollection("20", {from: admin});
        const {receipt} = await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE.mul(new BN('2')), auctionID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
        await expectEvent(receipt, 'MintGarmentCollection', {
          collectionId: (new BN('1')),
        });
      });
    });
  });

  describe('Updating access controls', () => {
    it('Can update access controls as admin', async () => {
      const currentAccessControlsAddress = await this.garmentCollection.accessControls();
      await this.garmentCollection.updateAccessControls(smartContract, {from: admin});
      expect(await this.garmentCollection.accessControls()).to.be.equal(smartContract);
      expect(await this.garmentCollection.accessControls()).to.not.equal(currentAccessControlsAddress);
    });

    it('Reverts when sender is not admin', async () => {
      await expectRevert(
          this.garmentCollection.updateAccessControls(smartContract, {from: randomAddress}),
          "DigitalaxGarmentCollection.updateAccessControls: Sender must be admin"
      );
    });
  });

  describe('getters', async () => {
    beforeEach(async () => {
      await this.garmentCollection.mintCollection(randomTokenURI, designer, COLLECTION_SIZE, auctionID, 'Common', erc1155ChildStrandIds, amountsOfChildToken, {from: minter});
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
