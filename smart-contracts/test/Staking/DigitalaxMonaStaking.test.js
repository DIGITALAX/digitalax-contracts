const {
    expectRevert,
    expectEvent,
    BN,
    ether,
    send,
    constants,
    balance
  } = require('@openzeppelin/test-helpers');
  
  const {expect} = require('chai');
  
  const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
  const MockERC20 = artifacts.require('MockERC20');
  const UniswapPairOracle_MONA_WETH = artifacts.require('UniswapPairOracle_MONA_WETH');
  const UniswapV2Router02 = artifacts.require('UniswapV2Router02');
  const UniswapV2Factory = artifacts.require('UniswapV2Factory');
  const UniswapV2Pair = artifacts.require('UniswapV2Pair');
  const WethToken = artifacts.require('WethToken');
  const DigitalaxRewardsV2 = artifacts.require('DigitalaxRewardsV2Mock');
  const DigitalaxRewardsV2Real = artifacts.require('DigitalaxRewardsV2');
  const DigitalaxMonaStaking = artifacts.require('DigitalaxMonaStakingMock');
  // const DigitalaxMonaStakingReal = artifacts.require('DigitalaxMonaStaking');
  
  // 1,000 * 10 ** 18
  const ONE_THOUSAND_TOKENS = '1000000000000000000000';
  const TWO_HUNDRED_TOKENS = new BN('200000000000000000000');
  const ONE_TOKEN = new BN('100000000000000000');
  const TEN_TOKENS = new BN('1000000000000000000');
  const TWENTY_TOKENS = new BN('20000000000000000000');
  const TWO_ETH = ether('2');
  const MAX_NUMBER_OF_POOLS = new BN('20');
  
  contract('DigitalaxRewardsV2', (accounts) => {
    const [admin, smartContract, platformFeeAddress, minter, owner, designer, staker, newRecipient] = accounts;
  
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
  
      this.factory = await UniswapV2Factory.new(
        owner, 
        { from: owner }
      );
  
      this.weth = await WethToken.new(
        { from: minter }
      );
  
      this.monaWETH = await UniswapV2Pair.at(
          (await this.factory.createPair(this.monaToken.address, this.weth.address)).logs[0].args.pair
      );
  
      await this.weth.transfer(this.monaWETH.address, TWENTY_TOKENS, { from: minter });
      await this.monaToken.transfer(this.monaWETH.address, TWO_HUNDRED_TOKENS, { from: staker });
      await this.monaWETH.mint(minter);
  
      this.router02 = await UniswapV2Router02.new(
        this.factory.address,
        this.weth.address
      );
  
      this.oracle = await UniswapPairOracle_MONA_WETH.new(
        this.factory.address,
        this.monaToken.address,
        this.weth.address
      );
  
      this.monaStaking = await DigitalaxMonaStaking.new(
          this.monaToken.address,
          this.accessControls.address,
          this.weth.address
      );
  
      this.digitalaxRewards = await DigitalaxRewardsV2.new(
          this.monaToken.address,
          this.accessControls.address,
          this.monaStaking.address,
          0,
          0,
          0
      );
     // this.monaToken.approve(this.marketplace.address, ONE_THOUSAND_TOKENS);
    });
  
    describe('Contract deployment', () => {
      it('Reverts when mona token is zero', async () => {
        await expectRevert(
            DigitalaxMonaStaking.new(
                constants.ZERO_ADDRESS,
                this.accessControls.address,
                this.weth.address,
                {from: admin}
            ),
            'DigitalaxMonaStaking: Invalid Mona Token'
        );
      });
      it('Reverts when access controls is 0', async () => {
        await expectRevert(
            DigitalaxMonaStaking.new(
                this.monaToken.address,
                constants.ZERO_ADDRESS,
                this.weth.address,
                {from: admin}
            ),
            'DigitalaxMonaStaking: Invalid Access Controls'
        );
      });
      it('Reverts when weth token is zero', async () => {
        await expectRevert(
            DigitalaxMonaStaking.new(
                this.monaToken.address,
                this.accessControls.address,
                constants.ZERO_ADDRESS,
                {from: admin}
            ),
            'DigitalaxMonaStaking: Invalid WETH Token'
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
                1,
                ONE_TOKEN,
                TEN_TOKENS,
                100,
                10,
                {from: staker}
              ),
              'DigitalaxMonaStaking.initMonaStakingPool: Sender must be admin'
          );
        });

        it('fails when minimum stake in mona is zero', async () => {
          await expectRevert(
            this.monaStaking.initMonaStakingPool(
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
          this.monaStakingV2 = await DigitalaxMonaStaking.new(
            this.monaToken.address,
            this.accessControls.address,
            this.weth.address
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
  
  
    async function getGasCosts(receipt) {
      const tx = await web3.eth.getTransaction(receipt.tx);
      const gasPrice = new BN(tx.gasPrice);
      return gasPrice.mul(new BN(receipt.receipt.gasUsed));
    }
  });
  