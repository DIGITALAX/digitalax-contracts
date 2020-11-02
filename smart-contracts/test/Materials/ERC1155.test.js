const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const web3 = require('web3');
const { expect } = require('chai');

const { shouldBehaveLikeERC1155 } = require('./ERC1155.behavior');
const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');

contract('DigitalaxMaterials 1155 behaviour tests', function ([admin, operator, tokenHolder, tokenBatchHolder, ...otherAccounts]) {
  const name = "DigitalaxMaterials";
  const symbol = "DXM";

  const initialURI = 'https://token-cdn-domain/{id}.json';
  const emptyData = web3.utils.encodePacked('');

  const STRAND_ONE_ID = '1';

  beforeEach(async function () {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addSmartContractRole(operator, {from: admin});
    await this.accessControls.addSmartContractRole(otherAccounts[0], {from: admin}); // zero index is minter in the behaviour test

    this.token = await DigitalaxMaterials.new(
      name,
      symbol,
      this.accessControls.address,
      {from: admin}
    );

    expect(await this.token.name()).to.be.equal(name);
    expect(await this.token.symbol()).to.be.equal(symbol);

    await this.token.createStrand(initialURI, {from: operator});
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
          this.token.mintStrand(STRAND_ONE_ID, mintAmount, ZERO_ADDRESS, emptyData, {from: operator}),
          'ERC1155: mint to the zero address',
        );
      });

      context('with minted tokens', function () {
        beforeEach(async function () {
          ({ logs: this.logs } = await this.token.mintStrand(
              STRAND_ONE_ID,
              mintAmount,
              tokenHolder,
              emptyData,
              { from: operator }
            )
          );
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
        await this.token.batchCreateStrands(
          [initialURI, initialURI, initialURI],
          {from: operator}
        );
      });

      it('reverts with a zero destination address', async function () {
        await expectRevert(
          this.token.batchMintStrands(tokenBatchIds, mintAmounts, ZERO_ADDRESS, web3.utils.encodePacked(''), {from: operator}),
          'ERC1155: mint to the zero address',
        );
      });

      it('reverts if length of inputs do not match', async function () {
        await expectRevert(
          this.token.batchMintStrands(tokenBatchIds, mintAmounts.slice(1), tokenBatchHolder, web3.utils.encodePacked(''), {from: operator}),
          'DigitalaxMaterials.batchMintStrands: Array lengths are invalid',
        );

        await expectRevert(
          this.token.batchMintStrands(tokenBatchIds.slice(1), mintAmounts, tokenBatchHolder, web3.utils.encodePacked(''), {from: operator}),
          'DigitalaxMaterials.batchMintStrands: Array lengths are invalid',
        );
      });

      context('with minted batch of tokens', function () {
        beforeEach(async function () {
          ({ logs: this.logs } = await this.token.batchMintStrands(
            tokenBatchIds,
            mintAmounts,
            tokenBatchHolder,
            web3.utils.encodePacked(''),
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
            expect(holderBatchBalances[i]).to.be.bignumber.equal(mintAmounts[i]);
          }
        });
      });
    });
  });

  describe('ERC1155MetadataURI', function () {
    const secondTokenID = new BN('2');

    const secondTokenURI = 'random';

    it('sets the first token URI correctly', async function() {
      expect(await this.token.uri(STRAND_ONE_ID)).to.be.equal(initialURI);
    });

    it('sets the first and second token URI correctly', async function() {
      expect(await this.token.uri(STRAND_ONE_ID)).to.be.equal(initialURI);

      await this.token.createStrand(secondTokenURI, {from: otherAccounts[0]});
      expect(await this.token.uri(secondTokenID)).to.be.equal(secondTokenURI);
    });
  });
});
