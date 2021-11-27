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
  const EXCHANGE_RATE = new BN('1000000000000000000');
  const TWO_HUNDRED_TOKENS = new BN('200000000000000000000');
  const TWO_THOUSAND_TOKENS = new BN('2000000000000000000000');
  const HUNDRED_TOKENS = new BN('100000000000000000000');
  const FIFTY_TOKENS = new BN('50000000000000000000');
  const HALF_TOKEN = new BN('50000000000000000');
  const ONE_TOKEN = new BN('100000000000000000');
  const TWO_TOKEN = new BN('200000000000000000');
  const TEN_TOKENS = new BN('1000000000000000000');
  const TWENTY_TOKENS = new BN('20000000000000000000');
  const ONE_HUNDRED_TOKENS = new BN('10000000000000000000');
  const TWO_ETH = ether('2');
  const MAX_NUMBER_OF_POOLS = new BN('20');
const randomURI = 'rand';

  contract('DigitalaxNFTStaking', (accounts) => {
    const [admin, smartContract, platformFeeAddress, minter, provider, staker, staker2] = accounts;

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


      await this.monaToken.mint(admin, TWO_HUNDRED_TOKENS, { from: minter });
      await this.monaToken.mint(admin, TEN_TOKENS, { from: minter });

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
          '86400000',
          '120',
          '1',
          this.accessControls.address,
          {from: admin}
      );

      await this.oracle.addProvider(provider, {from: admin});
      await this.oracle.pushReport(EXCHANGE_RATE, {from: provider});
      await time.increase(time.duration.seconds(120));

      this.nftStaking = await DigitalaxNFTStaking.new();
      await this.nftStaking.initStaking(
          this.monaToken.address,
          this.token.address,
          this.accessControls.address,
          constants.ZERO_ADDRESS
      );

      await this.nftStaking.setTokensClaimable(true, {from: admin});

      this.digitalaxRewards = await DigitalaxNFTRewardsV2.new(
          this.monaToken.address,
          this.accessControls.address,
          this.nftStaking.address,
          this.oracle.address,
          constants.ZERO_ADDRESS,
          0,
          0,
      );

      await this.digitalaxRewards.setNftStaking(this.nftStaking.address, {from: admin});

      await this.monaToken.approve(this.digitalaxRewards.address, TWO_THOUSAND_TOKENS, {from: admin});

      await this.digitalaxRewards.depositRewards(1, FIFTY_TOKENS, [], [], {from: admin});
      await this.digitalaxRewards.depositRewards(2, HUNDRED_TOKENS, [], [], {from: admin});
      await this.digitalaxRewards.depositRewards(3, FIFTY_TOKENS, [], [], {from: admin});
      await this.digitalaxRewards.depositRewards(4, TEN_TOKENS, [], [], {from: admin});


      await this.nftStaking.setRewardsContract(this.digitalaxRewards.address, { from: admin });
      await this.nftStaking.setTokensClaimable(true, {from: admin});
      await this.monaToken.approve(this.nftStaking.address, ONE_THOUSAND_TOKENS, { from: staker });
      await this.monaToken.approve(this.nftStaking.address, ONE_THOUSAND_TOKENS, { from: staker2 });
    });

    describe('Rewards Contract', () => {
        describe('setRewardsContract()', () => {
            it('fails when not admin', async () => {
                await expectRevert(
                    this.nftStaking.setRewardsContract(this.digitalaxRewards.address, {from: staker}),
                    'DigitalaxNFTStaking.setRewardsContract: Sender must be admin'
                );
            });

            it('successfully sets rewards contract', async () => {
                await this.nftStaking.setRewardsContract(this.digitalaxRewards.address, {from: admin});

                const updated = await this.nftStaking.rewardsContract();
                expect(updated).to.be.equal(this.digitalaxRewards.address);
            });
        });
    })

    describe('Access Controls', () => {
      describe('updateAccessControls()', () => {
        it('fails when not admin', async () => {
          await expectRevert(
              this.nftStaking.updateAccessControls(this.accessControls.address, {from: staker}),
              'DigitalaxNFTStaking.updateAccessControls: Sender must be admin'
          );
        });

        it('reverts when trying to set recipient as ZERO address', async () => {
          await expectRevert(
              this.nftStaking.updateAccessControls(constants.ZERO_ADDRESS, {from: admin}),
              'DigitalaxNFTStaking.updateAccessControls: Zero Address'
          );
        });

        it('successfully updates access controls', async () => {
          const accessControlsV2 = await DigitalaxAccessControls.new({from: admin});

          const original = await this.nftStaking.accessControls();
          expect(original).to.be.equal(this.accessControls.address);

          await this.nftStaking.updateAccessControls(accessControlsV2.address, {from: admin});

          const updated = await this.nftStaking.accessControls();
          expect(updated).to.be.equal(accessControlsV2.address);
        });
      });
    })


    it('successfully deposits NFT and unstakes', async () => {
      await this.token.mint(staker, randomURI, minter, {from: minter});
      await this.token.setPrimarySalePrice('100001', TWO_ETH, {from: admin});
      await this.token.setApprovalForAll(this.nftStaking.address, true, {from: staker});
      await this.nftStaking.stake('100001',{from: staker});
      console.log(await this.nftStaking.getStakedTokens(staker));
      await time.increase(time.duration.seconds(120));

      await this.digitalaxRewards.setNowOverride('1209601'); // next week
      await this.nftStaking.setNowOverride('1209601'); // next week
      console.log('balance of staker before and after:');

      const initialMonaBalance = await this.monaToken.balanceOf(staker);

      await time.increase(time.duration.seconds(1000000));
      await this.nftStaking.unstake('100001', {from: staker});


      const finalMonaBalance = await this.monaToken.balanceOf(staker);

      expect(finalMonaBalance.sub(initialMonaBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

      console.log(finalMonaBalance.sub(initialMonaBalance).toString());
    });

    it('successfully deposits many NFT and batch', async () => {
      await this.token.mint(staker, randomURI, minter, {from: minter});
      await this.token.mint(staker, randomURI, minter, {from: minter});
      await this.token.mint(staker, randomURI, minter, {from: minter});
      await this.token.mint(staker, randomURI, minter, {from: minter});
      await this.token.setPrimarySalePrice('100001', TWO_ETH, {from: admin});
      await this.token.setPrimarySalePrice('100002', TWO_ETH, {from: admin});
      await this.token.setPrimarySalePrice('100003', TWO_ETH, {from: admin});
      await this.token.setPrimarySalePrice('100004', TWO_ETH, {from: admin});
      await this.token.setApprovalForAll(this.nftStaking.address, true, {from: staker});
      await this.nftStaking.stakeBatch(['100001','100002', '100003','100004'],{from: staker});
      //await this.nftStaking.stakeAll({from: staker});
      console.log(await this.nftStaking.getStakedTokens(staker));
      await time.increase(time.duration.seconds(120));

      await this.digitalaxRewards.setNowOverride('1209601'); // next week
      await this.nftStaking.setNowOverride('1209601'); // next week
      console.log('balance of staker before and after:');

      const initialMonaBalance = await this.monaToken.balanceOf(staker);

      await time.increase(time.duration.seconds(1000000));
      await this.nftStaking.unstakeBatch(['100002','100004','100001','100003'], {from: staker});


      const finalMonaBalance = await this.monaToken.balanceOf(staker);

      expect(finalMonaBalance.sub(initialMonaBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

      console.log(finalMonaBalance.sub(initialMonaBalance).toString());
    });

    it('successfully claims reward  NFT', async () => {
      await this.token.mint(staker, randomURI, minter, {from: minter});
      await this.token.setPrimarySalePrice('100001', TWO_ETH, {from: admin});
      await this.token.setApprovalForAll(this.nftStaking.address, true, {from: staker});
      await this.nftStaking.stake('100001',{from: staker});
      await time.increase(time.duration.seconds(120));

      await this.digitalaxRewards.setNowOverride('1209601'); // next week
      await this.nftStaking.setNowOverride('1209601'); // next week
      console.log('balance of staker before and after:');

      const initialMonaBalance = await this.monaToken.balanceOf(staker);

      await time.increase(time.duration.seconds(1000000));
      await this.nftStaking.claimReward(staker, {from: staker});


      const finalMonaBalance = await this.monaToken.balanceOf(staker);

      expect(finalMonaBalance.sub(initialMonaBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

      console.log(finalMonaBalance.sub(initialMonaBalance).toString());
    });

    it('successfully claims reward  NFT', async () => {
      await this.token.mint(staker, randomURI, minter, {from: minter});
      await this.token.setPrimarySalePrice('100001', TWO_ETH, {from: admin});
      await this.token.setApprovalForAll(this.nftStaking.address, true, {from: staker});
      await this.nftStaking.stake('100001',{from: staker});
      await time.increase(time.duration.seconds(120));

      await this.digitalaxRewards.setNowOverride('1209601'); // next week
      await this.nftStaking.setNowOverride('1209601'); // next week
      console.log('balance of staker before and after:');

      const initialMonaBalance = await this.monaToken.balanceOf(staker);

      await time.increase(time.duration.seconds(1000000));
      await this.nftStaking.claimReward(staker, {from: staker});


      const finalMonaBalance = await this.monaToken.balanceOf(staker);

      expect(finalMonaBalance.sub(initialMonaBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

      console.log(finalMonaBalance.sub(initialMonaBalance).toString());
    });

    it('successfully emergency unstakes  NFT', async () => {
      await this.token.mint(staker, randomURI, minter, {from: minter});
      await this.token.setPrimarySalePrice('100001', TWO_ETH, {from: admin});
      await this.token.setApprovalForAll(this.nftStaking.address, true, {from: staker});
      await this.nftStaking.stake('100001',{from: staker});
      await time.increase(time.duration.seconds(120));

      await this.digitalaxRewards.setNowOverride('1209601'); // next week
      await this.nftStaking.setNowOverride('1209601'); // next week
      console.log('balance of staker before and after:');

      const initialMonaBalance = await this.monaToken.balanceOf(staker);

      await time.increase(time.duration.seconds(1000000));
      await this.nftStaking.emergencyUnstake('100001', {from: staker});


      const finalMonaBalance = await this.monaToken.balanceOf(staker);

      expect(finalMonaBalance.sub(initialMonaBalance)).to.be.bignumber.equal(new BN('0'));

      console.log(finalMonaBalance.sub(initialMonaBalance).toString());
    });

    it('successfully deposits many NFT and batch with multiple users multiple weeks', async () => {
    await this.token.mint(staker, randomURI, minter, {from: minter});
    await this.token.mint(staker, randomURI, minter, {from: minter});
    await this.token.mint(staker2, randomURI, minter, {from: minter});
    await this.token.mint(staker2, randomURI, minter, {from: minter});
    await this.token.setPrimarySalePrice('100001', TWO_ETH, {from: admin});
    await this.token.setPrimarySalePrice('100002', TWO_ETH, {from: admin});
    await this.token.setPrimarySalePrice('100003', TWO_ETH, {from: admin});
    await this.token.setPrimarySalePrice('100004', TWO_ETH, {from: admin});
    await this.token.setApprovalForAll(this.nftStaking.address, true, {from: staker});
    await this.token.setApprovalForAll(this.nftStaking.address, true, {from: staker2});
    await this.nftStaking.stakeBatch(['100001','100002'],{from: staker});
    await this.nftStaking.stakeBatch(['100003','100004'],{from: staker2});
    //await this.nftStaking.stakeAll({from: staker});
    console.log(await this.nftStaking.getStakedTokens(staker));
    console.log(await this.nftStaking.getStakedTokens(staker2));
    await time.increase(time.duration.seconds(120));

    // Make sure we can withdraw and deposit the same amount back in.
    await this.digitalaxRewards.withdrawRewards(3, FIFTY_TOKENS, [], [], {from: admin});
    await this.digitalaxRewards.depositRewards(3, FIFTY_TOKENS, [], [], {from: admin});

    await this.digitalaxRewards.setNowOverride('2420000'); // final week
    await this.nftStaking.setNowOverride('2420000'); // final week
    console.log('balance of staker before and after:');

    const initialMonaBalance = await this.monaToken.balanceOf(staker);
    const initialMonaBalance2 = await this.monaToken.balanceOf(staker2);

    console.log("Rewards owing and unclaimed rewards");
    console.log(await this.nftStaking.rewardsOwing(staker));
    console.log(await this.nftStaking.rewardsOwing(staker2));
    console.log(await this.nftStaking.unclaimedRewards(staker));
    console.log(await this.nftStaking.unclaimedRewards(staker2));

    await time.increase(time.duration.seconds(1000001));

    console.log('await this.digitalaxRewards.getMonaDailyAPY()');
    console.log(await this.digitalaxRewards.getMonaDailyAPY());

    await this.nftStaking.unstakeBatch(['100001','100002'], {from: staker});
    await this.nftStaking.unstakeBatch(['100001','100002'], {from: staker2});


    const finalMonaBalance = await this.monaToken.balanceOf(staker);
    const finalMonaBalance2 = await this.monaToken.balanceOf(staker2);

    expect(finalMonaBalance.sub(initialMonaBalance)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);
    expect(finalMonaBalance2.sub(initialMonaBalance2)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);

    console.log('Staker 1 and 2');
    console.log(finalMonaBalance.sub(initialMonaBalance).toString());
    console.log(finalMonaBalance2.sub(initialMonaBalance2).toString());


  });

    async function getGasCosts(receipt) {
      const tx = await web3.eth.getTransaction(receipt.tx);
      const gasPrice = new BN(tx.gasPrice);
      return gasPrice.mul(new BN(receipt.receipt.gasUsed));
    }
  });
