const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const web3 = require('web3');

const { expect } = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');

contract('Core ERC721 tests for DigitalaxGarmentNFT', function ([admin, minter, owner, smart_contract, designer, random]) {
    const randomURI = 'rand';

    const TOKEN_ONE_ID = new BN('1');

    const STRAND_ONE_ID = new BN('1');
    const STRAND_TWO_ID = new BN('2');
    const STRAND_THREE_ID = new BN('3');

    const randomStrandId = 'randomStrandId';

    beforeEach(async () => {
        this.accessControls = await DigitalaxAccessControls.new({from: admin});
        await this.accessControls.addMinterRole(admin, {from: admin});
        await this.accessControls.addMinterRole(minter, {from: admin});
        await this.accessControls.addSmartContractRole(smart_contract, {from: admin});

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

        this.factory = await DigitalaxGarmentFactory.new(
          this.token.address,
          this.digitalaxMaterials.address,
          this.accessControls.address,
          {from: admin}
        );

        await this.accessControls.addSmartContractRole(this.factory.address, {from: admin});
    });

    describe('Reverts', () => {
        describe('Minting', () => {
            it('When sender does not have a MINTER or SMART_CONTRACT role', async () => {
                await expectRevert(
                    this.token.mint(minter, randomURI, designer, {from: random}),
                    "DigitalaxGarmentNFT.mint: Sender must have the minter or contract role"
                );
            });

            it('When token URI is empty', async () => {
                await expectRevert(
                    this.token.mint(minter, '', designer, {from: minter}),
                    "DigitalaxGarmentNFT._assertMintingParamsValid: Token URI is empty"
                );
            });

            it('When designer is address ZERO', async () => {
                await expectRevert(
                    this.token.mint(minter, randomURI, ZERO_ADDRESS, {from: minter}),
                    "DigitalaxGarmentNFT._assertMintingParamsValid: Designer is zero address"
                );
            });
        });

        describe('Admin function', () => {
            it('When sender does not have a DEFAULT_ADMIN_ROLE role or SMART_CONTRACT', async () => {
                await this.token.mint(minter, randomURI, designer, {from: minter});
                await expectRevert(
                    this.token.setTokenURI('1', randomURI, {from: minter}),
                    "DigitalaxGarmentNFT.setTokenURI: Sender must be an authorised contract or admin"
                );
            });
        });
    });

    describe('Minting validation', () => {
        it('Correctly stored the designer', async () => {
            await this.token.mint(owner, randomURI, designer, {from: minter});
            expect(await this.token.exists(TOKEN_ONE_ID)).to.be.true;
            expect(await this.token.garmentDesigners(TOKEN_ONE_ID)).to.be.equal(designer);
        });

        it('Mints with the SMART_CONTRACT role', async () => {
            await this.token.mint(owner, randomURI, designer, {from: smart_contract});
            expect(await this.token.garmentDesigners(TOKEN_ONE_ID)).to.be.equal(designer);
        });
    });

    describe('Primary sale price', () => {
        const examplePrimarySalePrice = new BN('500');

        beforeEach(async () => {
            await this.token.mint(
                owner,
                randomURI,
                designer,
                {
                    from: minter
                }
            );
        });

        it('Can set the primary sale price as an admin', async () => {
            expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal('0');
            await this.token.setPrimarySalePrice(TOKEN_ONE_ID, examplePrimarySalePrice, {from: admin});
            expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal(examplePrimarySalePrice);
        });

        it('Can set the primary sale price as a smart contract', async () => {
            expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal('0');
            await this.token.setPrimarySalePrice(TOKEN_ONE_ID, examplePrimarySalePrice, {from: smart_contract});
            expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal(examplePrimarySalePrice);
        });

        it('Reverts when setting the primary sale price as non-admin, non-smart contract', async () => {
            await expectRevert(
                this.token.setPrimarySalePrice(TOKEN_ONE_ID, examplePrimarySalePrice, {from: designer}),
                "DigitalaxGarmentNFT.setPrimarySalePrice: Sender must be an authorised contract or admin"
            );
        });

        it('Reverts when setting the primary sale price for non-existent token', async () => {
            await expectRevert(
                this.token.setPrimarySalePrice('2', examplePrimarySalePrice, {from: admin}),
                "DigitalaxGarmentNFT.setPrimarySalePrice: Token does not exist"
            );
        });

        it('Reverts when setting the primary sale price as zero', async () => {
            await expectRevert(
                this.token.setPrimarySalePrice(TOKEN_ONE_ID, '0', {from: admin}),
                "DigitalaxGarmentNFT.setPrimarySalePrice: Invalid sale price"
            );
        });
    });

    describe('Updating primary sale price', () => {

      beforeEach(async () => {
        await this.token.mint(owner, randomURI, designer, {from: minter});
      });

      it('Can update as admin', async () => {
        expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal("0");
        await this.token.setPrimarySalePrice(TOKEN_ONE_ID, "20", {from: admin});
        expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal("20");
      });

      it('Can update as smart contract', async () => {
        expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal("0");
        await this.token.setPrimarySalePrice(TOKEN_ONE_ID, "20", {from: smart_contract});
        expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal("20");
      });

      it('Only records first time it happens', async () => {
        expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal("0");
        await this.token.setPrimarySalePrice(TOKEN_ONE_ID, "20", {from: smart_contract});
        expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal("20");

        // change again
        await this.token.setPrimarySalePrice(TOKEN_ONE_ID, "30", {from: smart_contract});

        // Still 20
        expect(await this.token.primarySalePrice(TOKEN_ONE_ID)).to.be.bignumber.equal("20");
      });

      it('Emits an event the first time it is set', async () => {
        const {receipt} = await this.token.setPrimarySalePrice(TOKEN_ONE_ID, "30", {from: smart_contract});
        await expectEvent(receipt, 'TokenPrimarySalePriceSet', {
          _tokenId: TOKEN_ONE_ID,
          _salePrice: "30"
        });
      });

      it('Reverts when sender is not admin or smart contract', async () => {
        await expectRevert(
          this.token.updateMaxChildrenPerToken("10", {from: random}),
          "DigitalaxGarmentNFT.updateMaxChildrenPerToken: Sender must be admin"
        );
      });
    });

    describe('Updating access controls', () => {
       it('Can update access controls as admin', async () => {
           const currentAccessControlsAddress = await this.token.accessControls();
           await this.token.updateAccessControls(smart_contract, {from: admin});
           expect(await this.token.accessControls()).to.be.equal(smart_contract);
           expect(await this.token.accessControls()).to.not.equal(currentAccessControlsAddress);
       });

       it('Reverts when sender is not admin', async () => {
         await expectRevert(
           this.token.updateAccessControls(smart_contract, {from: random}),
           "DigitalaxGarmentNFT.updateAccessControls: Sender must be admin"
         );
       });
    });

    describe('Updating maxChildrenPerToken', () => {
       it('Can update access controls as admin', async () => {
           expect(await this.token.maxChildrenPerToken()).to.be.bignumber.equal("10");
           await this.token.updateMaxChildrenPerToken("20", {from: admin});
           expect(await this.token.maxChildrenPerToken()).to.be.bignumber.equal("20");
       });

       it('Reverts when sender is not admin', async () => {
         await expectRevert(
           this.token.updateMaxChildrenPerToken("10", {from: random}),
           "DigitalaxGarmentNFT.updateMaxChildrenPerToken: Sender must be admin"
         );
       });
    });

    describe('Wrapping 1155 Child Tokens', () => {
      describe('General', () => {
        describe('Given a garment token that does not exist', () => {
          it('Returns an empty array for childContractsFor()', async () => {
            expect(await this.token.childContractsFor('999')).to.be.deep.equal([]);
          });

          it('Returns an empty array for childIdsForOn()', async () => {
            expect(await this.token.childIdsForOn('999', this.digitalaxMaterials.address)).to.be.deep.equal([]);
            expect(await this.token.childIdsForOn('999', smart_contract)).to.be.deep.equal([]);
          });
        });
      });

      describe('Reverts', () => {
        describe('When wrapping a single strand', () => {
          it('If referencing a token that does not exist', async () => {
            const initialSupply = '2';
            const beneficiary = this.token.address; // as we want to 'link'
            const strandUri = 'strand1'; // not important for this test
            const garmentTokenIdEncoded = web3.utils.encodePacked(TOKEN_ONE_ID.toString());

            await this.digitalaxMaterials.createChild(
              strandUri,
              {from: smart_contract}
            );

            await expectRevert(
              this.digitalaxMaterials.mintChild(
                STRAND_ONE_ID,
                initialSupply,
                beneficiary,
                garmentTokenIdEncoded,
                {from: smart_contract}
              ),
              "Token does not exist"
            );
          });

          it('If not supplying a token reference', async () => {
            const initialSupply = '2';
            const beneficiary = this.token.address; // as we want to 'link'
            const strandUri = 'strand1'; // not important for this test

            await this.digitalaxMaterials.createChild(
              strandUri,
              {from: smart_contract}
            );

            await expectRevert(
              this.digitalaxMaterials.mintChild(
                STRAND_ONE_ID,
                initialSupply,
                beneficiary,
                "0x0",
                {from: smart_contract}
              ),
              "ERC998: data must contain the unique uint256 tokenId to transfer the child token to"
            );
          });
        });

        describe('When batch wrapping multiple strands', () => {
          beforeEach(async () => {
            await this.digitalaxMaterials.batchCreateChildren(
              ['strand1', 'strand2', 'strand3'],
              {from: smart_contract}
            ); // This will create strand IDs [1, 2, 3]
          });

          it('If referencing a token that does not exist', async () => {
            const garmentTokenIdEncoded = web3.utils.encodePacked(TOKEN_ONE_ID.toString());
            const strand1Supply = '1';
            const strand2Supply = '2';
            const strand3Supply = '2';
            await expectRevert(
              this.digitalaxMaterials.batchMintChildren(
                [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID],
                [strand1Supply, strand2Supply, strand3Supply],
                this.token.address,
                garmentTokenIdEncoded,
                {from: smart_contract}
              ),
              "Token does not exist"
            );
          });

          it('If not supplying a token reference', async () => {
            const strand1Supply = '1';
            const strand2Supply = '2';
            const strand3Supply = '2';
            await expectRevert(
              this.digitalaxMaterials.batchMintChildren(
                [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID],
                [strand1Supply, strand2Supply, strand3Supply],
                this.token.address,
                '0x0',
                {from: smart_contract}
              ),
              "ERC998: data must contain the unique uint256 tokenId to transfer the child token to"
            );
          });
        });
      });

      describe('Wrapping through minting (ether from creating or minting methods)', () => {
        describe('Single strand', () => {
          it('Given a garment, can mint a new strand and automatically link to the garment', async () => {
            // Mint the garment - ERC721 Token ID [1]
            await this.token.mint(
              owner,
              randomURI,
              designer,
              {from: minter}
            );

            // Create a new strand and link it to Garment ID [1]
            const initialSupply = '2';
            const beneficiary = this.token.address; // as we want to 'link'
            const strandUri = 'strand1'; // not important for this test
            const garmentTokenIdEncoded = web3.utils.encodePacked(TOKEN_ONE_ID.toString());

            await this.digitalaxMaterials.createChild(
              strandUri,
              {from: smart_contract}
            ); // This will create strand ID [1]

            await this.digitalaxMaterials.mintChild(
              STRAND_ONE_ID,
              initialSupply,
              beneficiary,
              garmentTokenIdEncoded,
              {from: smart_contract}
            );

            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, initialSupply);
            await expectGarmentToOwnAGivenSetOfStrandIds(TOKEN_ONE_ID, [STRAND_ONE_ID]);

            // Check that the 1155 correctly reports the balance on the ERC721
            expect(await this.digitalaxMaterials.balanceOf(this.token.address, STRAND_ONE_ID)).to.be.bignumber.equal(initialSupply);

            const childContracts = await this.token.childContractsFor(TOKEN_ONE_ID);
            expect(childContracts.length).to.be.equal(1);
            expect(childContracts[0]).to.be.equal(this.digitalaxMaterials.address);
          });
        });

        describe('Multiple strands', () => {
          const garmentTokenIdEncoded = web3.utils.encodePacked(TOKEN_ONE_ID.toString());

          beforeEach(async () => {
            // Mint the garment - ERC721 Token ID [1]
            await this.token.mint(
              owner,
              randomURI,
              designer,
              {from: smart_contract}
            );
          });

          it
          ('Can link multiple strands to a garment at creation of strands', async () => {
            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, '0');
            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_TWO_ID, '0');
            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_THREE_ID, '0');

            const strand1Supply = '1';
            const strand2Supply = '2';
            const strand3Supply = '2';

            await this.digitalaxMaterials.batchCreateChildren(
              ['strand1', 'strand2', 'strand3'],
              {from: smart_contract}
            ); // This will create strand IDs [1, 2, 3]

            await this.digitalaxMaterials.batchMintChildren(
              [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID],
              [strand1Supply, strand2Supply, strand3Supply],
              this.token.address,
              garmentTokenIdEncoded,
              {from: smart_contract}
            ); // This will mint for strand IDs [1, 2, 3] and link to Garment Token ID 1

            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, strand1Supply);
            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_TWO_ID, strand2Supply);
            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_THREE_ID, strand3Supply);

            await expectGarmentToOwnAGivenSetOfStrandIds(TOKEN_ONE_ID, [
              STRAND_ONE_ID,
              STRAND_TWO_ID,
              STRAND_THREE_ID
            ]);

            // Check that the 1155 correctly reports the balance on the ERC721 for each strand
            expect(await this.digitalaxMaterials.balanceOf(this.token.address, STRAND_ONE_ID)).to.be.bignumber.equal(strand1Supply);
            expect(await this.digitalaxMaterials.balanceOf(this.token.address, STRAND_TWO_ID)).to.be.bignumber.equal(strand2Supply);
            expect(await this.digitalaxMaterials.balanceOf(this.token.address, STRAND_THREE_ID)).to.be.bignumber.equal(strand3Supply);
          });

          describe('Given multiple strands are created', () => {
            beforeEach(async () => {
              await this.digitalaxMaterials.batchCreateChildren(
                ['strand1', 'strand2', 'strand3'],
                {from: smart_contract}
              ); // This will create strand IDs [1, 2, 3]
            });

            it('use batchMintChildren() to link to a garment', async () => {
              await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, '0');
              await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_TWO_ID, '0');
              await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_THREE_ID, '0');

              await this.digitalaxMaterials.batchMintChildren(
                [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID],
                ['1', '1', '1'], // mint one of each
                this.token.address,
                garmentTokenIdEncoded,
                {from: smart_contract}
              ); // This will mint 1 of strand IDs [1, 2, 3] and link to garment ID [1]

              await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, '1');
              await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_TWO_ID, '1');
              await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_THREE_ID, '1');

              await expectGarmentToOwnAGivenSetOfStrandIds(TOKEN_ONE_ID, [
                STRAND_ONE_ID,
                STRAND_TWO_ID,
                STRAND_THREE_ID
              ]);
            });
          });
        });
      });

      describe('Wrapping through transfers (where minting has already taken place)', () => {
        beforeEach(async () => {
          // Mint the garment - ERC721 Token ID [1]
          await this.token.mint(
            owner,
            randomURI,
            designer,
            {from: smart_contract}
          );

          await this.digitalaxMaterials.batchCreateChildren(
            ['strand1', 'strand2', 'strand3'],
            {from: smart_contract}
          ); // This will create strand IDs [1, 2, 3]

          await this.digitalaxMaterials.batchMintChildren(
            [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID],
            ['1', '1', '1'],
            owner,
            web3.utils.encodePacked(""),
            {from: smart_contract}
          );
        });

        describe('Single strand', () => {
          it('Successfully wraps through a transfer', async () => {
            await this.digitalaxMaterials.safeTransferFrom(
              owner,
              this.token.address,
              STRAND_ONE_ID,
              '1',
              web3.utils.encodePacked(TOKEN_ONE_ID.toString()),
              {from: owner}
            );

            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, '1');
            await expectGarmentToOwnAGivenSetOfStrandIds(TOKEN_ONE_ID, [STRAND_ONE_ID]);
          });
        });

        describe('Multiple strands', () => {
          it('Successfully wraps through a transfer', async () => {
            await this.digitalaxMaterials.safeBatchTransferFrom(
              owner,
              this.token.address,
              [STRAND_ONE_ID, STRAND_TWO_ID],
              ['1', '1'],
              web3.utils.encodePacked(TOKEN_ONE_ID.toString()),
              {from: owner}
            );

            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, '1');
            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_TWO_ID, '1');
            await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_THREE_ID, '0');
            await expectGarmentToOwnAGivenSetOfStrandIds(TOKEN_ONE_ID, [STRAND_ONE_ID, STRAND_TWO_ID]);
          });
        });
      });
    });

    describe('burn()', () => {
      it('Can obtain the strands of a garment by burning', async () => {
        expect(await this.digitalaxMaterials.tokenIdPointer()).to.be.bignumber.equal('0');

        await this.factory.createNewChildren(
          [randomStrandId,randomStrandId,randomStrandId],
          {from: minter}
        ); // will create strand ID [1], [2], [3]

        expect(await this.digitalaxMaterials.tokenIdPointer()).to.be.bignumber.equal('3');

        const strand1Amount = '2';
        const strand2Amount = '9';
        const strand3Amount = '6';

        const childTokenIds = [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID];
        await this.factory.mintParentWithChildren(
          randomURI,
          random,
          childTokenIds,
          [strand1Amount, strand2Amount, strand3Amount],
          owner,
          {from: minter}
        );

        await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, strand1Amount);
        await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_TWO_ID, strand2Amount);
        await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_THREE_ID, strand3Amount);
        await expectGarmentToOwnAGivenSetOfStrandIds(TOKEN_ONE_ID, childTokenIds);

        expect(await this.digitalaxMaterials.balanceOf(owner, STRAND_ONE_ID)).to.be.bignumber.equal('0');
        expect(await this.digitalaxMaterials.balanceOf(owner, STRAND_TWO_ID)).to.be.bignumber.equal('0');
        expect(await this.digitalaxMaterials.balanceOf(owner, STRAND_THREE_ID)).to.be.bignumber.equal('0');

        await this.token.burn(TOKEN_ONE_ID, {from: owner});

        expect(await this.digitalaxMaterials.balanceOf(owner, STRAND_ONE_ID)).to.be.bignumber.equal(strand1Amount);
        expect(await this.digitalaxMaterials.balanceOf(owner, STRAND_TWO_ID)).to.be.bignumber.equal(strand2Amount);
        expect(await this.digitalaxMaterials.balanceOf(owner, STRAND_THREE_ID)).to.be.bignumber.equal(strand3Amount);
      });

      it('Can obtain a single strand of a garment by burning', async () => {
        expect(await this.digitalaxMaterials.tokenIdPointer()).to.be.bignumber.equal('0');

        await this.factory.createNewChild(
          randomURI,
          {from: minter}
        ); // will create strand ID [1]

        expect(await this.digitalaxMaterials.tokenIdPointer()).to.be.bignumber.equal('1');

        const strand1Amount = '6';

        const childTokenIds = [STRAND_ONE_ID];
        await this.factory.mintParentWithChildren(
          randomURI,
          random,
          childTokenIds,
          [strand1Amount],
          owner,
          {from: minter}
        );

        await expectStrandBalanceOfGarmentToBe(TOKEN_ONE_ID, STRAND_ONE_ID, strand1Amount);
        await expectGarmentToOwnAGivenSetOfStrandIds(TOKEN_ONE_ID, childTokenIds);

        expect(await this.digitalaxMaterials.balanceOf(owner, STRAND_ONE_ID)).to.be.bignumber.equal('0');

        await this.token.burn(TOKEN_ONE_ID, {from: owner});

        expect(await this.digitalaxMaterials.balanceOf(owner, STRAND_ONE_ID)).to.be.bignumber.equal(strand1Amount);
      });

      it('Can burn a garment that does not have any strands', async () => {
        expect(await this.digitalaxMaterials.tokenIdPointer()).to.be.bignumber.equal('0');

        await this.token.mint(owner, randomURI, smart_contract);

        expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.equal(owner);
        expect(await this.digitalaxMaterials.tokenIdPointer()).to.be.bignumber.equal('0');

        await this.token.burn(TOKEN_ONE_ID, {from: owner});

        await expectRevert(
          this.token.ownerOf(TOKEN_ONE_ID),
          "ERC721: owner query for nonexistent token"
        );
      });
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
})
