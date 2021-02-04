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
const TWENTY_TOKENS = new BN('20000000000000000000');
const TWO_ETH = ether('2');
const THREE_ETH = ether('3');
const TEN_ETH = ether('10');

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
        {from: minter}
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
    await this.monaToken.transfer(this.monaWETH.address, TWO_HUNDRED_TOKENS, { from: minter });
    await this.monaToken.transfer(admin, TWO_HUNDRED_TOKENS, { from: minter });

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
        this.monaWETH.address,
        0,
        0,
        0
    );

    // Important
    this.monaStaking.setRewardsContract(this.digitalaxRewards.address, {from: admin});
  });

  describe('Contract deployment', () => {
    it('Reverts when access controls is zero', async () => {
      await expectRevert(
        DigitalaxRewardsV2.new(
          this.monaToken.address,
          constants.ZERO_ADDRESS,
          this.monaStaking.address,
          this.monaWETH.address,
          0,
          0,
          0,
          {from: admin}
        ),
        "DigitalaxRewardsV2: Invalid Access Controls"
      );
    });
    it('Reverts when mona token is 0', async () => {
      await expectRevert(
        DigitalaxRewardsV2.new(
          constants.ZERO_ADDRESS,
          this.accessControls.address,
          this.monaStaking.address,
          this.monaWETH.address,
          0,
          0,
          0,
          {from: admin}
        ),
        "DigitalaxRewardsV2: Invalid Mona Address"
      );
    });
    it('Reverts when mona staking is zero', async () => {
      await expectRevert(
        DigitalaxRewardsV2.new(
          this.monaToken.address,
          this.accessControls.address,
          constants.ZERO_ADDRESS,
          this.monaWETH.address,
          0,
          0,
          0,
          {from: admin}
        ),
        "DigitalaxRewardsV2: Invalid Mona Staking"
      );
    });
    it('Reverts when mona lp is zero', async () => {
      await expectRevert(
        DigitalaxRewardsV2.new(
          this.monaToken.address,
          this.accessControls.address,
          this.monaStaking.address,
          constants.ZERO_ADDRESS,
          0,
          0,
          0,
          {from: admin}
        ),
        "DigitalaxRewardsV2: Invalid Mona LP"
      );
    });
    it('Can redeploy the real contract', async () => {
      const rewardsReal = await DigitalaxRewardsV2Real.new(
          this.monaToken.address,
          this.accessControls.address,
          this.monaStaking.address,
          this.monaWETH.address,
          0,
          0,
          0,
          {from: admin});
      });
  });

  describe('Access Controls', () => {
    describe('updateAccessControls()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
            this.digitalaxRewards.updateAccessControls(this.accessControls.address, {from: staker}),
            'DigitalaxRewardsV2.updateAccessControls: Sender must be admin'
        );
      });

      it('reverts when trying to set recipient as ZERO address', async () => {
        await expectRevert(
            this.digitalaxRewards.updateAccessControls(constants.ZERO_ADDRESS, {from: admin}),
            'DigitalaxRewardsV2.updateAccessControls: Zero Address'
        );
      });

      it('successfully updates access controls', async () => {
        const accessControlsV2 = await DigitalaxAccessControls.new({from: admin});

        const original = await this.digitalaxRewards.accessControls();
        expect(original).to.be.equal(this.accessControls.address);

        await this.digitalaxRewards.updateAccessControls(accessControlsV2.address, {from: admin});

        const updated = await this.digitalaxRewards.accessControls();
        expect(updated).to.be.equal(accessControlsV2.address);
      });
    });
  })

  describe('Set Start Time', () => {
    describe('setStartTime()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
            this.digitalaxRewards.setStartTime(100, {from: staker}),
            'DigitalaxRewardsV2.setStartTime: Sender must be admin'
        );
      });

      it('successfully updates start time', async () => {
        const original = await this.digitalaxRewards.startTime();
        expect(original).to.be.bignumber.equal('0');

        await this.digitalaxRewards.setStartTime(100, {from: admin});

        const updated = await this.digitalaxRewards.startTime();
        expect(updated).to.be.bignumber.equal('100');
      });
    });
  })

  describe('Set Mona Staking contract', () => {
    describe('setMonaStaking()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
            this.digitalaxRewards.setMonaStaking(constants.ZERO_ADDRESS, {from: staker}),
            'DigitalaxRewardsV2.setMonaStaking: Sender must be admin'
        );
      });

      it('successfully updates mona staking', async () => {
        const original = await this.digitalaxRewards.monaStaking();
        expect(original).to.be.equal(this.monaStaking.address);

        await this.digitalaxRewards.setMonaStaking(this.accessControls.address, {from: admin});

        const updated = await this.digitalaxRewards.monaStaking();
        expect(updated).to.be.equal(this.accessControls.address);
      });
    });
  })

  describe('Admin functions', () => {
    beforeEach(async () => {
        this.weth.deposit({from: minter, value: TWENTY_TOKENS});
        this.weth.transfer(this.digitalaxRewards.address, TWENTY_TOKENS, {from: minter});
        await send.ether(staker, this.digitalaxRewards.address, TWO_ETH); // Token buyer sends 2 random eth into contract
    });

      describe('reclaimETH()', async () => {
        describe('validation', async () => {
          it('cannot reclaim eth if it is not Admin', async () => {
            await expectRevert(
              this.digitalaxRewards.reclaimETH(TWO_ETH, {from: staker}),
              'DigitalaxRewardsV2.reclaimETH: Sender must be admin'
            );
          });

          it('can reclaim Eth', async () => {
            const rewardsBalanceTracker = await balance.tracker(this.digitalaxRewards.address, 'ether');
            const adminBalanceTracker = await balance.tracker(admin, 'ether');

            const adminBalanceBeforeReclaim = await adminBalanceTracker.get('ether');

            // Reclaim eth from contract
            await this.digitalaxRewards.reclaimETH(TWO_ETH, {from: admin});

            expect(await rewardsBalanceTracker.delta('ether')).to.be.bignumber.equal('-2');
            expect((await rewardsBalanceTracker.get('ether')).toString()).to.be.equal('0');
          });
        });
      });

      describe('reclaimERC20()', async () => {
        describe('validation', async () => {
          it('cannot reclaim erc20 if it is not Admin', async () => {
            await expectRevert(
              this.digitalaxRewards.reclaimERC20(this.weth.address, ether('10'), {from: staker}),
              'DigitalaxRewardsV2.reclaimERC20: Sender must be admin'
            );

          it('can reclaim Erc20', async () => {
            // Send some wrapped eth
            await this.weth.transfer(this.marketplace.address, TWENTY_TOKENS, { from: minter });

            const adminBalanceBeforeReclaim = await this.weth.balanceOf(admin);
            expect(await this.weth.balanceOf(this.marketplace.address)).to.be.bignumber.equal(TWENTY_TOKENS);

            // Reclaim erc20 from contract
            await this.marketplace.reclaimERC20(this.weth.address, {from: admin});

            expect(await this.weth.balanceOf(this.marketplace.address)).to.be.bignumber.equal(new BN('0'));

            // Admin receives eth minus gas fees.
            expect(await this.weth.balanceOf(admin)).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
            });
        });
      });
    });
  });

  describe('Initialize Pools', () => {
    beforeEach(async () => {
      await this.digitalaxRewards.setNowOverride('1');
    });
    describe('initializePools()', () => {
      it('is currently week 0', async () => {
        expect(await this.digitalaxRewards.getCurrentWeek()).to.be.bignumber.equal('0');
      });

      it('fails when not admin', async () => {
        await expectRevert(
            this.digitalaxRewards.initializePools(1, [1], [1], [1], [1], [1], {from: staker}),
            'DigitalaxRewardsV2.initializePools: Sender must be admin'
        );
      });

      it('fails when not admin', async () => {
        await expectRevert(
            this.digitalaxRewards.initializePools(1, [1], [1], [1], [1], [1], {from: staker}),
            'DigitalaxRewardsV2.initializePools: Sender must be admin'
        );
      });

      it('fails when arrays are not proper length', async () => {
        await expectRevert(
            this.digitalaxRewards.initializePools(1, [1], [1, 2], [1], [1], [1], {from: admin}),
            'DigitalaxRewardsV2.initializePools: Please check pool ids and weight point revenue lengths'
        );
        await expectRevert(
            this.digitalaxRewards.initializePools(1, [1], [1], [1, 2], [1], [1], {from: admin}),
            'DigitalaxRewardsV2.initializePools: Please check pool ids and minted mona reward pts lengths'
        );
        await expectRevert(
            this.digitalaxRewards.initializePools(1, [1], [1], [1], [1, 2], [1], {from: admin}),
            'DigitalaxRewardsV2.initializePools: Please check pool ids and bonus mona reward pts lengths'
        );
        await expectRevert(
            this.digitalaxRewards.initializePools(1, [1], [1], [1], [1], [1, 2], {from: admin}),
            'DigitalaxRewardsV2.initializePools: Please check pool ids and deposited ETH reward pts lengths'
        );
      });
      it('fails when it is empty array', async () => {
        await expectRevert(
            this.digitalaxRewards.initializePools(1, [], [], [], [], [], {from: admin}),
            'DigitalaxRewardsV2.initializePools: Cannot initialize without a pool id'
        );
      });

      it('successfully initializes pool', async () => {
        await this.digitalaxRewards.initializePools(1, [1], [100], [10], [10], [10], {from: admin});

        const _weightPointsRevenueSharing = await this.digitalaxRewards.getMonaWeightPoints(1, 1);
        expect(_weightPointsRevenueSharing).to.be.bignumber.equal('100');

        const weeklyRewardPoints = await this.digitalaxRewards.getWeeklyRewardPointsInfo(1, 1);
        expect(weeklyRewardPoints[0]).to.be.bignumber.equal('10');
        expect(weeklyRewardPoints[1]).to.be.bignumber.equal('10');
        expect(weeklyRewardPoints[2]).to.be.bignumber.equal('10');
      });
    });
  })

  describe('depositRevenueSharingRewards', () => {
    describe('depositRevenueSharingRewards()', () => {
    beforeEach(async () => {
      await this.digitalaxRewards.initializePools(0, [1], [100], [10], [10], [10], {from: admin});
      await this.monaToken.approve(this.digitalaxRewards.address, ONE_THOUSAND_TOKENS, {from: admin});
    });
      it('is currently week 0', async () => {
        expect(await this.digitalaxRewards.getCurrentWeek()).to.be.bignumber.equal('0');
      });

      it('fails when not admin', async () => {
        await expectRevert(
            this.digitalaxRewards.depositRevenueSharingRewards(0, 1, TWO_ETH, {from: staker}),
            'DigitalaxRewardsV2.setRewards: Sender must be admin'
        );
      });

      it('fails when not a future week', async () => {
        await expectRevert(
            this.digitalaxRewards.depositRevenueSharingRewards(0, 0, TWENTY_TOKENS, {from: admin}),
            'DigitalaxRewardsV2.depositRevenueSharingRewards: The rewards generated should be set for the future weeks'
        );
      });

      it('fails if insufficient mona approval', async () => {
        await this.monaToken.approve(this.digitalaxRewards.address, 0, {from: admin});
        await expectRevert(
            this.digitalaxRewards.depositRevenueSharingRewards(0, 1, TWENTY_TOKENS, {from: admin}),
            'DigitalaxRewardsV2.depositRevenueSharingRewards: Failed to supply ERC20 Allowance'
        );
      });

      it('successfully deposits revenue sharing rewards', async () => {
        const {receipt} = await this.digitalaxRewards.depositRevenueSharingRewards(0, 1, TEN_ETH, {from: admin, value: THREE_ETH});

        const monaRevenue = await this.digitalaxRewards.weeklyMonaRevenueSharingPerSecond(1);
        expect(monaRevenue).to.be.bignumber.equal(TEN_ETH.div(new BN('604800')));
        const ethRevenue = await this.digitalaxRewards.weeklyETHRevenueSharingPerSecond(1);
        expect(ethRevenue).to.be.bignumber.equal(THREE_ETH.div(new BN('604800')));

        await expectEvent(receipt, 'DepositRevenueSharing', {
          weeklyMonaRevenueSharingPerSecond: TEN_ETH.div(new BN('604800')),
          weeklyETHRevenueSharingPerSecond: THREE_ETH.div(new BN('604800'))
        });
      });
    });
  })

  describe('Set LastRewardsTime', () => {
    describe('setLastRewardsTime()', () => {
      it('fails when not admin', async () => {
        await expectRevert(
            this.digitalaxRewards.setLastRewardsTime([0], [1], {from: staker}),
            'DigitalaxRewardsV2.setLastRewardsTime: Sender must be admin'
        );
      });

      it('successfully updates last rewards time', async () => {
        const original = await this.digitalaxRewards.lastRewardsTime(0);
        expect(original).to.be.bignumber.equal(new BN('0'));

        await this.digitalaxRewards.setLastRewardsTime([0], [10], {from: admin});

        const updated = await this.digitalaxRewards.lastRewardsTime(0);
        expect(updated).to.be.bignumber.equal(new BN('10'));
      });
    });
  })

  describe('Update Rewards', () => {
    beforeEach(async () => {
      await this.digitalaxRewards.initializePools(0, [0], [ether('10000000000000000000')], [10], [10], [10], {from: admin});
      await this.digitalaxRewards.initializePools(1, [0], [ether('10000000000000000000')], [10], [10], [10], {from: admin});
      await this.digitalaxRewards.initializePools(2, [0], [ether('10000000000000000000')], [10], [10], [10], {from: admin});
      await this.monaToken.approve(this.digitalaxRewards.address, TEN_ETH.mul(new BN('5')), {from: admin});
      await this.digitalaxRewards.depositRevenueSharingRewards(0, 1, TEN_ETH, {from: admin, value: THREE_ETH});
      await this.digitalaxRewards.depositRevenueSharingRewards(0, 2, TEN_ETH, {from: admin, value: THREE_ETH});

      await this.digitalaxRewards.setNowOverride('1209600'); // next week

    });
    describe('updateRewards()', () => {
      it('successfully updates rewards', async () => {

        const originalRewardsMonaTokenBalance = await this.monaToken.balanceOf(this.digitalaxRewards.address);
        const rewardsBalanceTracker = await balance.tracker(this.digitalaxRewards.address, 'ether');
        const originalRewardsContractBalance = await rewardsBalanceTracker.get('wei');

        const monaStakingBalanceTracker = await balance.tracker(this.monaStaking.address, 'ether');
        const originalMonaStakingContractBalance = await monaStakingBalanceTracker.get('wei');


        expect(originalMonaStakingContractBalance).to.be.bignumber.equal(new BN('0'));

        const originalLastRewardsTime = await this.digitalaxRewards.lastRewardsTime(0);
        expect(originalLastRewardsTime).to.be.bignumber.equal(new BN('0'));

        const originalMonaRewardsPaidTotal = await this.digitalaxRewards.monaRewardsPaidTotal();
        expect(originalMonaRewardsPaidTotal).to.be.bignumber.equal(new BN('0'));

        const originalETHRewardsPaidTotal = await this.digitalaxRewards.ethRewardsPaidTotal();
        expect(originalETHRewardsPaidTotal).to.be.bignumber.equal(new BN('0'));


        const rewardResult = await this.digitalaxRewards.updateRewards(0, {from: staker});

        const updatedLastRewardsTime = await this.digitalaxRewards.lastRewardsTime(0);
        expect(updatedLastRewardsTime).to.be.bignumber.equal(new BN('1209600'));

        const updatedMonaRewardsPaidTotal = await this.digitalaxRewards.monaRewardsPaidTotal();
        expect(updatedMonaRewardsPaidTotal).to.be.bignumber.greaterThan(originalMonaRewardsPaidTotal);

        const updatedETHRewardsPaidTotal = await this.digitalaxRewards.ethRewardsPaidTotal();
        expect(updatedETHRewardsPaidTotal).to.be.bignumber.greaterThan(originalETHRewardsPaidTotal);

        const updatedRewardsMonaTokenBalance = await this.monaToken.balanceOf(this.digitalaxRewards.address);
        const updatedBalanceTracker = await balance.tracker(this.digitalaxRewards.address, 'wei');
        const updatedRewardsContractBalance = await updatedBalanceTracker.get('wei');

        console.log('Current rewards contract eth balance');
        console.log(updatedRewardsContractBalance.toString());
        console.log('Current rewards contract mona balance');
        console.log(updatedRewardsMonaTokenBalance.toString());
        console.log('Current rewards contract eth paid total');
        console.log(updatedETHRewardsPaidTotal.toString());
        console.log('Current rewards contract mona paid total');
        console.log(updatedMonaRewardsPaidTotal.toString());

        expect(originalRewardsMonaTokenBalance).to.be.bignumber.greaterThan(updatedRewardsMonaTokenBalance);
        expect(originalRewardsContractBalance).to.be.bignumber.greaterThan(updatedRewardsContractBalance);
      });

      it('successfully runs if the start time is in the future, but does not update rewards', async () => {

        const originalRewardsMonaTokenBalance = await this.monaToken.balanceOf(this.digitalaxRewards.address);
        const rewardsBalanceTracker = await balance.tracker(this.digitalaxRewards.address, 'ether');
        const originalRewardsContractBalance = await rewardsBalanceTracker.get('wei');

        const monaStakingBalanceTracker = await balance.tracker(this.monaStaking.address, 'ether');
        const originalMonaStakingContractBalance = await monaStakingBalanceTracker.get('wei');

        expect(originalMonaStakingContractBalance).to.be.bignumber.equal(new BN('0'));

        const originalLastRewardsTime = await this.digitalaxRewards.lastRewardsTime(0);
        expect(originalLastRewardsTime).to.be.bignumber.equal(new BN('0'));

        const originalMonaRewardsPaidTotal = await this.digitalaxRewards.monaRewardsPaidTotal();
        expect(originalMonaRewardsPaidTotal).to.be.bignumber.equal(new BN('0'));

        const originalETHRewardsPaidTotal = await this.digitalaxRewards.ethRewardsPaidTotal();
        expect(originalETHRewardsPaidTotal).to.be.bignumber.equal(new BN('0'));

        await this.digitalaxRewards.setStartTime(12096000, {from: admin});
        const rewardResult = await this.digitalaxRewards.updateRewards(0, {from: staker});

        const updatedLastRewardsTime = await this.digitalaxRewards.lastRewardsTime(0);
        expect(updatedLastRewardsTime).to.be.bignumber.equal(new BN('1209600'));

        const updatedMonaRewardsPaidTotal = await this.digitalaxRewards.monaRewardsPaidTotal();
        expect(updatedMonaRewardsPaidTotal).to.be.bignumber.equal(originalMonaRewardsPaidTotal);

        const updatedETHRewardsPaidTotal = await this.digitalaxRewards.ethRewardsPaidTotal();
        expect(updatedETHRewardsPaidTotal).to.be.bignumber.equal(originalETHRewardsPaidTotal);

        const updatedRewardsMonaTokenBalance = await this.monaToken.balanceOf(this.digitalaxRewards.address);
        const updatedBalanceTracker = await balance.tracker(this.digitalaxRewards.address, 'wei');
        const updatedRewardsContractBalance = await updatedBalanceTracker.get('wei');

        expect(originalRewardsMonaTokenBalance).to.be.bignumber.equal(updatedRewardsMonaTokenBalance);
        expect(originalRewardsContractBalance).to.be.bignumber.equal(updatedRewardsContractBalance);
      });

      it('successfully runs if the last rewards time is in the future, but does not update rewards', async () => {

        const originalRewardsMonaTokenBalance = await this.monaToken.balanceOf(this.digitalaxRewards.address);
        const rewardsBalanceTracker = await balance.tracker(this.digitalaxRewards.address, 'ether');
        const originalRewardsContractBalance = await rewardsBalanceTracker.get('wei');

        const monaStakingBalanceTracker = await balance.tracker(this.monaStaking.address, 'ether');
        const originalMonaStakingContractBalance = await monaStakingBalanceTracker.get('wei');

        expect(originalMonaStakingContractBalance).to.be.bignumber.equal(new BN('0'));

        const originalLastRewardsTime = await this.digitalaxRewards.lastRewardsTime(0);
        expect(originalLastRewardsTime).to.be.bignumber.equal(new BN('0'));

        const originalMonaRewardsPaidTotal = await this.digitalaxRewards.monaRewardsPaidTotal();
        expect(originalMonaRewardsPaidTotal).to.be.bignumber.equal(new BN('0'));

        const originalETHRewardsPaidTotal = await this.digitalaxRewards.ethRewardsPaidTotal();
        expect(originalETHRewardsPaidTotal).to.be.bignumber.equal(new BN('0'));

        await this.digitalaxRewards.setLastRewardsTime([0], [120960000], {from: admin});
        const rewardResult = await this.digitalaxRewards.updateRewards(0, {from: staker});

        const updatedLastRewardsTime = await this.digitalaxRewards.lastRewardsTime(0);
        expect(updatedLastRewardsTime).to.be.bignumber.equal(new BN('120960000'));

        const updatedMonaRewardsPaidTotal = await this.digitalaxRewards.monaRewardsPaidTotal();
        expect(updatedMonaRewardsPaidTotal).to.be.bignumber.equal(originalMonaRewardsPaidTotal);

        const updatedETHRewardsPaidTotal = await this.digitalaxRewards.ethRewardsPaidTotal();
        expect(updatedETHRewardsPaidTotal).to.be.bignumber.equal(originalETHRewardsPaidTotal);

        const updatedRewardsMonaTokenBalance = await this.monaToken.balanceOf(this.digitalaxRewards.address);
        const updatedBalanceTracker = await balance.tracker(this.digitalaxRewards.address, 'wei');
        const updatedRewardsContractBalance = await updatedBalanceTracker.get('wei');

        expect(originalRewardsMonaTokenBalance).to.be.bignumber.equal(updatedRewardsMonaTokenBalance);
        expect(originalRewardsContractBalance).to.be.bignumber.equal(updatedRewardsContractBalance);
      });
    });
  })

  describe('Gets total new mona and eth rewards', () => {
    beforeEach(async () => {
      await this.digitalaxRewards.initializePools(0, [0], [ether('10000000000000000000')], [10], [10], [10], {from: admin});
      await this.digitalaxRewards.initializePools(1, [0], [ether('10000000000000000000')], [10], [10], [10], {from: admin});
      await this.digitalaxRewards.initializePools(2, [0], [ether('10000000000000000000')], [10], [10], [10], {from: admin});
      await this.monaToken.approve(this.digitalaxRewards.address, TEN_ETH.mul(new BN('5')), {from: admin});
      await this.digitalaxRewards.depositRevenueSharingRewards(0, 1, TEN_ETH, {from: admin, value: THREE_ETH});
      await this.digitalaxRewards.depositRevenueSharingRewards(0, 2, TEN_ETH, {from: admin, value: THREE_ETH});

      await this.digitalaxRewards.setNowOverride('1209601'); // next week
    });
    describe('totalNewMonaRewards()', () => {
      it('successfully queries totalNewMonaRewards after 2nd week', async () => {
        const rewardResult = await this.digitalaxRewards.totalNewMonaRewards(0, {from: staker});
        expect(rewardResult).to.be.bignumber.greaterThan(TEN_ETH);
      });
      it('successfully queries totalNewETHRewards after 2nd week', async () => {
        const rewardResult = await this.digitalaxRewards.totalNewETHRewards(0, {from: staker});
        expect(rewardResult).to.be.bignumber.greaterThan(THREE_ETH);
      });
    });
    describe('MonaRevenueRewards()', () => {
      it('successfully queries MonaRevenueRewards after 2nd week', async () => {
        const rewardResult = await this.digitalaxRewards.MonaRevenueRewards(0, 0, 1209601, {from: staker});
        expect(rewardResult).to.be.bignumber.greaterThan(TEN_ETH);
      });
    });
    describe('ETHRevenueRewards()', () => {
      it('successfully queries ETHRevenueRewards after 2nd week', async () => {
        const rewardResult = await this.digitalaxRewards.ETHRevenueRewards(0, 0, 1209601, {from: staker});
        expect(rewardResult).to.be.bignumber.greaterThan(THREE_ETH);
      });
    });
    describe('MonaRevenueRewards()', () => {
      it('successfully queries MonaRevenueRewards during first week', async () => {
        await this.digitalaxRewards.setNowOverride('604799'); // first week
        const rewardResult = await this.digitalaxRewards.MonaRevenueRewards(0, 0, 604799, {from: staker});
        expect(rewardResult).to.be.bignumber.equal('0');
      });
    });
    describe('ETHRevenueRewards()', () => {
      it('successfully queries ETHRevenueRewards during first week', async () => {
        // There are no rewards in the first week deposited
        await this.digitalaxRewards.setNowOverride('604799'); // first week
        const rewardResult = await this.digitalaxRewards.ETHRevenueRewards(0, 0, 604799, {from: staker});
        expect(rewardResult).to.be.bignumber.equal('0');
      });
    });
    describe('MonaRevenueRewards()', () => {
      it('successfully queries MonaRevenueRewards after first week', async () => {
        // There are no rewards in the first week deposited
        await this.digitalaxRewards.setNowOverride('604801'); // after first week
        const rewardResult = await this.digitalaxRewards.MonaRevenueRewards(0, 0, 604801, {from: staker});
        expect(rewardResult).to.be.bignumber.greaterThan(new BN('0'));
      });
    });
    describe('ETHRevenueRewards()', () => {
      it('successfully queries ETHRevenueRewards after first week', async () => {
        await this.digitalaxRewards.setNowOverride('604801'); // after first week
        const rewardResult = await this.digitalaxRewards.ETHRevenueRewards(0, 0, 604801, {from: staker});
        expect(rewardResult).to.be.bignumber.greaterThan(new BN('0'));
      });
    });
  })
  describe('Gets current week', () => {
    describe('getCurrentWeek()', () => {
      it('successfully queries over time', async () => {
        await this.digitalaxRewards.setNowOverride('0'); // first week
        const currentWeek = await this.digitalaxRewards.getCurrentWeek({from: staker});
        expect(currentWeek).to.be.bignumber.equal('0');

        await this.digitalaxRewards.setNowOverride('604801'); // second week
        const secondWeek = await this.digitalaxRewards.getCurrentWeek({from: staker});
        expect(secondWeek).to.be.bignumber.equal('1');

        await this.digitalaxRewards.setNowOverride('1209601'); // third week
        const thirdWeek = await this.digitalaxRewards.getCurrentWeek({from: staker});
        expect(thirdWeek).to.be.bignumber.equal('2');
      });
    });
  });

  describe('Gets staked mona', () => {
    beforeEach(async () => {
      await this.digitalaxRewards.initializePools(0, [0], [ether('10000000000000000000')], [10], [10], [10], {from: admin});
      await this.digitalaxRewards.initializePools(1, [0], [ether('10000000000000000000')], [10], [10], [10], {from: admin});
      await this.digitalaxRewards.initializePools(2, [0], [ether('10000000000000000000')], [10], [10], [10], {from: admin});

      await this.monaStaking.initMonaStakingPool(
          1,
          TWO_ETH,
          THREE_ETH,
          100,
          10,
          {from: admin}
      );

      await this.monaToken.transfer(staker, TWO_ETH, { from: minter });
      await this.monaToken.transfer(newRecipient, THREE_ETH, { from: minter });
      await this.monaToken.approve(this.monaStaking.address, TEN_ETH, {from: staker});
      await this.monaToken.approve(this.monaStaking.address, TEN_ETH, {from: newRecipient});
      await this.monaStaking.stake(0, TWO_ETH, {from: staker});
      await this.monaStaking.stake(0, THREE_ETH, {from: newRecipient});
      await this.monaToken.approve(this.digitalaxRewards.address, TEN_ETH.mul(new BN('5')), {from: admin});
      await this.digitalaxRewards.depositRevenueSharingRewards(0, 1, TEN_ETH, {from: admin, value: THREE_ETH});
      await this.digitalaxRewards.depositRevenueSharingRewards(0, 2, TEN_ETH, {from: admin, value: THREE_ETH});

    });

    describe('getMonaPerEth()', () => {
      it('successfully queries getMonaPerEth', async () => {
        const staked = await this.digitalaxRewards.getMonaPerEth(ether('1'), {from: staker});
        // 10 mona per eth
        expect(staked).to.be.bignumber.equal(ether('10'));
      });
      it('successfully queries getEthPerMona', async () => {
        const staked = await this.digitalaxRewards.getEthPerMona({from: staker});
        // 10 mona per eth
        expect(staked).to.be.bignumber.equal(ether('0.1'));
      });
    });
    describe('getMonaStakedEthTotal()', () => {
      it('successfully queries getMonaStakedEthTotal', async () => {
        const staked = await this.digitalaxRewards.getMonaStakedEthTotal({from: staker});
        // 10 mona per eth
        expect(staked).to.be.bignumber.equal(ether('0.5'));
      });
    });
    describe('getMonaDailyAPY()', () => {
      it('successfully queries getMonaDailyAPY', async () => {
        await this.digitalaxRewards.setNowOverride('1209600'); // third week start
        const rewardResult = await this.digitalaxRewards.MonaRevenueRewards(0, 1209540, 1209600, {from: staker});
        const ethPerMona = await this.digitalaxRewards.getEthPerMona({from: staker});
        console.log('values');
        console.log(rewardResult);
        console.log(ethPerMona);
        console.log(ethPerMona);
        const apy = await this.digitalaxRewards.getMonaDailyAPY(0, {from: staker});
        expect(apy).to.be.bignumber.equal(rewardResult.mul(ethPerMona.mul(new BN('52560000'))).div(TWO_ETH.add(THREE_ETH)).mul(new BN('10')));
      });
    });
  });


  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
