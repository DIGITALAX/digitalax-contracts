const {expectRevert} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const onlyAdminRoleErrorGrantMsg = "AccessControl: sender must be an admin to grant";
const onlyAdminRoleErrorRevokeMsg = "AccessControl: sender must be an admin to revoke";

contract('DigitalaxAccessControls', (accounts) => {
    const [admin, minter, smart_contract, verifiedMinter, anotherAccount] = accounts;

    beforeEach(async function () {
        this.accessControls = await DigitalaxAccessControls.new({from: admin});
    });

    describe('MINTER_ROLE', async function () {
        beforeEach(async function () {
            expect(await this.accessControls.hasAdminRole(admin)).to.equal(true); // creator is admin
            expect(await this.accessControls.hasMinterRole(minter)).to.equal(false);
            await this.accessControls.addMinterRole(minter, {from: admin});
        });

        it('should allow admin to add minters', async function () {
            expect(await this.accessControls.hasMinterRole(minter)).to.equal(true);
        });

        it('should allow admin to remove minters', async function () {
            expect(await this.accessControls.hasMinterRole(minter)).to.equal(true);
            await this.accessControls.removeMinterRole(minter, {from: admin});
            expect(await this.accessControls.hasMinterRole(minter)).to.equal(false);
        });

        it('should revert if not admin', async function () {
            await expectRevert(
                this.accessControls.addMinterRole(minter, {from: anotherAccount}),
                onlyAdminRoleErrorGrantMsg
            );
        });

        it('should revert even if minter is adding already a minter', async function () {
            await expectRevert(
                this.accessControls.addMinterRole(anotherAccount, {from: minter}),
                onlyAdminRoleErrorGrantMsg
            );
        });

        it('should revert if does not have the correct role', async function () {
            expect(await this.accessControls.hasMinterRole(minter)).to.equal(true);
            await this.accessControls.removeMinterRole(minter, {from: admin});
            await expectRevert(
                this.accessControls.removeMinterRole(minter, {from: anotherAccount}),
                onlyAdminRoleErrorRevokeMsg
            );
        });
    });

    describe('VERIFIED_MINTER_ROLE', async function() {
      beforeEach(async function() {
        expect(await this.accessControls.hasAdminRole(admin)).to.equal(true); // creator is admin
        expect(await this.accessControls.hasVerifiedMinterRole(verifiedMinter)).to.equal(false);
        await this.accessControls.addVerifiedMinterRole(verifiedMinter, { from: admin });
      });

      it('should allow admin to add verified minters', async function() {
        expect(await this.accessControls.hasVerifiedMinterRole(verifiedMinter)).to.equal(true);
      });

      it('should allow admin to remove verified minters', async function() {
        expect(await this.accessControls.hasVerifiedMinterRole(verifiedMinter)).to.equal(true);
        await this.accessControls.removeVerifiedMinterRole(verifiedMinter, { from: admin });
        expect(await this.accessControls.hasVerifiedMinterRole(verifiedMinter)).to.equal(false);
      });

      it('should revert if not admin', async function() {
        await expectRevert(
          this.accessControls.addVerifiedMinterRole(verifiedMinter, { from: verifiedMinter }),
          onlyAdminRoleErrorGrantMsg,
        );
      });

      it('should revert even if minter is adding already a verified minter', async function() {
        await expectRevert(
          this.accessControls.addVerifiedMinterRole(verifiedMinter, { from: verifiedMinter }),
          onlyAdminRoleErrorGrantMsg,
        );
      });

      it('should revert if does not have the correct role', async function() {
        expect(await this.accessControls.hasVerifiedMinterRole(verifiedMinter)).to.equal(true);
        await this.accessControls.removeVerifiedMinterRole(verifiedMinter, { from: admin });
        await expectRevert(
          this.accessControls.removeVerifiedMinterRole(verifiedMinter, { from: verifiedMinter }),
          onlyAdminRoleErrorRevokeMsg,
        );
      });
    });

    describe('SMART_CONTRACT_ROLE', async function () {
        beforeEach(async function () {
            expect(await this.accessControls.hasAdminRole(admin)).to.equal(true); // creator is admin
            expect(await this.accessControls.hasSmartContractRole(minter)).to.equal(false);
            await this.accessControls.addSmartContractRole(smart_contract, {from: admin});
        });

        it('should allow admin to add smart contracts', async function () {
            expect(await this.accessControls.hasSmartContractRole(smart_contract)).to.equal(true);
        });

        it('should allow admin to remove contracts', async function () {
            expect(await this.accessControls.hasSmartContractRole(smart_contract)).to.equal(true);
            await this.accessControls.removeSmartContractRole(smart_contract, {from: admin});
            expect(await this.accessControls.hasSmartContractRole(smart_contract)).to.equal(false);
        });

        it('should revert if not admin when adding', async function () {
            await expectRevert(
                this.accessControls.addSmartContractRole(smart_contract, {from: anotherAccount}),
                onlyAdminRoleErrorGrantMsg
            );
        });

        it('should revert even if smart_contract is adding already a smart_contract', async function () {
          await expectRevert(
            this.accessControls.addMinterRole(anotherAccount, {from: smart_contract}),
            onlyAdminRoleErrorGrantMsg
          );
        });

        it('should revert if not admin when removing', async function () {
            expect(await this.accessControls.hasSmartContractRole(smart_contract)).to.equal(true);
            await expectRevert(
                this.accessControls.removeSmartContractRole(smart_contract, {from: anotherAccount}),
                onlyAdminRoleErrorRevokeMsg
            );
        });
    });

    describe('DEFAULT_ADMIN_ROLE', async function () {
        beforeEach(async function () {
            expect(await this.accessControls.hasAdminRole(admin)).to.equal(true); // creator is admin
            expect(await this.accessControls.hasAdminRole(minter)).to.equal(false);
            await this.accessControls.addAdminRole(minter, {from: admin});
        });

        it('should allow admin to add admin', async function () {
            expect(await this.accessControls.hasAdminRole(minter)).to.equal(true);
        });

        it('should allow admin to remove admin', async function () {
            expect(await this.accessControls.hasAdminRole(minter)).to.equal(true);
            await this.accessControls.removeAdminRole(minter, {from: admin});
            expect(await this.accessControls.hasAdminRole(minter)).to.equal(false);
        });

        it('should revert if already has minter role', async function () {
            await expectRevert(
                this.accessControls.addAdminRole(minter, {from: anotherAccount}),
                onlyAdminRoleErrorGrantMsg
            );
        });

        it('should revert if does not have the correct role', async function () {
            expect(await this.accessControls.hasAdminRole(minter)).to.equal(true);
            await this.accessControls.removeAdminRole(minter, {from: admin});
            await expectRevert(
                this.accessControls.removeAdminRole(minter, {from: anotherAccount}),
                onlyAdminRoleErrorRevokeMsg
            );
        });
    });
});
