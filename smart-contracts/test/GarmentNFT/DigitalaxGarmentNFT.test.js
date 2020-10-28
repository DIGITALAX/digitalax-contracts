const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');

contract('Core ERC721 tests for DigitalaxGarmentNFT', function ([admin, minter, owner, smart_contract, designer]) {
    const randomURI = 'rand';

    const TOKEN_ONE_ID = new BN('1');

    beforeEach(async () => {
        this.accessControls = await DigitalaxAccessControls.new({from: admin});
        await this.accessControls.addMinterRole(minter, {from: admin});
        await this.accessControls.addSmartContractRole(smart_contract, {from: admin});

        this.token = await DigitalaxGarmentNFT.new(this.accessControls.address, {from: admin});
    });

    describe('Reverts', () => {
        describe('Minting', () => {
            it('When sender does not have a MINTER or SMART_CONTRACT role', async () => {
                await expectRevert(
                    this.token.mint(minter, randomURI, designer, {from: admin}),
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
})
