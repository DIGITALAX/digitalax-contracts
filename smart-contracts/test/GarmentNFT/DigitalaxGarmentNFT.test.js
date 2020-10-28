const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const web3 = require('web3');

const { expect } = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');

contract('Core ERC721 tests for DigitalaxGarmentNFT', function ([admin, minter, owner, smart_contract, designer,random]) {
    const randomURI = 'rand';

    const TOKEN_ONE_ID = new BN('1');

    const emptyData = web3.utils.encodePacked("");

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
                    "DigitalaxGarmentNFT.assertMintingParamsValid: Token URI is empty"
                );
            });

            it('When designer is address ZERO', async () => {
                await expectRevert(
                    this.token.mint(minter, randomURI, ZERO_ADDRESS, {from: minter}),
                    "DigitalaxGarmentNFT.assertMintingParamsValid: Designer is zero address"
                );
            });
        });

        describe('Admin function', () => {
            it('When sender does not have a DEFAULT_ADMIN_ROLE role', async () => {
                await this.token.mint(minter, randomURI, designer, {from: minter});
                await expectRevert(
                    this.token.setTokenURI('1', randomURI, {from: minter}),
                    "DigitalaxGarmentNFT.setTokenURI: Sender must have the admin role"
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

    describe('Updating access controls', () => {
       it('Can update access controls as admin', async () => {
           const currentAccessControlsAddress = await this.token.accessControls();
           await this.token.updateAccessControls(smart_contract, {from: admin});
           expect(await this.token.accessControls()).to.be.equal(smart_contract);
           expect(await this.token.accessControls()).to.not.equal(currentAccessControlsAddress);
       })
    });

    describe('Wrapping 1155 Child Tokens', () => {
      describe('Reverts', () => {
        describe('When wrapping a single strand', () => {
          it('If referencing a token that does not exist', async () => {
            const initialSupply = '2';
            const beneficiary = this.token.address; // as we want to 'link'
            const strandUri = 'strand1'; // not important for this test
            const garmentTokenIdEncoded = web3.utils.encodePacked(TOKEN_ONE_ID.toString());
            await expectRevert(
              this.digitalaxMaterials.createStrand(
                initialSupply,
                beneficiary,
                strandUri,
                garmentTokenIdEncoded,
                {from: minter}
              ),
              "Token does not exist"
            );
          });
        });

        describe('When batch wrapping multiple strands', () => {
          it('If referencing a token that does not exist', async () => {
            const garmentTokenIdEncoded = web3.utils.encodePacked(TOKEN_ONE_ID.toString());
            const strand1Supply = '1';
            const strand2Supply = '2';
            const strand3Supply = '2';
            await expectRevert(
              this.digitalaxMaterials.batchCreateStrands(
                [strand1Supply, strand2Supply, strand3Supply],
                this.token.address,
                ['strand1', 'strand2', 'strand3'],
                [garmentTokenIdEncoded, garmentTokenIdEncoded, garmentTokenIdEncoded],
                {from: admin}
              ),
              "Token does not exist"
            );
          });
        });
      });

       describe('When the garment or strand dont exist', () => {
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
           await this.digitalaxMaterials.createStrand(
             initialSupply,
             beneficiary,
             strandUri,
             garmentTokenIdEncoded,
             {from: minter}
           ); // This will create strand ID [1]

           const STRAND_ONE_ID = TOKEN_ONE_ID;
           const garment1Strand1Balance = await this.token.childBalance(
             TOKEN_ONE_ID,
             this.digitalaxMaterials.address,
             STRAND_ONE_ID
           );

           expect(garment1Strand1Balance).to.be.bignumber.equal(initialSupply);

           const garment1StrandIdsOwned = await this.token.childIdsForOn(
             TOKEN_ONE_ID,
             this.digitalaxMaterials.address
           );

           expect(garment1StrandIdsOwned.length).to.be.equal(1);
           expect(garment1StrandIdsOwned[0]).to.be.bignumber.equal(STRAND_ONE_ID);

           // Check that the 1155 correctly reports the balance on the ERC721
           expect(await this.digitalaxMaterials.balanceOf(this.token.address, STRAND_ONE_ID)).to.be.bignumber.equal(initialSupply);
         });
       });

       describe('Multiple strands', () => {
         it('Can link multiple strands to a garment', async () => {
           // Mint the garment - ERC721 Token ID [1]
           await this.token.mint(
             owner,
             randomURI,
             designer,
             {from: minter}
           );

           const garmentTokenIdEncoded = web3.utils.encodePacked(TOKEN_ONE_ID.toString());
           const strand1Supply = '1';
           const strand2Supply = '2';
           const strand3Supply = '2';
           await this.digitalaxMaterials.batchCreateStrands(
             [strand1Supply, strand2Supply, strand3Supply],
             this.token.address,
             ['strand1', 'strand2', 'strand3'],
             [garmentTokenIdEncoded, garmentTokenIdEncoded, garmentTokenIdEncoded],
             {from: admin}
           ); // This will create strand IDs [1, 2, 3] and link to Garment Token ID 1

           const STRAND_ONE_ID = new BN('1');
           const STRAND_TWO_ID = new BN('2');
           const STRAND_THREE_ID = new BN('3');

           const garment1Strand1Balance = await this.token.childBalance(
             TOKEN_ONE_ID,
             this.digitalaxMaterials.address,
             STRAND_ONE_ID
           );
           expect(garment1Strand1Balance).to.be.bignumber.equal(strand1Supply);

           const garment1Strand2Balance = await this.token.childBalance(
             TOKEN_ONE_ID,
             this.digitalaxMaterials.address,
             STRAND_TWO_ID
           );
           expect(garment1Strand2Balance).to.be.bignumber.equal(strand2Supply);

           const garment1Strand3Balance = await this.token.childBalance(
             TOKEN_ONE_ID,
             this.digitalaxMaterials.address,
             STRAND_THREE_ID
           );
           expect(garment1Strand3Balance).to.be.bignumber.equal(strand3Supply);

           const garment1StrandIdsOwned = await this.token.childIdsForOn(
             TOKEN_ONE_ID,
             this.digitalaxMaterials.address
           );

           expect(garment1StrandIdsOwned.length).to.be.equal(3);
           expect(garment1StrandIdsOwned[0]).to.be.bignumber.equal(STRAND_ONE_ID);
           expect(garment1StrandIdsOwned[1]).to.be.bignumber.equal(STRAND_TWO_ID);
           expect(garment1StrandIdsOwned[2]).to.be.bignumber.equal(STRAND_THREE_ID);

           // Check that the 1155 correctly reports the balance on the ERC721 for each strand
           expect(await this.digitalaxMaterials.balanceOf(this.token.address, STRAND_ONE_ID)).to.be.bignumber.equal(strand1Supply);
           expect(await this.digitalaxMaterials.balanceOf(this.token.address, STRAND_TWO_ID)).to.be.bignumber.equal(strand2Supply);
           expect(await this.digitalaxMaterials.balanceOf(this.token.address, STRAND_THREE_ID)).to.be.bignumber.equal(strand3Supply);
         });
       });
    });
})
