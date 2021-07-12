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
  const MockDECO = artifacts.require('MockDECO');
  const WethToken = artifacts.require('WethToken');
  const GuildNFTRewardsMock = artifacts.require('GuildNFTRewardsMock');
  const GuildNFTStaking = artifacts.require('GuildNFTStakingMock');
  const GuildNFTStakingWeight = artifacts.require('GuildNFTStakingWeightMock');
  const DecoOracle = artifacts.require('DecoOracle');
  const PodeNFTv2 = artifacts.require('PodeNFTv2');

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
  const ONE_ETH = ether('1');
  const TWO_ETH = ether('2');
  const MAX_NUMBER_OF_POOLS = new BN('20');
	const randomURI = 'rand';
	const TOKEN_1 = '1';
	const TOKEN_2 = '2';
	const TOKEN_3 = '3';
	const TOKEN_4 = '4';

  contract('GuildNFTStaking', (accounts) => {
	const [admin, smartContract, platformFeeAddress, minter, provider, staker, staker2] = accounts;

	beforeEach(async () => {
	  this.accessControls = await DigitalaxAccessControls.new({from: admin});
	  await this.accessControls.addMinterRole(minter, {from: admin});
	  await this.accessControls.addSmartContractRole(smartContract, {from: admin});

	  this.decoToken = this.token = await MockDECO.new(
		  // 'DECO',
		  // 'DECO',
		  // ONE_THOUSAND_TOKENS,
		  // {from: staker}
	  );
	  await this.decoToken.initialize(
	  		"DECO",
			"DECO",
			18,
			this.accessControls.address,
		  	admin,
			0,
			constants.ZERO_ADDRESS);

	  this.weth = await WethToken.new(
		{ from: minter }
	  );

	  await this.decoToken.mint(admin, TWO_HUNDRED_TOKENS, { from: minter });
	  await this.decoToken.mint(admin, TEN_TOKENS, { from: minter });

	  this.token = await PodeNFTv2.new();
	  await this.token.initialize(
		  this.accessControls.address,
		  constants.ZERO_ADDRESS,
		  {from: admin}
	  );

	  this.stakingWeight = await GuildNFTStakingWeight.new();

	  this.oracle = await DecoOracle.new(
		  '86400000',
		  '120',
		  '1',
		  this.accessControls.address,
		  {from: admin}
	  );

	  await this.oracle.addProvider(provider, {from: admin});
	  await this.oracle.pushReport(EXCHANGE_RATE, {from: provider});
	  await time.increase(time.duration.seconds(120));

	  this.guildNftStaking = await GuildNFTStaking.new();
	  await this.guildNftStaking.initStaking(
		  this.decoToken.address,
		  this.token.address,
		  this.accessControls.address,
		  this.stakingWeight.address,
		  constants.ZERO_ADDRESS
	  );

	  await this.stakingWeight.init(this.guildNftStaking.address);

	  await this.guildNftStaking.setTokensClaimable(true, {from: admin});

	  this.guildNFTRewards = await GuildNFTRewardsMock.new(
		  this.decoToken.address,
		  this.accessControls.address,
		  this.guildNftStaking.address,
		  this.oracle.address,
		  constants.ZERO_ADDRESS,
		  0,
		  0,
	  );


	  await this.accessControls.addMinterRole(this.guildNFTRewards.address, {from: admin});

	  await this.guildNFTRewards.setNftStaking(this.guildNftStaking.address, {from: admin});

	  await this.decoToken.approve(this.guildNFTRewards.address, TWO_THOUSAND_TOKENS, {from: admin});

	  await this.guildNFTRewards.setRewards([1], [FIFTY_TOKENS], {from: admin});
	  await this.guildNFTRewards.setRewards([2], [HUNDRED_TOKENS], {from: admin});
	  await this.guildNFTRewards.setRewards([3], [FIFTY_TOKENS], {from: admin});
	  await this.guildNFTRewards.setRewards([4], [TEN_TOKENS], {from: admin});

	  await this.guildNftStaking.setRewardsContract(this.guildNFTRewards.address, { from: admin });
	  await this.guildNftStaking.setTokensClaimable(true, {from: admin});
	  await this.decoToken.approve(this.guildNftStaking.address, ONE_THOUSAND_TOKENS, { from: staker });
	  await this.decoToken.approve(this.guildNftStaking.address, ONE_THOUSAND_TOKENS, { from: staker2 });
	});

	describe('Rewards Contract', () => {
		describe('setRewardsContract()', () => {
			it('fails when not admin', async () => {
				await expectRevert(
					this.guildNftStaking.setRewardsContract(this.guildNFTRewards.address, {from: staker}),
					'GuildNFTStaking.setRewardsContract: Sender must be admin'
				);
			});

			it('successfully sets rewards contract', async () => {
				await this.guildNftStaking.setRewardsContract(this.guildNFTRewards.address, {from: admin});

				const updated = await this.guildNftStaking.rewardsContract();
				expect(updated).to.be.equal(this.guildNFTRewards.address);
			});
		});
	})

	describe('Access Controls', () => {
	  describe('updateAccessControls()', () => {
		it('fails when not admin', async () => {
		  await expectRevert(
			  this.guildNftStaking.updateAccessControls(this.accessControls.address, {from: staker}),
			  'GuildNFTStaking.updateAccessControls: Sender must be admin'
		  );
		});

		it('reverts when trying to set recipient as ZERO address', async () => {
		  await expectRevert(
			  this.guildNftStaking.updateAccessControls(constants.ZERO_ADDRESS, {from: admin}),
			  'GuildNFTStaking.updateAccessControls: Zero Address'
		  );
		});

		it('successfully updates access controls', async () => {
		  const accessControlsV2 = await DigitalaxAccessControls.new({from: admin});

		  const original = await this.guildNftStaking.accessControls();
		  expect(original).to.be.equal(this.accessControls.address);

		  await this.guildNftStaking.updateAccessControls(accessControlsV2.address, {from: admin});

		  const updated = await this.guildNftStaking.accessControls();
		  expect(updated).to.be.equal(accessControlsV2.address);
		});
	  });
	})

	describe('Weight Contract', () => {
		describe('setWeightingContract()', () => {
			it('fails when not admin', async () => {
				await expectRevert(
					this.guildNftStaking.setWeightingContract(this.stakingWeight.address, {from: staker}),
					'GuildNFTStaking.setWeightingContract: Sender must be admin'
				);
			});

			it('successfully sets weighting contract', async () => {
				await this.guildNftStaking.setWeightingContract(this.stakingWeight.address, {from: admin});

				const updated = await this.guildNftStaking.weightContract();
				expect(updated).to.be.equal(this.stakingWeight.address);
			});
		});
	})

	it('successfully deposits NFT and unstakes', async () => {
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker});

	  await this.guildNftStaking.stake(TOKEN_1, {from: staker});
	  console.log(await this.guildNftStaking.getStakedTokens(staker));
	  await time.increase(time.duration.seconds(120));

	  await this.guildNFTRewards.setNowOverride('1209601'); // next week
	  await this.guildNftStaking.setNowOverride('1209601'); // next week
	  await this.stakingWeight.setNowOverride('1209601'); // next week
	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);

		const stakedBalance = await this.stakingWeight.balanceOf(staker);
	  expect(stakedBalance).to.be.bignumber.equal(ONE_ETH);

		// await time.increase(time.duration.seconds(1000000));
	  await this.guildNftStaking.unstake(TOKEN_1, {from: staker});

	  const finalDecoBalance = await this.decoToken.balanceOf(staker);

	  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

	  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	});

	it('successfully deposits many NFT and batch', async () => {
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	  await this.token.setPrimarySalePrice(TOKEN_2, ONE_ETH, {from: admin});
	  await this.token.setPrimarySalePrice(TOKEN_3, ONE_ETH, {from: admin});
	  await this.token.setPrimarySalePrice(TOKEN_4, ONE_ETH, {from: admin});
	  await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker});

	  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");

	  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2, TOKEN_3,TOKEN_4],{from: staker});

	  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("4");

	  //await this.guildNftStaking.stakeAll({from: staker});
	  console.log(await this.guildNftStaking.getStakedTokens(staker));
	  await time.increase(time.duration.seconds(120));

	  await this.guildNFTRewards.setNowOverride('1209601'); // next week
	  await this.guildNftStaking.setNowOverride('1209601'); // next week
	  await this.stakingWeight.setNowOverride('1209601'); // next week
	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);

	  await time.increase(time.duration.seconds(1000000));
	  await this.guildNftStaking.unstakeBatch([TOKEN_2,TOKEN_4,TOKEN_1,TOKEN_3], {from: staker});

	  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");

	  const finalDecoBalance = await this.decoToken.balanceOf(staker);

	  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

	  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	});

	it('successfully claims reward  NFT', async () => {
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	  await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker});
	  await this.guildNftStaking.stake(TOKEN_1,{from: staker});
	  await time.increase(time.duration.seconds(120));

	  await this.guildNFTRewards.setNowOverride('1209601'); // next week
	  await this.guildNftStaking.setNowOverride('1209601'); // next week
	  await this.stakingWeight.setNowOverride('1209601'); // next week
	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);

	  await time.increase(time.duration.seconds(1000000));
	  await this.guildNftStaking.claimReward(staker, {from: staker});


	  const finalDecoBalance = await this.decoToken.balanceOf(staker);

	  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

	  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	});

	it('successfully claims reward  NFT', async () => {
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	  await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker});
	  await this.guildNftStaking.stake(TOKEN_1,{from: staker});
	  await time.increase(time.duration.seconds(120));

	  await this.guildNFTRewards.setNowOverride('1209601'); // next week
	  await this.guildNftStaking.setNowOverride('1209601'); // next week
	  await this.stakingWeight.setNowOverride('1209601'); // next week
	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);

	  await time.increase(time.duration.seconds(1000000));
	  await this.guildNftStaking.claimReward(staker, {from: staker});


	  const finalDecoBalance = await this.decoToken.balanceOf(staker);

	  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

	  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	});

	it('successfully emergency unstakes  NFT', async () => {
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	  await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker});
	  await this.guildNftStaking.stake(TOKEN_1,{from: staker});
	  await time.increase(time.duration.seconds(120));

	  await this.guildNFTRewards.setNowOverride('1209601'); // next week
	  await this.guildNftStaking.setNowOverride('1209601'); // next week
	  await this.stakingWeight.setNowOverride('1209601'); // next week
	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);

	  await time.increase(time.duration.seconds(1000000));
	  await this.guildNftStaking.emergencyUnstake(TOKEN_1, {from: staker});


	  const finalDecoBalance = await this.decoToken.balanceOf(staker);

	  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.equal(new BN('0'));

	  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	});

	it('successfully deposits many NFT and batch with multiple users multiple weeks', async () => {
	await this.token.mint(staker, minter, {from: minter});
	await this.token.mint(staker, minter, {from: minter});
	await this.token.mint(staker2, minter, {from: minter});
	await this.token.mint(staker2, minter, {from: minter});
	await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	await this.token.setPrimarySalePrice(TOKEN_2, ONE_ETH, {from: admin});
	await this.token.setPrimarySalePrice(TOKEN_3, ONE_ETH, {from: admin});
	await this.token.setPrimarySalePrice(TOKEN_4, ONE_ETH, {from: admin});
	await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker});
	await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker2});
	await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
	await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});
	//await this.guildNftStaking.stakeAll({from: staker});
	console.log(await this.guildNftStaking.getStakedTokens(staker));
	console.log(await this.guildNftStaking.getStakedTokens(staker2));
	await time.increase(time.duration.seconds(120));

	// // Make sure we can withdraw and deposit the same amount back in.
	// await this.guildNFTRewards.setRewards([3], [FIFTY_TOKENS], {from: admin});

	await this.guildNFTRewards.setNowOverride('2420000'); // final week
	await this.guildNftStaking.setNowOverride('2420000'); // final week
	await this.stakingWeight.setNowOverride('2420000'); // final week
	console.log('balance of staker before and after:');

	const initialDecoBalance = await this.decoToken.balanceOf(staker);
	const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

	console.log("Unclaimed rewards");
	console.log(await this.guildNftStaking.unclaimedRewards(staker));
	console.log(await this.guildNftStaking.unclaimedRewards(staker2));

	await time.increase(time.duration.seconds(1000001));

	console.log('await this.guildNFTRewards.getDecoDailyAPY()');
	console.log(await this.guildNFTRewards.getDecoDailyAPY());

	await this.guildNftStaking.unstakeBatch([TOKEN_1,TOKEN_2], {from: staker});
	await this.guildNftStaking.unstakeBatch([TOKEN_1,TOKEN_2], {from: staker2});


	const finalDecoBalance = await this.decoToken.balanceOf(staker);
	const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);

	expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);
	expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);

	console.log('Staker 1 and 2');
	console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());


  });

	async function getGasCosts(receipt) {
	  const tx = await web3.eth.getTransaction(receipt.tx);
	  const gasPrice = new BN(tx.gasPrice);
	  return gasPrice.mul(new BN(receipt.receipt.gasUsed));
	}
  });
