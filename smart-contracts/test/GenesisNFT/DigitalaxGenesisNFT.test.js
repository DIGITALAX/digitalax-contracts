const { BN, constants, expectEvent, expectRevert, ether, balance, send} = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxGenesisNFT = artifacts.require('DigitalaxGenesisNFT');
const DigitalaxGenesisNFTMock = artifacts.require('DigitalaxGenesisNFTMock');
const AlwaysRevertingEthReceiver = artifacts.require('AlwaysRevertingEthReceiver');

contract('Core NFT tests for DigitalaxGenesisNFT', function ([admin, multisig, buyer, buyer2, owner, smart_contract, ...otherAccounts]) {
    const ONE_ETH = ether('1');

    const TOKEN_ONE_ID = new BN('1');

    const randomTokenURI = 'ipfs';

    const defaultMaxTokens = '10';

    beforeEach(async () => {
        this.accessControls = await DigitalaxAccessControls.new({from: admin});

        this.token = await DigitalaxGenesisNFTMock.new(
            this.accessControls.address,
            multisig,
            '0',
            '10',
            randomTokenURI,
            {from: admin}
        );
        await this.token.setNowOverride('5');
        await this.token.setMaxGenesisContributionTokensOverride(defaultMaxTokens);
    });

    describe('Transfers', () => {
        it('Reverts when trying to transfer before the end of the genesis', async () => {
            await this.token.buy({from: buyer, value: ONE_ETH});
            await expectRevert(
              this.token.transferFrom(buyer, admin, TOKEN_ONE_ID, {from: buyer}),
                "DigitalaxGenesisNFT._beforeTokenTransfer: Transfers are currently locked at this time"
            );
        });
    });

    describe('buy()', () => {
       it('Successfully buys a genesis NFT', async () => {
           const multisigBalanceTracker = await balance.tracker(multisig);

           const {receipt} = await this.token.buy({from: buyer, value: ONE_ETH});
           await expectEvent(receipt, 'Transfer', {
               from: ZERO_ADDRESS,
               to: buyer,
               tokenId: TOKEN_ONE_ID
           });

           await expectEvent(receipt, 'GenesisPurchased', {
               buyer,
               tokenId: TOKEN_ONE_ID,
               contribution: ONE_ETH
           });

           expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.equal(buyer);
           expect(await this.token.contribution(buyer)).to.be.bignumber.equal(ONE_ETH);
           expect(await multisigBalanceTracker.delta()).to.be.bignumber.equal(ONE_ETH);
           expect(await this.token.totalContributions()).to.be.bignumber.equal(ONE_ETH);
       });

        it('cannot buy() more than max total genesis contribution NFTs', async () => {
          // Set max to 3 for the test
          await this.token.setMaxGenesisContributionTokensOverride("3");

          let startingTokenId = TOKEN_ONE_ID;

          // Buy all genesis NFTs up to max
          for (let i = 1; i <= 3; i++) {
            const buyer = otherAccounts[i];

            // Buy token
            const {receipt} = await this.token.buy({from: buyer, value: ONE_ETH});
            await expectEvent(receipt, 'GenesisPurchased', {
              buyer: buyer,
              tokenId: startingTokenId.toString(),
              contribution: ONE_ETH
            });
            startingTokenId++;
          }

          expect(await this.token.remainingGenesisTokens()).to.be.bignumber.equal('0');

          // expect failure on the 6th as max exceeded
          await expectRevert(
            this.token.buy({from: otherAccounts[6], value: ONE_ETH}),
            "DigitalaxGenesisNFT.buy: Total number of genesis token holders reached"
          );
        });

       it('total contributions are correct for multiple buyers', async () => {
         await this.token.buy({from: buyer, value: ONE_ETH})
         await this.token.buy({from: buyer2, value: ether('0.5')});
         expect(await this.token.totalContributions()).to.be.bignumber.equal(ONE_ETH.add(ether('0.5')));
       });

       it('Reverts when trying to contribute more than the maximum permitted', async () => {
          const maximumContributionAmount = await this.token.maximumContributionAmount();
          await expectRevert(
              this.token.buy({from: buyer, value: maximumContributionAmount.add(ONE_ETH)}),
              "DigitalaxGenesisNFT.buy: You cannot exceed the maximum contribution amount"
          );
       });

       it('Reverts when transfer to multisig fails', async () => {
           this.alwaysRevertingReceiver = await AlwaysRevertingEthReceiver.new();
           this.tokenWithRevertingMultisig = await DigitalaxGenesisNFTMock.new(
               this.accessControls.address,
               this.alwaysRevertingReceiver.address,
               '0',
               '10',
               randomTokenURI,
               {from: admin}
           );
           await this.tokenWithRevertingMultisig.setNowOverride('5');
           await this.tokenWithRevertingMultisig.setMaxGenesisContributionTokensOverride(defaultMaxTokens);

           await expectRevert(
                this.tokenWithRevertingMultisig.buy({from: buyer, value: ONE_ETH}),
                "DigitalaxGenesisNFT.buy: Unable to send contribution to funds multisig"
           );
       });

       it('Reverts when the buyer has already purchased a genesis NFT', async () => {
           await this.token.buy({from: buyer, value: ONE_ETH});
           await expectRevert(
               this.token.buy({from: buyer, value: ONE_ETH}),
               "DigitalaxGenesisNFT.buy: You already own a genesis NFT"
           );
       });

       it('Reverts when the contribution is lower than the minimum contribution amount', async () => {
           // Use the core contract directly
           const token = await DigitalaxGenesisNFT.new(
               this.accessControls.address,
               multisig,
               '0',
               '999999999999',
               randomTokenURI,
               {from: admin}
           );

           await expectRevert(
               token.buy({from: buyer}),
               "DigitalaxGenesisNFT.buy: Contribution does not meet minimum requirement"
           );
       });

       it('Reverts when attempting to buy a genesis outside of the genesis window', async () => {
           await this.token.setNowOverride('11');

           await expectRevert(
               this.token.buy({from: buyer, value: ONE_ETH}),
               "DigitalaxGenesisNFT.buy: No genesis are available outside of the genesis window"
           );
       });
    });

    describe('adminBuy()', () => {
       it('Can successfully buy a genesis as an admin without contribution', async () => {
          const multisigTracker = await balance.tracker(multisig);
          const {receipt} = await this.token.adminBuy(owner, {from: admin});
          await expectEvent(receipt, 'AdminGenesisMinted', {
              beneficiary: owner,
              admin,
              tokenId: TOKEN_ONE_ID
          });

          expect(await this.token.contribution(admin)).to.be.bignumber.equal('0');
          expect(await this.token.contribution(owner)).to.be.bignumber.equal('0');
          expect(await multisigTracker.delta()).to.be.bignumber.equal('0');
          expect(await this.token.balanceOf(owner)).to.be.bignumber.equal('1');
          expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.equal(owner);

          // Tally up admin mint
          expect(await this.token.totalAdminMints()).to.be.bignumber.equal('1');

          // Still max left to buy
          expect(await this.token.remainingGenesisTokens()).to.be.bignumber.equal(defaultMaxTokens);
       });

       it('Reverts when caller is not admin', async () => {
           await expectRevert(
             this.token.adminBuy(owner, {from: owner}),
             "DigitalaxGenesisNFT.adminBuy: Sender must be admin"
           );
       });

       it('Reverts when beneficiary is address zero', async () => {
           await expectRevert(
               this.token.adminBuy(ZERO_ADDRESS, {from: admin}),
               "DigitalaxGenesisNFT.adminBuy: Beneficiary cannot be ZERO"
           );
       });

      it('Reverts when beneficiary already owns a genesis NFT', async () => {
        await this.token.adminBuy(owner, {from: admin});
        await expectRevert(
          this.token.adminBuy(owner, {from: admin}),
          "DigitalaxGenesisNFT.adminBuy: Beneficiary already owns a genesis NFT"
        );
      });
    });

    describe('increaseContribution()', () => {
        it('Successfully increases a previous contribution after buy()', async () => {
            await this.token.buy({from: buyer, value: ONE_ETH.div(new BN('2'))});

            expect(await this.token.contribution(buyer)).to.be.bignumber.equal(ONE_ETH.div(new BN('2')));

            const {receipt} = await this.token.increaseContribution({from: buyer, value: ONE_ETH.div(new BN('2'))});
            await expectEvent(receipt, 'ContributionIncreased', {
               buyer,
               contribution: ONE_ETH.div(new BN('2')),
            });

            expect(await this.token.contribution(buyer)).to.be.bignumber.equal(ONE_ETH);
            expect(await this.token.totalContributions()).to.be.bignumber.equal(ONE_ETH);
        });

        it('Successfully increases the total contribution after a buy and a previous contribution', async () => {
            await this.token.buy({from: buyer, value: ONE_ETH.div(new BN('2'))});

            expect(await this.token.contribution(buyer)).to.be.bignumber.equal(ONE_ETH.div(new BN('2')));

            await this.token.increaseContribution({from: buyer, value: ONE_ETH.div(new BN('4'))});
            const totalExpectedContribution = ONE_ETH.div(new BN('2')).add(ONE_ETH.div(new BN('4')));
            expect(await this.token.contribution(buyer)).to.be.bignumber.equal(totalExpectedContribution);

            await this.token.increaseContribution({from: buyer, value: ONE_ETH.div(new BN('4'))});
            expect(await this.token.contribution(buyer)).to.be.bignumber.equal(ONE_ETH);
        });

        it('Reverts when trying to contribute more than the maximum permitted', async () => {
            await this.token.buy({from: buyer, value: ONE_ETH});

            const maximumContributionAmount = await this.token.maximumContributionAmount();
            await expectRevert(
                this.token.increaseContribution({from: buyer, value: maximumContributionAmount}),
                "DigitalaxGenesisNFT.increaseContribution: You cannot exceed the maximum contribution amount"
            );
        });

        it('Reverts when transfer to multisig fails', async () => {
            this.alwaysRevertingReceiver = await AlwaysRevertingEthReceiver.new();
            this.tokenWithRevertingMultisig = await DigitalaxGenesisNFTMock.new(
                this.accessControls.address,
                this.alwaysRevertingReceiver.address,
                '0',
                '10',
                randomTokenURI,
                {from: admin}
            );
            await this.tokenWithRevertingMultisig.setNowOverride('5');

            await this.tokenWithRevertingMultisig.addContribution(await this.token.minimumContributionAmount(), {from: buyer});

            await expectRevert(
                this.tokenWithRevertingMultisig.increaseContribution({from: buyer, value: ONE_ETH}),
                "DigitalaxGenesisNFT.increaseContribution: Unable to send contribution to funds multisig"
            );
        });

        it('Reverts when the sender does not own a genesis', async () => {
            await expectRevert(
                this.token.increaseContribution({from: buyer, value: ONE_ETH}),
                "DigitalaxGenesisNFT.increaseContribution: You do not own a genesis NFT"
            );
        });

        it('Reverts when trying to increase a contribution outside of the genesis window', async () => {
            await this.token.setNowOverride('11');
            await expectRevert(
                this.token.increaseContribution({from: buyer, value: ONE_ETH}),
                "DigitalaxGenesisNFT.increaseContribution: No increases are possible outside of the genesis window"
            );
        });
    });

    describe('buyOrIncreaseContribution()', () => {
       it('Buys a genesis when the user does not own one', async () => {
           expect(await this.token.balanceOf(buyer)).to.be.bignumber.equal('0');
           const multisigBalanceTracker = await balance.tracker(multisig);

           const {receipt} = await this.token.buyOrIncreaseContribution({from: buyer, value: ONE_ETH});
           await expectEvent(receipt, 'GenesisPurchased', {
               buyer,
               tokenId: TOKEN_ONE_ID,
               contribution: ONE_ETH
           });

           expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.equal(buyer);
           expect(await this.token.contribution(buyer)).to.be.bignumber.equal(ONE_ETH);
           expect(await multisigBalanceTracker.delta()).to.be.bignumber.equal(ONE_ETH);
           expect(await this.token.totalContributions()).to.be.bignumber.equal(ONE_ETH);
       })

        it('Increases contribution when user already owns a Genesis', async () => {
            const currentMultisigBalance = await balance.current(multisig);
            const multisigBalanceTracker = await balance.tracker(multisig);
            await this.token.buy({from: buyer, value: ONE_ETH});
            expect(await multisigBalanceTracker.delta()).to.be.bignumber.equal(ONE_ETH);

            const {receipt} = await this.token.buyOrIncreaseContribution({from: buyer, value: ONE_ETH});
            await expectEvent(receipt, 'ContributionIncreased', {
                buyer,
                contribution: ONE_ETH,
            });

            expect(await multisigBalanceTracker.delta()).to.be.bignumber.equal(ONE_ETH);

            const latestMultisigBalance = await balance.current(multisig);
            expect(latestMultisigBalance.sub(currentMultisigBalance)).to.be.bignumber.equal(ONE_ETH.mul(new BN('2')));
        })
    });

    describe('updateGenesisEnd()', () => {
        it('Successfully updates end', async () => {
            const newEnd = '900';
            const {receipt} = await this.token.updateGenesisEnd(newEnd, {from: admin});
            expectEvent(receipt, 'GenesisEndUpdated', {
                genesisEndTimestamp: newEnd
            });

            expect(await this.token.genesisEndTimestamp()).to.be.bignumber.equal(newEnd);
        });

        it('Reverts when not admin', async () => {
           await expectRevert(
               this.token.updateGenesisEnd('99', {from: buyer}),
               "DigitalaxGenesisNFT.updateGenesisEnd: Sender must be admin"
           )
        });

        it('Reverts when being changed for a second time', async () => {
          await this.token.updateGenesisEnd('900', {from: admin});
           await expectRevert(
               this.token.updateGenesisEnd('99', {from: admin}),
               "DigitalaxGenesisNFT.updateGenesisEnd: End time locked"
           )
        });

        it('Reverts when end time already passed and trying to reopen', async () => {
          await this.token.setNowOverride('99');
          await expectRevert(
               this.token.updateGenesisEnd('99', {from: admin}),
               "DigitalaxGenesisNFT.updateGenesisEnd: End time already passed"
           )
        });
    });

    describe('updateAccessControls()', () => {
        it('Successfully updates access controls as admin', async () => {
            const currentAccessControlsAddress = await this.token.accessControls();
            await this.token.updateAccessControls(smart_contract, {from: admin});
            expect(await this.token.accessControls()).to.equal(smart_contract);
            expect(await this.token.accessControls()).to.not.equal(currentAccessControlsAddress);
        });

        it('Reverts when sender is not admin', async () => {
           await expectRevert(
               this.token.updateAccessControls(smart_contract, {from: smart_contract}),
               "DigitalaxGenesisNFT.updateAccessControls: Sender must be admin"
           )
        });

        it('Reverts when updating to address zero', async () => {
           await expectRevert(
               this.token.updateAccessControls(ZERO_ADDRESS),
               "DigitalaxGenesisNFT.updateAccessControls: Zero Address"
           );
        });
    })
});
