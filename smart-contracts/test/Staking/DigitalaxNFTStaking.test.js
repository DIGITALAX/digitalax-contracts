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
  
  const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
  const MockERC20 = artifacts.require('MockERC20');
  const WethToken = artifacts.require('WethToken');
  const DigitalaxNFTRewardsV2 = artifacts.require('DigitalaxNFTRewardsV2Mock');
  const DigitalaxNFTRewardsV2Real = artifacts.require('DigitalaxNFTRewardsV2');
  const DigitalaxNFTStaking = artifacts.require('DigitalaxNFTStakingMock');
  const DigitalaxMonaOracle = artifacts.require('DigitalaxMonaOracle');
  const DigitalaxGarmentNFTv2 = artifacts.require('DigitalaxGarmentNFTv2');
  const DigitalaxMaterials = artifacts.require('DigitalaxMaterialsV2');
  
  // 1,000 * 10 ** 18
  const ONE_THOUSAND_TOKENS = '1000000000000000000000';
  const EXCHANGE_RATE = new BN('1200000000000000000');
  const TWO_HUNDRED_TOKENS = new BN('200000000000000000000');
  const HALF_TOKEN = new BN('50000000000000000');
  const ONE_TOKEN = new BN('100000000000000000');
  const TWO_TOKEN = new BN('200000000000000000');
  const TEN_TOKENS = new BN('1000000000000000000');
  const TWENTY_TOKENS = new BN('20000000000000000000');
  const ONE_HUNDRED_TOKENS = new BN('10000000000000000000');
  const TWO_ETH = ether('2');
  const MAX_NUMBER_OF_POOLS = new BN('20');
  
  contract('DigitalaxNFTStaking', (accounts) => {
    const [admin, smartContract, platformFeeAddress, minter, provider, staker] = accounts;
  
    beforeEach(async () => {
      this.accessControls = await DigitalaxAccessControls.new({from: admin});
      await this.accessControls.addMinterRole(minter, {from: admin});
      await this.accessControls.addSmartContractRole(smartContract, {from: admin});
  
      this.monaToken = this.token = await MockERC20.new(
          'MONA',
          'MONA',
          ONE_THOUSAND_TOKENS,
          {from: staker}
      );

  
      this.weth = await WethToken.new(
        { from: minter }
      );

      this.digitalaxMaterials = await DigitalaxMaterials.new(
          'DigitalaxMaterials',
          'DXM',
          this.accessControls.address,
          '0xb5505a6d998549090530911180f38aC5130101c6',
          constants.ZERO_ADDRESS,
          {from: admin}
      );

      this.token = await DigitalaxGarmentNFTv2.new();
      await this.token.initialize(
          this.accessControls.address,
          this.digitalaxMaterials.address,
          '0xb5505a6d998549090530911180f38aC5130101c6',
          constants.ZERO_ADDRESS,
          {from: admin}
      );

      this.oracle = await DigitalaxMonaOracle.new(
          '86400',
          '120',
          '1',
          this.accessControls.address,
          {from: admin}
      );

      await this.oracle.addProvider(provider, {from: admin});
      await this.oracle.pushReport(EXCHANGE_RATE, {from: provider});
      await time.increase(time.duration.seconds(120));

      this.monaStaking = await DigitalaxNFTStaking.new();
      this.monaStaking.initStaking(
          this.monaToken.address,
          this.token.address,
          this.accessControls.address,
          constants.ZERO_ADDRESS
      );
  
      this.digitalaxRewards = await DigitalaxNFTRewardsV2.new(
          this.monaToken.address,
          this.accessControls.address,
          this.monaStaking.address,
          this.oracle.address,
          constants.ZERO_ADDRESS,
          0,
          0,
      );

      await this.monaStaking.setRewardsContract(this.digitalaxRewards.address, { from: admin });
      await this.monaToken.approve(this.monaStaking.address, ONE_THOUSAND_TOKENS, { from: staker });
    });

    describe('Rewards Contract', () => {
        describe('setRewardsContract()', () => {
            it('fails when not admin', async () => {
                await expectRevert(
                    this.monaStaking.setRewardsContract(this.digitalaxRewards.address, {from: staker}),
                    'DigitalaxNFTStaking.setRewardsContract: Sender must be admin'
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
              'DigitalaxNFTStaking.updateAccessControls: Sender must be admin'
          );
        });
  
        it('reverts when trying to set recipient as ZERO address', async () => {
          await expectRevert(
              this.monaStaking.updateAccessControls(constants.ZERO_ADDRESS, {from: admin}),
              'DigitalaxNFTStaking.updateAccessControls: Zero Address'
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

    /*
  
    describe('Init Mona Staking Pool', () => {
      describe('initStaking()', () => {
        it('fails when not admin', async () => {
          await expectRevert(
              this.monaStaking.initStaking(
                1,
                ONE_TOKEN,
                TEN_TOKENS,
                100,
                10,
                {from: staker}
              ),
              'DigitalaxNFTStaking.initStaking: Sender must be admin'
          );
        });

        it('fails when minimum stake in mona is zero', async () => {
          await expectRevert(
            this.monaStaking.initStaking(
              1,
              0,
              TEN_TOKENS,
              100,
              10,
              {from: admin}
            ),
            'DigitalaxMonaStaking.initMonaStakingPool: The minimum stake in Mona must be greater than zero'
          );
        });

        it('fails when the maximum stake in mona is less than minimum stake in mona', async () => {
          await expectRevert(
            this.monaStaking.initMonaStakingPool(
              1,
              ONE_TOKEN,
              0,
              100,
              10,
              {from: admin}
            ),
            'DigitalaxMonaStaking.initMonaStakingPool: The maximum stake in Mona must be greater than or equal to the minimum stake'
          );
        });

        it('fails when reach max number of pools', async () => {
          this.monaStakingV2 = await DigitalaxNFTStaking.new(
            this.monaToken.address,
            this.accessControls.address,
            constants.ZERO_ADDRESS,
          );

          for (let i = 0; i < MAX_NUMBER_OF_POOLS; i ++) {
            await this.monaStakingV2.initMonaStakingPool(
              1,
              ONE_TOKEN,
              TEN_TOKENS,
              100,
              10,
              {from: admin}
            );
          }

          await expectRevert(
            this.monaStakingV2.initMonaStakingPool(
              1,
              ONE_TOKEN,
              TEN_TOKENS,
              100,
              10,
              {from: admin}
            ),
            'DigitalaxMonaStaking.initMonaStakingPool: Contract already reached max number of supported pools'
          );
        })
  
        it('successfully inits staking pool', async () => {
          const original = await this.monaStaking.numberOfStakingPools();
          await this.monaStaking.initMonaStakingPool(
            1,
            ONE_TOKEN,
            TEN_TOKENS,
            100,
            10,
            {from: admin}
          );

          const updated = await this.monaStaking.numberOfStakingPools();
          expect(updated).to.be.bignumber.greaterThan(original);
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
          this.weth.deposit({from: minter, value: TWENTY_TOKENS});
          this.weth.transfer(this.monaStaking.address, TWENTY_TOKENS, {from: minter});
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
              'DigitalaxMonaStaking.reclaimERC20: Cannot withdraw the rewards token'
            );
          });

          it('can reclaim Erc20', async () => {

            const adminBalanceBeforeReclaim = await this.weth.balanceOf(admin);
            expect(await this.weth.balanceOf(this.monaStaking.address)).to.be.bignumber.equal(TWENTY_TOKENS);

            // Reclaim erc20 from contract
            await this.monaStaking.reclaimERC20(this.weth.address, TWENTY_TOKENS, {from: admin});

            expect(await this.weth.balanceOf(this.monaStaking.address)).to.be.bignumber.equal(new BN('0'));

            // Admin receives eth minus gas fees.
            expect(await this.weth.balanceOf(admin)).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
          });
        });
      });
    });

    describe('Staking', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          1,
          ONE_TOKEN,
          TEN_TOKENS,
          100,
          10,
          {from: admin}
        );
      });

      it('fails when amount is zero', async () => {
        await expectRevert(
          this.monaStaking.stake(0, 0, {from: staker}),
          'DigitalaxMonaStaking._stake: Staked amount must be greater than 0'
        );
      });

      it('fails when amount is less than min stake amount', async () => {
        await expectRevert(
          this.monaStaking.stake(0, HALF_TOKEN, {from: staker}),
          'DigitalaxMonaStaking._stake: Staked amount must be greater than or equal to minimum stake'
        );
      });

      it('fails when amount is greater than max stake amount', async () => {
        await expectRevert(
          this.monaStaking.stake(0, ONE_THOUSAND_TOKENS, {from: staker}),
          'DigitalaxMonaStaking._stake: Staked amount must be less than or equal to maximum stake'
        );
      });

      it('fails when the pool is already full', async () => {
        await this.monaStaking.initMonaStakingPool(
          1,
          ONE_TOKEN,
          TEN_TOKENS,
          1,
          1,
          {from: admin}
        );
        await this.monaStaking.stake(1, ONE_TOKEN, {from: staker});
        await expectRevert(
          this.monaStaking.stake(1, ONE_TOKEN, {from: minter}),
          'DigitalaxMonaStaking._stake: This pool is already full'
        );
      });

      it('successfully deposits MONA token', async () => {
        await this.monaStaking.stake(0, ONE_TOKEN, {from: staker});
        expect(await this.monaStaking.getStakedBalance(0, staker)).to.be.bignumber.equal(ONE_TOKEN);
      });

      it('successfully stake more tokens', async () => {
        await this.monaStaking.stake(0, ONE_TOKEN, {from: staker});
        await this.monaStaking.stake(0, ONE_TOKEN, {from: staker});
        expect(await this.monaStaking.getStakedBalance(0, staker)).to.be.bignumber.equal(TWO_TOKEN);
      });
    });

    describe('Unstaking', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          1,
          ONE_TOKEN,
          TEN_TOKENS,
          100,
          10,
          {from: admin}
        );
        await this.monaStaking.stake(0, ONE_TOKEN, {from: staker});
      });

      it('fails when unstaking more tokens than staked', async () => {
        await expectRevert(
          this.monaStaking.unstake(0, TWO_TOKEN, {from: staker}),
          'DigitalaxMonaStaking._unstake: Sender must have staked tokens'
        );
      });

      it('successfully unstaking', async () => {
        const originAmount = await this.monaToken.balanceOf(staker);
        await this.monaStaking.unstake(0, ONE_TOKEN, {from: staker});
        
        expect(await this.monaToken.balanceOf(staker)).to.be.bignumber.greaterThan(originAmount);
      })
    });

    describe('Rewards differ from pool to pool', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          7,
          ONE_TOKEN,
          TEN_TOKENS,
          100,
          10,
          {from: admin}
        );
        await this.monaStaking.initMonaStakingPool(
          14,
          ONE_TOKEN,
          TEN_TOKENS,
          100,
          10,
          {from: admin}
        );

        await this.monaToken.transfer(minter, TWENTY_TOKENS, {from: staker});
        await this.monaToken.transfer(admin, ONE_HUNDRED_TOKENS, {from: staker});
        await this.monaToken.approve(this.monaStaking.address, TWENTY_TOKENS, { from: minter });
        await this.monaToken.approve(this.digitalaxRewards.address, TWENTY_TOKENS, { from: admin });
        await this.digitalaxRewards.initializePools(0, [0], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(0, [1], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(0, [2], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(1, [0], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(1, [1], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(1, [2], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(1, TEN_TOKENS, TEN_TOKENS, {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, TEN_TOKENS, TEN_TOKENS, {from: admin});
      });

      it('Rewards of 2 other staking pools', async () => {
        await this.monaStaking.stake(0, ONE_TOKEN, {from: minter});
        await this.monaStaking.stake(1, ONE_TOKEN, {from: staker});
        await this.digitalaxRewards.setNowOverride('1209600'); // next week
        await this.monaStaking.setNowOverride('1209600'); // next week
        await this.oracle.pushReport(EXCHANGE_RATE, {from: provider});

        const minterRewards = await this.monaStaking.unclaimedRewards(0, minter);

        await this.digitalaxRewards.setNowOverride('1814400'); // next week
        await this.monaStaking.setNowOverride('1814400'); // next week
        const stakerRewards = await this.monaStaking.unclaimedRewards(1, staker);

        expect(stakerRewards.claimableRewards).to.be.bignumber.equal(minterRewards.claimableRewards);
      });
    });

    describe('Rewards differ depends on staking amount', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          7,
          ONE_TOKEN,
          TEN_TOKENS,
          10,
          5,
          {from: admin}
        );

        await this.monaToken.transfer(minter, TWENTY_TOKENS, {from: staker});
        await this.monaToken.transfer(admin, ONE_HUNDRED_TOKENS, {from: staker});
        await this.monaToken.approve(this.monaStaking.address, TWENTY_TOKENS, { from: minter });
        await this.monaToken.approve(this.digitalaxRewards.address, TWENTY_TOKENS, { from: admin });
        await this.digitalaxRewards.initializePools(0, [0], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(0, [1], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(0, [2], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(1, TEN_TOKENS, TEN_TOKENS, {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, TEN_TOKENS, TEN_TOKENS, {from: admin});
        await this.digitalaxRewards.setNowOverride('604800'); // first week
      });
      
      it('less staker should have less rewards', async () => {
        await this.monaStaking.stake(0, ONE_TOKEN, {from: minter});
        await this.monaStaking.stake(0, TWO_TOKEN, {from: staker});
        
        await this.monaStaking.setNowOverride('1209600'); // next week

        const minterRewards = await this.monaStaking.unclaimedRewards(0, minter);
        const stakerRewards = await this.monaStaking.unclaimedRewards(0, staker);

        expect(stakerRewards.claimableRewards).to.be.bignumber.greaterThan(minterRewards.claimableRewards);
      });
    });

    describe('Bonus Rewards', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          7,
          ONE_TOKEN,
          TEN_TOKENS,
          2,
          1,
          {from: admin}
        );

        await this.monaToken.transfer(minter, TWENTY_TOKENS, {from: staker});
        await this.monaToken.transfer(admin, ONE_HUNDRED_TOKENS, {from: staker});
        await this.monaToken.approve(this.monaStaking.address, TWENTY_TOKENS, { from: minter });
        await this.monaToken.approve(this.digitalaxRewards.address, TWENTY_TOKENS, { from: admin });
        await this.digitalaxRewards.initializePools(0, [0], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(0, [1], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(0, [2], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(1, TEN_TOKENS, TEN_TOKENS, {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, TEN_TOKENS, TEN_TOKENS, {from: admin});
        await this.digitalaxRewards.setNowOverride('604800'); // first week
      });
      
      it('late staker should have no bonus rewards', async () => {
        await this.monaStaking.stake(0, ONE_TOKEN, {from: minter});
        await this.monaStaking.stake(0, ONE_TOKEN, {from: staker});
        
        await this.monaStaking.setNowOverride('1209600'); // next week

        const bonusRewards = await this.monaStaking.unclaimedBonusRewards(0, staker);
        expect(bonusRewards.claimableRewards).to.be.bignumber.equal(new BN('0'));

        const minterRewards = await this.monaStaking.unclaimedRewards(0, minter);
        const stakerRewards = await this.monaStaking.unclaimedRewards(0, staker);

        expect(minterRewards.claimableRewards).to.be.bignumber.equal(stakerRewards.claimableRewards);
      });
      
      it('early staker should have bonus rewards', async () => {
        await this.monaStaking.stake(0, ONE_TOKEN, {from: minter});
        await this.monaStaking.stake(0, ONE_TOKEN, {from: staker});
        
        await this.monaStaking.setNowOverride('1209600'); // next week
        await this.digitalaxRewards.setNowOverride('1209600'); // first week

        await this.digitalaxRewards.updateRewards(0, {from: staker});

        const bonusRewards = await this.monaStaking.unclaimedBonusRewards(0, staker);
        expect(bonusRewards.claimableRewards).to.be.bignumber.equal(new BN('0'));
      });
    });

    describe('Claim Rewards', () => {
      beforeEach(async () => {
        await this.monaStaking.initMonaStakingPool(
          7,
          ONE_TOKEN,
          TEN_TOKENS,
          2,
          1,
          {from: admin}
        );

        await this.monaToken.transfer(admin, ONE_HUNDRED_TOKENS, {from: staker});
        await this.digitalaxRewards.initializePools(0, [0], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(0, [1], [ether('10000000000000000000')], [10], {from: admin});
        await this.digitalaxRewards.initializePools(0, [2], [ether('10000000000000000000')], [10], {from: admin});
        await this.monaToken.approve(this.digitalaxRewards.address, TWENTY_TOKENS, { from: admin });
        await this.digitalaxRewards.depositRevenueSharingRewards(1, TEN_TOKENS, TEN_TOKENS, {from: admin});
        await this.digitalaxRewards.depositRevenueSharingRewards(2, TEN_TOKENS, TEN_TOKENS, {from: admin});
        await this.digitalaxRewards.setNowOverride('604800'); // first week
      });

      it('Tokens cannot be claimed', async () => {
        await this.monaStaking.setTokensClaimable(false);

        await this.monaStaking.stake(0, ONE_TOKEN, {from: staker});
        await this.monaStaking.setNowOverride('1209600'); // next week

        await expectRevert(
          this.monaStaking.claimReward(0, {from: staker}),
          "Tokens cannnot be claimed yet"
        );
      });

      it('Successfully claim tokens', async () => {
        await this.monaStaking.stake(0, ONE_TOKEN, {from: staker});
        await this.monaStaking.setNowOverride('1209600'); // next week
        
        await this.monaStaking.claimReward(0, {from: staker});
        const afterBalance = await this.monaToken.balanceOf(staker);
        expect(afterBalance).to.be.bignumber.equals(new BN('990000000000000000000'));
      });
    })
  */
  
    async function getGasCosts(receipt) {
      const tx = await web3.eth.getTransaction(receipt.tx);
      const gasPrice = new BN(tx.gasPrice);
      return gasPrice.mul(new BN(receipt.receipt.gasUsed));
    }
  });
  