const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const { shouldBehaveLikeERC1155 } = require('./ERC1155.behavior');
const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');

contract('DigitalaxMaterials 1155 behaviour tests', function ([admin, operator, tokenHolder, tokenBatchHolder, ...otherAccounts]) {
  const name = "DigitalaxMaterials";
  const symbol = "DXM";

  const initialURI = 'https://token-cdn-domain/{id}.json';

  beforeEach(async function () {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(operator, {from: admin});
    await this.accessControls.addMinterRole(otherAccounts[0], {from: admin}); // zero index is minter in the behaviour test

    this.token = await DigitalaxMaterials.new(
      name,
      symbol,
      this.accessControls.address,
      {from: admin}
    );

    expect(await this.token.name()).to.be.equal(name);
    expect(await this.token.symbol()).to.be.equal(symbol);
  });

  shouldBehaveLikeERC1155(otherAccounts);

  describe('internal functions', function () {
    const tokenId = new BN('1');
    const mintAmount = new BN(9001);
    const burnAmount = new BN(3000);

    const tokenBatchIds = [new BN('1'), new BN('2'), new BN('3')];
    const mintAmounts = [new BN(5000), new BN(10000), new BN(42195)];

    const data = '0x12345678';

    describe('_mint', function () {
      it('reverts with a zero destination address', async function () {
        await expectRevert(
          this.token.createStrand(mintAmount, ZERO_ADDRESS, initialURI, {from: operator}),
          'ERC1155: mint to the zero address',
        );
      });

      context('with minted tokens', function () {
        beforeEach(async function () {
          ({ logs: this.logs } = await this.token.createStrand(mintAmount, tokenHolder, initialURI, { from: operator }));
        });

        it('emits a TransferSingle event', function () {
          expectEvent.inLogs(this.logs, 'TransferSingle', {
            operator,
            from: ZERO_ADDRESS,
            to: tokenHolder,
            id: tokenId,
            value: mintAmount,
          });
        });

        it('credits the minted amount of tokens', async function () {
          expect(await this.token.balanceOf(tokenHolder, tokenId)).to.be.bignumber.equal(mintAmount);
        });
      });
    });

    describe('_mintBatch', function () {
      beforeEach(async function () {
        await this.token.batchCreateStrand(
          ['1', '1', '1'],
          tokenBatchHolder,
          [initialURI, initialURI, initialURI],
          {from: operator}
        );
      });

      it('reverts with a zero destination address', async function () {
        await expectRevert(
          this.token.batchMintStrands(tokenBatchIds, mintAmounts, ZERO_ADDRESS, {from: operator}),
          'ERC1155: mint to the zero address',
        );
      });

      it('reverts if length of inputs do not match', async function () {
        await expectRevert(
          this.token.batchMintStrands(tokenBatchIds, mintAmounts.slice(1), tokenBatchHolder, {from: operator}),
          'ERC1155: ids and amounts length mismatch',
        );

        await expectRevert(
          this.token.batchMintStrands(tokenBatchIds.slice(1), mintAmounts, tokenBatchHolder, {from: operator}),
          'ERC1155: ids and amounts length mismatch',
        );
      });

      context('with minted batch of tokens', function () {
        beforeEach(async function () {
          ({ logs: this.logs } = await this.token.batchMintStrands(
            tokenBatchIds,
            mintAmounts,
            tokenBatchHolder,
            { from: operator },
          ));
        });

        it('emits a TransferBatch event', function () {
          expectEvent.inLogs(this.logs, 'TransferBatch', {
            operator,
            from: ZERO_ADDRESS,
            to: tokenBatchHolder,
          });
        });

        it('credits the minted batch of tokens', async function () {
          const holderBatchBalances = await this.token.balanceOfBatch(
            new Array(tokenBatchIds.length).fill(tokenBatchHolder),
            tokenBatchIds,
          );

          for (let i = 0; i < holderBatchBalances.length; i++) {
            // add one because of batchCreateStrand
            expect(holderBatchBalances[i]).to.be.bignumber.equal(mintAmounts[i].add(new BN('1')));
          }
        });
      });
    });
  });

  describe('ERC1155MetadataURI', function () {
    const firstTokenID = new BN('1');
    const secondTokenID = new BN('2');

    const secondTokenURI = 'random';

    it('sets the first token URI correctly', async function() {
      await this.token.createStrand('1', tokenHolder, initialURI, {from: otherAccounts[0]});
      expect(await this.token.uri(firstTokenID)).to.be.equal(initialURI);
    });

    it('sets the first and second token URI correctly', async function() {
      await this.token.createStrand('1', tokenHolder, initialURI, {from: otherAccounts[0]});
      expect(await this.token.uri(firstTokenID)).to.be.equal(initialURI);

      await this.token.createStrand('1', tokenHolder, secondTokenURI, {from: otherAccounts[0]});
      expect(await this.token.uri(secondTokenID)).to.be.equal(secondTokenURI);
    });
  });
});
