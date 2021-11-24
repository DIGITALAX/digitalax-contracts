const {
    expectRevert,
    expectEvent,
    BN,
    ether,
    send,
    constants,
    balance,
    time
  } = require('@openzeppelin/test-helpers');

  const {expect} = require('chai');

  const DigitalaxAccessControls = artifacts.require('contracts/DigitalaxAccessControls.sol:DigitalaxAccessControls');
  const MockERC20 = artifacts.require('MockERC20');
  const WethToken = artifacts.require('WethToken');
  const DigitalaxRewardsV2 = artifacts.require('DigitalaxRewardsV2Mock');
  const DigitalaxRewardsV2Real = artifacts.require('DigitalaxRewardsV2');
  const DigitalaxMonaStaking = artifacts.require('DigitalaxMonaStakingMock');
  const DigitalaxMonaOracle = artifacts.require('DigitalaxMonaOracle');

  // 1,000 * 10 ** 18
  const TEN_THOUSAND_TOKENS = '1000000000000000000000';
  const EXCHANGE_RATE = new BN('1200000000000000000');
  const HALF_TOKEN = new BN('50000000000000000');
  const ONE_TOKEN = new BN('100000000000000000');
  const TWO_TOKEN = new BN('200000000000000000');
  const TEN_TOKENS = new BN('1000000000000000000');
  const TWO_HUNDRED = new BN('20000000000000000000');
  const ONE_HUNDRED_TOKENS = new BN('10000000000000000000');
  const TWO_ETH = ether('2');
  const MAX_NUMBER_OF_POOLS = new BN('20');

  contract('DigitalaxMonaStaking', (accounts) => {
    const [admin, smartContract, platformFeeAddress, minter, provider, staker] = accounts;

    beforeEach(async () => {
      this.accessControls = await DigitalaxAccessControls.new({from: admin});
      await this.accessControls.addMinterRole(minter, {from: admin});
      await this.accessControls.addSmartContractRole(smartContract, {from: admin});

      this.monaToken = this.token = await MockERC20.new(
          'MONA',
          'MONA',
          TEN_THOUSAND_TOKENS,
          {from: staker}
      );



      this.weth = await WethToken.new(
        { from: minter }
      );


      // this.oracle = await DigitalaxMonaOracle.new(
      //     '86400',
      //     '120',
      //     '1',
      //     this.accessControls.address,
      //     {from: admin}
      // );

     // await this.oracle.addProvider(provider, {from: admin});
     // await this.oracle.pushReport(EXCHANGE_RATE, {from: provider});
      await time.increase(time.duration.seconds(120));

      this.monaStaking = await DigitalaxMonaStaking.new();
      await this.monaStaking.initialize(
          this.monaToken.address,
          this.monaToken.address, // TODO fix this
          this.monaToken.address, // TODO fix this
          this.accessControls.address,
          constants.ZERO_ADDRESS,
      );

      this.digitalaxRewards = await DigitalaxRewardsV2.new();
      await this.digitalaxRewards.initialize(
          this.monaToken.address,
          this.accessControls.address,
          this.monaStaking.address,
        //  this.oracle.address,
          constants.ZERO_ADDRESS,
          0,
          0,
          0
      );

      await this.digitalaxRewards.addRewardTokens([this.weth.address]);

      await this.weth.deposit({from: minter, value: TWO_HUNDRED});
      await this.weth.transfer(admin, TWO_HUNDRED, {from: minter});

      await this.monaStaking.setRewardsContract(this.digitalaxRewards.address, { from: admin });
      await this.monaToken.approve(this.monaStaking.address, TEN_THOUSAND_TOKENS, { from: staker });
    });

    describe('Contract deployment', () => {
      it('Reverts when mona token is zero', async () => {
        const monaStaking2 = await DigitalaxMonaStaking.new();
        await expectRevert(
            monaStaking2.initialize(
                constants.ZERO_ADDRESS,
                constants.ZERO_ADDRESS,
                constants.ZERO_ADDRESS,
                this.accessControls.address,
                constants.ZERO_ADDRESS,
                {from: admin}
            ),
            'DigitalaxMonaStaking: Invalid Mona Token'
        );
      });
      it('Reverts when access controls is 0', async () => {
        const monaStaking2 = await DigitalaxMonaStaking.new();
        await expectRevert(
            monaStaking2.initialize(
                this.monaToken.address,
                this.monaToken.address,
                this.monaToken.address,
                constants.ZERO_ADDRESS,
                constants.ZERO_ADDRESS,
                {from: admin}
            ),
            'DigitalaxMonaStaking: Invalid Access Controls'
        );
      });
    });

    describe('Rewards Contract', () => {
        describe('setRewardsContract()', () => {
            it('fails when not admin', async () => {
                await expectRevert(
                    this.monaStaking.setRewardsContract(this.digitalaxRewards.address, {from: staker}),
                    'DigitalaxMonaStaking.setRewardsContract: Sender must be admin'
                );
            });

            it('successfully sets rewards contract', async () => {
                await this.monaStaking.setRewardsContract(this.digitalaxRewards.address, {from: admin});

                const updated = await this.monaStaking.rewardsContract();
                expect(updated).to.be.equal(this.digitalaxRewards.address);
            });
        });
    })

    describe('Access Controls', () => {
      describe('updateAccessControls()', () => {
        it('fails when not admin', async () => {
          await expectRevert(
              this.monaStaking.updateAccessControls(this.accessControls.address, {from: staker}),
              'DigitalaxMonaStaking.updateAccessControls: Sender must be admin'
          );
        });

        it('reverts when trying to set recipient as ZERO address', async () => {
          await expectRevert(
              this.monaStaking.updateAccessControls(constants.ZERO_ADDRESS, {from: admin}),
              'DigitalaxMonaStaking.updateAccessControls: Zero Address'
          );
        });

        it('successfully updates access controls', async () => {
          const accessControlsV2 = await DigitalaxAccessControls.new({from: admin});

          const original = await this.monaStaking.accessControls();
          expect(original).to.be.equal(this.accessControls.address);

          await this.monaStaking.updateAccessControls(accessControlsV2.address, {from: admin});

          const updated = await this.monaStaking.accessControls();
          expect(updated).to.be.equal(accessControlsV2.address);
        });
      });
    })

    describe('Init Mona Staking Pool', () => {
      describe('initMonaStakingPool()', () => {
        it('fails when not admin', async () => {
          await expectRevert(
              this.monaStaking.initMonaStakingPool(
                100,
                10,
                {from: staker}
              ),
              'DigitalaxMonaStaking.initMonaStakingPool: Sender must be admin'
          );
        });

        it('successfully inits staking pool', async () => {
          await this.monaStaking.initMonaStakingPool(
            100,
            10,
            {from: admin}
          );
        })
      });
    })

    describe('Set Mona Token', () => {
      describe('setMonaToken()', () => {
        it('fails when not admin', async () => {
          await expectRevert(
              this.monaStaking.setMonaToken(this.monaToken.address, {from: staker}),
              'DigitalaxMonaStaking.setMonaToken: Sender must be admin'
          );
        });

        it('fails when zero address', async () => {
          await expectRevert(
              this.monaStaking.setMonaToken(constants.ZERO_ADDRESS, {from: admin}),
              'DigitalaxMonaStaking.setMonaToken: Invalid Mona Token'
          );
        });

        it('successfully updates mona token', async () => {
          const original = await this.monaStaking.monaToken();
          expect(original).to.be.equal(this.monaToken.address);

          await this.monaStaking.setMonaToken(this.accessControls.address, {from: admin});

          const updated = await this.monaStaking.monaToken();
          expect(updated).to.be.equal(this.accessControls.address);
        });
      });
    })

    describe('Set Tokens Claimable', () => {
      describe('setTokensClaimable()', () => {
        it('fails when not admin', async () => {
          await expectRevert(
              this.monaStaking.setTokensClaimable(true, {from: staker}),
              'DigitalaxMonaStaking.setTokensClaimable: Sender must be admin'
          );
        });

        it('successfully enabled tokens claimable', async () => {
          await this.monaStaking.setTokensClaimable(true, {from: admin});

          const updated = await this.monaStaking.tokensClaimable();
          expect(updated).to.be.equal(true);
        });
      });
    })

    describe('Admin functions', () => {
      beforeEach(async () => {
          await this.weth.deposit({from: minter, value: TWO_HUNDRED});
          await this.weth.transfer(this.monaStaking.address, TWO_HUNDRED, {from: minter});
      });


      describe('reclaimERC20()', async () => {
        describe('validation', async () => {
          it('cannot reclaim erc20 if it is not Admin', async () => {
            await expectRevert(
              this.monaStaking.reclaimERC20(this.weth.address, ether('10'), {from: staker}),
              'DigitalaxMonaStaking.reclaimERC20: Sender must be admin'
            );
          });

          it('cannot reclaim rewards token', async () => {
            await expectRevert(
              this.monaStaking.reclaimERC20(this.monaToken.address, ONE_TOKEN, {from: admin}),
              'DigitalaxMonaStaking.reclaimERC20: Cannot withdraw the mona token'
            );
          });

          it('can reclaim Erc20', async () => {

            const adminBalanceBeforeReclaim = await this.weth.balanceOf(admin);
            expect(await this.weth.balanceOf(this.monaStaking.address)).to.be.bignumber.equal(TWO_HUNDRED);

            // Reclaim erc20 from contract
            await this.monaStaking.reclaimERC20(this.weth.address, TWO_HUNDRED, {from: admin});

            expect(await this.weth.balanceOf(this.monaStaking.address)).to.be.bignumber.equal(new BN('0'));

            // Admin receives eth minus gas fees.
            expect(await this.weth.balanceOf(admin)).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
          });
        });
      });

      describe('set tokens', async () => {
        describe('validation', async () => {
          it('cannot set the usdt token if it is not Admin', async () => {
            await expectRevert(
              this.monaStaking.setUsdtToken(this.weth.address, {from: staker}),
              'DigitalaxMonaStaking.setUsdtToken: Sender must be admin'
            );
          });
          it('cannot set the lp token if it is not Admin', async () => {
            await expectRevert(
              this.monaStaking.setLPToken(this.weth.address, {from: staker}),
              'DigitalaxMonaStaking.setLPToken: Sender must be admin'
            );
          });
          it('cannot set the usdt token to zero', async () => {
          await expectRevert(
              this.monaStaking.setUsdtToken(constants.ZERO_ADDRESS, {from: admin}),
              'DigitalaxMonaStaking.setUsdtToken: Invalid USDT Token'
            );
          });
          it('cannot set the lp token to zero', async () => {
            await expectRevert(
              this.monaStaking.setLPToken(constants.ZERO_ADDRESS, {from: admin}),
              'DigitalaxMonaStaking.setLPToken: Invalid LP Token'
            );
          });

          it('cannot reclaim rewards token', async () => {
            await expectRevert(
              this.monaStaking.reclaimERC20(this.monaToken.address, ONE_TOKEN, {from: admin}),
              'DigitalaxMonaStaking.reclaimERC20: Cannot withdraw the mona token'
            );
          });

          it('can change lp and usdt token', async () => {
            await this.monaStaking.setLPToken(this.weth.address, {from: admin});
            await this.monaStaking.setUsdtToken(this.weth.address, {from: admin});
            expect(await this.monaStaking.lpToken()).to.be.equal(this.weth.address);
            expect(await this.monaStaking.usdtToken()).to.be.equal(this.weth.address);
          });
        });
      });
    });

    describe('Staking', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          100,
          10,
          {from: admin}
        );
      });

      it('fails when amount is zero', async () => {
        await expectRevert(
          this.monaStaking.stake(0, {from: staker}),
          'DigitalaxMonaStaking._stake: Staked amount must be greater than 0'
        );
      });

      it('fails when the pool is already full', async () => {
        await this.monaStaking.initMonaStakingPool(
          1,
          1,
          {from: admin}
        );
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
        await expectRevert(
          this.monaStaking.stake(ONE_TOKEN, {from: minter}),
          'DigitalaxMonaStaking._stake: This pool is already full'
        );
      });

      it('successfully deposits MONA token', async () => {
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
        expect(await this.monaStaking.getStakedBalance(staker)).to.be.bignumber.equal(ONE_TOKEN);
      });

      it('successfully stake and unstake more tokens', async () => {
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
        expect(await this.monaStaking.getStakedBalance(staker)).to.be.bignumber.equal(TWO_TOKEN);
        await this.monaStaking.unstake(TWO_TOKEN, {from: staker});
        expect(await this.monaStaking.getStakedBalance(staker)).to.be.bignumber.equal(new BN('0'));
      });
      it('successfully stake and unstake more lp tokens (using mona token as erc20)', async () => {
        await this.monaStaking.stakeLP(ONE_TOKEN, {from: staker});
        await this.monaStaking.stakeLP(ONE_TOKEN, {from: staker});
        expect(await this.monaStaking.getStakedLPBalance(staker)).to.be.bignumber.equal(TWO_TOKEN);
        await this.monaStaking.unstakeLP(TWO_TOKEN, {from: staker});
        expect(await this.monaStaking.getStakedLPBalance(staker)).to.be.bignumber.equal(new BN('0'));
      });

      it('successfully stake and emergency unstake the tokens', async () => {
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
        expect(await this.monaStaking.getStakedBalance(staker)).to.be.bignumber.equal(TWO_TOKEN);
        await this.monaStaking.emergencyUnstake({from: staker});
        expect(await this.monaStaking.getStakedBalance(staker)).to.be.bignumber.equal(new BN('0'));
      });
      it('successfully stake and emergency unstake the lp tokens (using mona token as erc20)', async () => {
        await this.monaStaking.stakeLP(ONE_TOKEN, {from: staker});
        await this.monaStaking.stakeLP(ONE_TOKEN, {from: staker});
        expect(await this.monaStaking.getStakedLPBalance(staker)).to.be.bignumber.equal(TWO_TOKEN);
        await this.monaStaking.emergencyUnstakeLP({from: staker});
        expect(await this.monaStaking.getStakedLPBalance(staker)).to.be.bignumber.equal(new BN('0'));
      });
      it('successfully stake all lp tokens (using mona token as erc20)', async () => {
        await this.monaStaking.stakeAllLP( {from: staker});
        expect(await this.monaStaking.getStakedLPBalance(staker)).to.be.bignumber.greaterThan(TWO_TOKEN);
      });
      it('successfully stake all lp tokens (using mona token as erc20)', async () => {
        await this.monaStaking.stakeAll( {from: staker});
        expect(await this.monaStaking.getStakedBalance(staker)).to.be.bignumber.greaterThan(TWO_TOKEN);
      });
      it('successfully stake all lp tokens (using mona token as erc20)', async () => {
        await this.monaStaking.stakeAllLP( {from: staker});
        expect(await this.monaStaking.getStakedLPBalance(staker)).to.be.bignumber.greaterThan(TWO_TOKEN);
      });
    });

    describe('Unstaking', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          100,
          10,
          {from: admin}
        );
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
      });

      it('fails when unstaking more tokens than staked', async () => {
        await expectRevert(
          this.monaStaking.unstake(TWO_TOKEN, {from: staker}),
          'DigitalaxMonaStaking._unstake: Sender must have staked tokens'
        );
      });

      it('successfully unstaking', async () => {
        const originAmount = await this.monaToken.balanceOf(staker);
        await this.monaStaking.unstake(ONE_TOKEN, {from: staker});

        expect(await this.monaToken.balanceOf(staker)).to.be.bignumber.greaterThan(originAmount);
      })
    });

    describe('Rewards transfer', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          100,
          10,
          {from: admin}
        );

        await this.monaToken.transfer(minter, TWO_HUNDRED, {from: staker});
        await this.monaToken.transfer(admin, ONE_HUNDRED_TOKENS, {from: staker});
        await this.monaToken.approve(this.monaStaking.address, TWO_HUNDRED, { from: minter });
        await this.monaToken.approve(this.digitalaxRewards.address, TWO_HUNDRED, { from: admin });
        await this.digitalaxRewards.depositRevenueSharingRewards(1, TEN_TOKENS, TEN_TOKENS, [], [], {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, TEN_TOKENS, TEN_TOKENS, [], [], {from: admin});
      });

      it('Rewards of 2 other staking', async () => {
        await this.monaStaking.stake(ONE_TOKEN, {from: minter});
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
        await this.digitalaxRewards.setNowOverride('1209600'); // next week
        await this.monaStaking.setNowOverride('1209600'); // next week
       // await this.oracle.pushReport(EXCHANGE_RATE, {from: provider});

        await this.digitalaxRewards.setNowOverride('1814400'); // next week
        await this.monaStaking.setNowOverride('1814400'); // next week

        const minterRewards = await this.monaStaking.unclaimedRewards(minter);

        const stakerRewards = await this.monaStaking.unclaimedRewards(staker);

        const minterBonusRewards = await this.monaStaking.unclaimedBonusRewards(minter);

        const stakerBonusRewards = await this.monaStaking.unclaimedBonusRewards(staker);

        expect(stakerRewards.claimableRewards).to.be.bignumber.equal(minterRewards.claimableRewards);
        expect(stakerBonusRewards.claimableRewards).to.be.bignumber.equal(minterBonusRewards.claimableRewards);
      });
    });

    describe('Rewards differ depends on staking amount', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          10,
          5,
          {from: admin}
        );

        await this.monaToken.transfer(minter, TWO_HUNDRED, {from: staker});
        await this.monaToken.transfer(admin, ONE_HUNDRED_TOKENS, {from: staker});
        await this.monaToken.approve(this.monaStaking.address, TWO_HUNDRED, { from: minter });
        await this.monaToken.approve(this.digitalaxRewards.address, TWO_HUNDRED, { from: admin });
        await this.digitalaxRewards.depositRevenueSharingRewards(1, TEN_TOKENS, TEN_TOKENS, [], [], {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, TEN_TOKENS, TEN_TOKENS, [], [], {from: admin});
        await this.digitalaxRewards.setNowOverride('604800'); // first week
      });

      it('less staker should have less rewards', async () => {
        await this.monaStaking.stake(ONE_TOKEN, {from: minter});
        await this.monaStaking.stake(TWO_TOKEN, {from: staker});

        await this.monaStaking.setNowOverride('1209600'); // next week

        const minterRewards = await this.monaStaking.unclaimedRewards(minter);
        const stakerRewards = await this.monaStaking.unclaimedRewards(staker);

        expect(stakerRewards.claimableRewards).to.be.bignumber.greaterThan(minterRewards.claimableRewards);
      });
    });

    describe('Bonus Rewards', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          2,
          1,
          {from: admin}
        );

        await this.monaToken.transfer(minter, TWO_HUNDRED, {from: staker});
        await this.monaToken.transfer(admin, ONE_HUNDRED_TOKENS, {from: staker});
        await this.monaToken.approve(this.monaStaking.address, TWO_HUNDRED, { from: minter });
        await this.monaToken.approve(this.digitalaxRewards.address, TWO_HUNDRED, { from: admin });
        await this.digitalaxRewards.depositRevenueSharingRewards(1, TEN_TOKENS, TEN_TOKENS, [], [], {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, TEN_TOKENS, TEN_TOKENS, [], [], {from: admin});
        await this.digitalaxRewards.setNowOverride('604800'); // first week
      });

      it('late staker should have no bonus rewards', async () => {
        await this.monaStaking.stake(ONE_TOKEN, {from: minter});
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});

        await this.monaStaking.setNowOverride('1209600'); // next week

        const bonusRewards = await this.monaStaking.unclaimedBonusRewards(staker);
        expect(bonusRewards.claimableRewards).to.be.bignumber.equal(new BN('0'));

        const minterRewards = await this.monaStaking.unclaimedRewards(minter);
        const stakerRewards = await this.monaStaking.unclaimedRewards(staker);

        expect(minterRewards.claimableRewards).to.be.bignumber.equal(stakerRewards.claimableRewards);
      });

      it('early staker should have bonus rewards', async () => {
        await this.monaStaking.stake(ONE_TOKEN, {from: minter});
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});

        await this.monaStaking.setNowOverride('1209600'); // next week
        await this.digitalaxRewards.setNowOverride('1209600'); // first week

        await this.digitalaxRewards.updateRewards({from: staker});

        const bonusRewards = await this.monaStaking.unclaimedBonusRewards( staker);
        expect(bonusRewards.claimableRewards).to.be.bignumber.equal(new BN('0'));
      });
    });

    describe('Claim Rewards', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          2,
          1,
          {from: admin}
        );

        await this.monaToken.transfer(admin, ONE_HUNDRED_TOKENS, {from: staker});
        await this.monaToken.approve(this.digitalaxRewards.address, TWO_HUNDRED, { from: admin });
        await this.digitalaxRewards.depositRevenueSharingRewards(1, TEN_TOKENS, TEN_TOKENS, [], [], {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, TEN_TOKENS, TEN_TOKENS, [], [], {from: admin});
      });

      it('Tokens cannot be claimed', async () => {
        await this.digitalaxRewards.setNowOverride('604800'); // first week
        await this.monaStaking.setTokensClaimable(false);

        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
        await this.monaStaking.setNowOverride('1209600'); // next week

        await expectRevert(
          this.monaStaking.claimReward({from: staker}),
          "Tokens cannnot be claimed yet"
        );
      });

      it('Successfully claim tokens', async () => {
        await this.digitalaxRewards.setNowOverride('604800'); // first week
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});
        await this.monaStaking.setNowOverride('1209600'); // next week

        await this.monaStaking.claimReward({from: staker});
        const afterBalance = await this.monaToken.balanceOf(staker);
        expect(afterBalance).to.be.bignumber.equals(new BN('990000000000000000000')); // BIG TODO , check real numbers
      });

      it('Successfully claim extra rewards tokens', async () => {
        await this.weth.approve(this.digitalaxRewards.address, TWO_HUNDRED, { from: admin });
        const rewardsBeforeBalanceWeth = await this.weth.balanceOf(this.digitalaxRewards.address);
        expect(rewardsBeforeBalanceWeth).to.be.bignumber.equals(new BN('0'));
        await this.digitalaxRewards.depositRevenueSharingRewards(1, 0, 0, [this.weth.address], [ONE_HUNDRED_TOKENS], {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, 0, 0, [this.weth.address], [ONE_HUNDRED_TOKENS], {from: admin});
        await this.digitalaxRewards.setNowOverride('604800'); // first week
        const rewardAfterBalanceWeth = await this.weth.balanceOf(this.digitalaxRewards.address);
        expect(rewardAfterBalanceWeth).to.be.bignumber.equals(TWO_HUNDRED);
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});

        const beforeBalanceWeth = await this.weth.balanceOf(staker);
        expect(beforeBalanceWeth).to.be.bignumber.equals(new BN('0'));

        await this.monaStaking.updateReward(staker, {from: staker});
        await this.monaStaking.setNowOverride('1209601'); // next week
        await this.digitalaxRewards.setNowOverride('1209601'); // next week
        const rewardResult = await this.digitalaxRewards.TokenRevenueRewards(this.weth.address, 1209540, 1209600, {from: staker});
        console.log('rewardResult')
        console.log(rewardResult)

        await this.monaStaking.updateReward(staker, {from: staker});
        await this.monaStaking.claimReward({from: staker});
        const afterBalance = await this.monaToken.balanceOf(staker);
        expect(afterBalance).to.be.bignumber.greaterThan(new BN('990000000000000000000'));
        const afterBalanceWeth = await this.weth.balanceOf(staker);
        expect(afterBalanceWeth).to.be.bignumber.greaterThan(new BN('2000000000000000000'));
      });

      it('Successfully can test limit of maximum number of tokens', async () => {
        let wethTokens = [];
        for (let i = 0; i < 50; i += 1) {
          newweth = await WethToken.new(
              { from: minter }
          );
          await newweth.deposit({from: minter, value: TWO_HUNDRED});
          await newweth.transfer(admin, TWO_HUNDRED, {from: minter});
          await newweth.approve(this.digitalaxRewards.address, TWO_HUNDRED, { from: admin });
          wethTokens.push(newweth);
        }
        await this.weth.approve(this.digitalaxRewards.address, TWO_HUNDRED, { from: admin });

        await this.digitalaxRewards.addRewardTokens(wethTokens.map((x) => {return x.address}));
        const rewardsBeforeBalanceWeth = await wethTokens[0].balanceOf(this.digitalaxRewards.address);
        expect(rewardsBeforeBalanceWeth).to.be.bignumber.equals(new BN('0'));

        await this.digitalaxRewards.depositRevenueSharingRewards(1, 0, 0, wethTokens.map((x) => {return x.address}), Array(wethTokens.length).fill(ONE_HUNDRED_TOKENS), {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, 0, 0, wethTokens.map((x) => {return x.address}), Array(wethTokens.length).fill(ONE_HUNDRED_TOKENS), {from: admin});


        await this.digitalaxRewards.setNowOverride('604800'); // first week
        const rewardAfterBalanceWeth = await wethTokens[0].balanceOf(this.digitalaxRewards.address);
        expect(rewardAfterBalanceWeth).to.be.bignumber.equals(TWO_HUNDRED);
        await this.monaStaking.stake(ONE_TOKEN, {from: staker});



        const beforeBalanceWeth = await wethTokens[0].balanceOf(staker);
        expect(beforeBalanceWeth).to.be.bignumber.equals(new BN('0'));

        await this.monaStaking.updateReward(staker, {from: staker});
        await this.monaStaking.setNowOverride('1209601'); // next week
        await this.digitalaxRewards.setNowOverride('1209601'); // next week
        const rewardResult = await this.digitalaxRewards.TokenRevenueRewards(wethTokens[0].address, 1209540, 1209600, {from: staker});
        console.log('rewardResult')
        console.log(rewardResult)

        await this.monaStaking.updateReward(staker, {from: staker});
        await this.monaStaking.claimReward({from: staker});
        const afterBalance = await this.monaToken.balanceOf(staker);
        expect(afterBalance).to.be.bignumber.greaterThan(new BN('990000000000000000000'));
        const afterBalanceWeth = await wethTokens[0].balanceOf(staker);
        expect(afterBalanceWeth).to.be.bignumber.greaterThan(new BN('2000000000000000000'));
        const afterBalanceWeth2 = await wethTokens[1].balanceOf(staker);
        expect(afterBalanceWeth2).to.be.bignumber.greaterThan(new BN('2000000000000000000'));
        const afterBalanceWethFinal = await wethTokens[wethTokens.length - 1].balanceOf(staker);
        expect(afterBalanceWethFinal).to.be.bignumber.greaterThan(new BN('2000000000000000000'));
        console.log(`The number of wethtokens was ${wethTokens.length}`)
      });
    })

    async function getGasCosts(receipt) {
      const tx = await web3.eth.getTransaction(receipt.tx);
      const gasPrice = new BN(tx.gasPrice);
      return gasPrice.mul(new BN(receipt.receipt.gasUsed));
    }
  });
