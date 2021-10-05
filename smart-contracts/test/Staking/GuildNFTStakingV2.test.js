//const { upgrades} = require( "@openzeppelin/hardhat-upgrades");

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
  const MockDECO = artifacts.require('MockDECO');
  const WethToken = artifacts.require('WethToken');
  const GuildNFTRewardsMock = artifacts.require('GuildNFTRewardsV2Mock');
  const GuildNFTStaking = artifacts.require('GuildNFTStakingMock');
  const GuildWhitelistedNFTStaking = artifacts.require('GuildWhitelistedNFTStakingMock');
  const GuildNFTStakingWeight = artifacts.require('GuildNFTStakingWeightV3Mock');
  const GuildNFTStakingWeightV2Storage = artifacts.require('GuildNFTStakingWeightV2StorageMock');
  const GuildNFTStakingWeightV3 = artifacts.require('GuildNFTStakingWeightV3');
  const DecoOracle = artifacts.require('DecoOracle');
  const PodeNFTv2 = artifacts.require('contracts/PodeNFTv2.sol:PodeNFTv2');
  const DigitalaxGarmentNFTV2 = artifacts.require('DigitalaxGarmentNFTv2');
  const DigitalaxMaterials = artifacts.require('DigitalaxMaterialsV2');

  // 1,000 * 10 ** 18
  const ONE_THOUSAND_TOKENS = '1000000000000000000000';
  const EXCHANGE_RATE = new BN('1000000000000000000');
  const TWO_HUNDRED_TOKENS = new BN('200000000000000000000');
  const TWO_THOUSAND_TOKENS = new BN('2000000000000000000000');
  const HUNDRED_TOKENS = new BN('100000000000000000000');
  const FIFTY_TOKENS = new BN('50000000000000000000');
  const FOURTY_NINE_TOKENS = new BN('49000000000000000000');
  const FOURTY_TOKENS = new BN('40000000000000000000');
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
	const [admin, smartContract, platformFeeAddress, minter, provider, staker, staker2, staker3] = accounts;

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

	  const StakingWeightV2StorageContractFactory = await ethers.getContractFactory("GuildNFTStakingWeightV2StorageMock");
	  this.stakingWeightStorage = await upgrades.deployProxy(StakingWeightV2StorageContractFactory, [this.stakingWeight.address, this.accessControls.address], {initializer: 'initialize'});

	  this.oracle = await DecoOracle.new(
		  '31540000',
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

	  this.guildWhitelistedNftStaking = await GuildWhitelistedNFTStaking.new();
	  await this.guildWhitelistedNftStaking.initStaking(
		  this.decoToken.address,
		  this.accessControls.address,
		  this.stakingWeight.address,
		  constants.ZERO_ADDRESS
	  );

	  await this.stakingWeight.initialize(this.guildNftStaking.address, this.guildWhitelistedNftStaking.address, this.decoToken.address, this.accessControls.address, this.stakingWeightStorage.address);

	  await this.guildNftStaking.setTokensClaimable(true, {from: admin});

	  this.guildNFTRewards = await GuildNFTRewardsMock.new();

	  await this.guildNFTRewards.initialize(
		  this.decoToken.address,
		  this.accessControls.address,
		  this.guildNftStaking.address,
		  this.guildWhitelistedNftStaking.address,
		  this.oracle.address,
		  constants.ZERO_ADDRESS,
		  0
	  );


	  await this.accessControls.addMinterRole(this.guildNFTRewards.address, {from: admin});

	  await this.guildNFTRewards.setPodeNftStaking(this.guildNftStaking.address, {from: admin});
	  await this.guildNFTRewards.setWhitelistedNftStaking(this.guildWhitelistedNftStaking.address, {from: admin});

	  await this.decoToken.approve(this.guildNFTRewards.address, TWO_THOUSAND_TOKENS, {from: admin});

	  await this.guildNFTRewards.setRewards([0], [FIFTY_TOKENS], {from: admin});
	  await this.guildNFTRewards.setRewards([1], [FIFTY_TOKENS], {from: admin});
	  await this.guildNFTRewards.setRewards([2], [TWO_HUNDRED_TOKENS], {from: admin});
	  await this.guildNFTRewards.setRewards([3], [HUNDRED_TOKENS], {from: admin});
	  await this.guildNFTRewards.setRewards([4], [TWENTY_TOKENS], {from: admin});
	  // The pode rewards and whitelisted rewards are currently 50:50
	//  await this.guildNFTRewards.setWeightPoints(ether('10000000000000000000'), ether('000000000000000000'), {from: admin});
	  await this.guildNFTRewards.setWeightPoints(ether('5000000000000000000'), ether('5000000000000000000'), {from: admin});

	  await this.guildNftStaking.setRewardsContract(this.guildNFTRewards.address, { from: admin });
	  await this.guildNftStaking.setTokensClaimable(true, {from: admin});

	  await this.guildWhitelistedNftStaking.setRewardsContract(this.guildNFTRewards.address, { from: admin });
	  await this.guildWhitelistedNftStaking.setTokensClaimable(true, {from: admin});

	  // what is this?
	  await this.decoToken.approve(this.guildNftStaking.address, ONE_THOUSAND_TOKENS, { from: staker });
	  await this.decoToken.approve(this.guildNftStaking.address, ONE_THOUSAND_TOKENS, { from: staker2 });

      // Set up the materials and erc721
		this.digitalaxMaterials = await DigitalaxMaterials.new(
			'DigitalaxMaterials',
			'DXM',
			this.accessControls.address,
			'0xb5505a6d998549090530911180f38aC5130101c6',
			constants.ZERO_ADDRESS,
			{from: admin}
		);

		this.skinsToken = await DigitalaxGarmentNFTV2.new();
		await this.skinsToken.initialize(
			this.accessControls.address,
			this.digitalaxMaterials.address,
			'0xb5505a6d998549090530911180f38aC5130101c6',
			constants.ZERO_ADDRESS,
			{from: admin}
		);

		await this.guildWhitelistedNftStaking.addWhitelistedTokens([this.skinsToken.address]);
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


	  await this.guildNFTRewards.setNowOverride('1209601'); // next week
	  await this.guildNftStaking.setNowOverride('1209601'); // next week
	  await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
	  await this.stakingWeight.setNowOverride('1209601'); // next week

	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);

		const stakedBalance = await this.stakingWeight.balanceOf(staker);
	  expect(stakedBalance).to.be.bignumber.equal(new BN('1'));

		const ownerWeight1 = await this.stakingWeight.getOwnerWeight(staker);
		const totalWeight1 = await this.stakingWeight.getTotalWeight();
		expect(ownerWeight1).to.be.bignumber.equal("13950000");
		expect(totalWeight1).to.be.bignumber.equal("15000000");

		//
	  await this.guildNftStaking.unstake(TOKEN_1, {from: staker});

	  const finalDecoBalance = await this.decoToken.balanceOf(staker);

	  // TODO!!
	  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(new BN('0'));

	  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	});

	  it('successfully deposits many NFT and batch skins', async () => {
	  		// Pre req, staker 2 puts some tokens in.
		  await this.token.mint(staker2, minter, {from: minter});
		  await this.token.mint(staker2, minter, {from: minter});
		  await this.token.mint(staker2, minter, {from: minter});
		  await this.token.mint(staker2, minter, {from: minter});
		  await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
		  await this.token.setPrimarySalePrice(TOKEN_2, ONE_ETH, {from: admin});
		  await this.token.setPrimarySalePrice(TOKEN_3, ONE_ETH, {from: admin});
		  await this.token.setPrimarySalePrice(TOKEN_4, ONE_ETH, {from: admin});
		  await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker2});
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2, TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  // await this.skinsToken.setPrimarySalePrice('100001', TWO_ETH, {from: admin});
		  // await this.skinsToken.setPrimarySalePrice('100002', TWO_ETH, {from: admin});
		  // await this.skinsToken.setPrimarySalePrice('100003', TWO_ETH, {from: admin});
		  // await this.skinsToken.setPrimarySalePrice('100004', TWO_ETH, {from: admin});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(4).fill(this.skinsToken.address), ['100001','100002', '100003','100004'],{from: staker});
		  //await this.nftStaking.stakeAll({from: staker});

		  await this.stakingWeight.reactWhitelistedNFT(
		  	[this.skinsToken.address], ['100003'], ['Favorite'],{from: staker2})

		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker, this.skinsToken.address));


		  await this.guildNFTRewards.setNowOverride('1209601'); // next week
		  await this.guildNftStaking.setNowOverride('1209601'); // next week
		  await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		  await this.stakingWeight.setNowOverride('1209601'); // next week

		  console.log('balance of staker before and after:');

		  const initialDecoBalance = await this.decoToken.balanceOf(staker);

		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(4).fill(this.skinsToken.address), ['100002','100004','100001','100003'], {from: staker});

		  console.log("passed");
		  const finalDecoBalance = await this.decoToken.balanceOf(staker);

		  // TODO!!
		  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(new BN('0'));

		  console.log(finalDecoBalance.sub(initialDecoBalance).toString());

	  });

	  it('successfully deposits many NFT and batch skins with different users, 1 favorite', async () => {
	  		// Pre req, staker 2 puts some tokens in.
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
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
		  await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});

		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker2});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'],{from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'],{from: staker2});

		  await this.stakingWeight.reactWhitelistedNFT(Array(1).fill(this.skinsToken.address), Array(1).fill( '100002'), Array(1).fill('Favorite'), {from: staker2});
		 // await this.stakingWeight.reactWhitelistedNFT(Array(100).fill(this.skinsToken.address), Array(100).fill( '100002'), Array(100).fill('Favorite'), {from: staker2});

		  console.log('The staked tokens are');
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker, this.skinsToken.address));
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker2, this.skinsToken.address));


		  await this.guildNFTRewards.setNowOverride('1209601'); // next week
		  await this.guildNftStaking.setNowOverride('1209601'); // next week
		  await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		  await this.stakingWeight.setNowOverride('1209601'); // next week

		  console.log('balance of staker before and after:');

		  const initialDecoBalance = await this.decoToken.balanceOf(staker);
		  const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'], {from: staker});
		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'], {from: staker2});

		  console.log("passed");
		  const finalDecoBalance = await this.decoToken.balanceOf(staker);
		  const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  // TODO!!
		  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(new BN('0'));
		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  console.log('FOR THE SKINS TEST THE BALANCES ARE **********');
		  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
		  console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());

		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  // Allow for a little bit of derivation for low reaction nfts - there is a decay rate
		  expect(finalDecoBalance.add(finalDecoBalance2)).to.be.bignumber.greaterThan(FOURTY_TOKENS);

		  expect(finalDecoBalance > finalDecoBalance2);

	  });

	  it('successfully deposits many NFT and batch skins with different users, 1 follow', async () => {
	  		// Pre req, staker 2 puts some tokens in.
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
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
		  await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});

		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker2});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'],{from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'],{from: staker2});

		  await this.stakingWeight.reactWhitelistedNFT(Array(1).fill(this.skinsToken.address), Array(1).fill( '100002'), Array(1).fill('Follow'), {from: staker2});

		  console.log('The staked tokens are');
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker, this.skinsToken.address));
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker2, this.skinsToken.address));


		  await this.guildNFTRewards.setNowOverride('1209601'); // next week
		  await this.guildNftStaking.setNowOverride('1209601'); // next week
		  await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		  await this.stakingWeight.setNowOverride('1209601'); // next week


		  const initialDecoBalance = await this.decoToken.balanceOf(staker);
		  const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);


		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'], {from: staker});
		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'], {from: staker2});

		  const finalDecoBalance = await this.decoToken.balanceOf(staker);
		  const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  console.log('FOR THE SKINS TEST THE BALANCES ARE **********');
		  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
		  console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());

		  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(new BN('0'));
		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  // Allow for a little bit of derivation for low reaction nfts - there is a decay rate
		  expect(finalDecoBalance.add(finalDecoBalance2)).to.be.bignumber.greaterThan(FOURTY_TOKENS);

		  expect(finalDecoBalance > finalDecoBalance2);


	  });

	  it('successfully deposits many NFT and batch skins with different users, 1 share', async () => {
	  		// Pre req, staker 2 puts some tokens in.
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
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
		  await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});

		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker2});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'],{from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'],{from: staker2});

		  await this.stakingWeight.reactWhitelistedNFT(Array(1).fill(this.skinsToken.address), Array(1).fill( '100002'), Array(1).fill('Share'), {from: staker2});

		  console.log('The staked tokens are');
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker, this.skinsToken.address));
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker2, this.skinsToken.address));

		  await this.guildNFTRewards.setNowOverride('1209601'); // next week
		  await this.guildNftStaking.setNowOverride('1209601'); // next week
		  await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		  await this.stakingWeight.setNowOverride('1209601'); // next week


		  const initialDecoBalance = await this.decoToken.balanceOf(staker);
		  const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'], {from: staker});
		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'], {from: staker2});

		  const finalDecoBalance = await this.decoToken.balanceOf(staker);
		  const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  console.log('FOR THE SKINS TEST THE BALANCES ARE **********');
		  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
		  console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());

		  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(new BN('0'));
		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  // Allow for a little bit of derivation for low reaction nfts - there is a decay rate
		  expect(finalDecoBalance.add(finalDecoBalance2)).to.be.bignumber.greaterThan(FOURTY_TOKENS);

		  expect(finalDecoBalance > finalDecoBalance2);

	  });


	  it('successfully deposits many NFT and batch skins with different users, 1 metaverse', async () => {
	  		// Pre req, staker 2 puts some tokens in.
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
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
		  await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});

		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker2});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'],{from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'],{from: staker2});

		  await this.stakingWeight.reactWhitelistedNFT(Array(1).fill(this.skinsToken.address), Array(1).fill( '100002'), Array(1).fill('Metaverse'), {from: staker2});

		  console.log('The staked tokens are');
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker, this.skinsToken.address));
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker2, this.skinsToken.address));

		  await this.guildNFTRewards.setNowOverride('1209601'); // next week
		  await this.guildNftStaking.setNowOverride('1209601'); // next week
		  await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		  await this.stakingWeight.setNowOverride('1209601'); // next week


		  const initialDecoBalance = await this.decoToken.balanceOf(staker);
		  const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'], {from: staker});
		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'], {from: staker2});

		  const finalDecoBalance = await this.decoToken.balanceOf(staker);
		  const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  console.log('FOR THE SKINS TEST THE BALANCES ARE **********');
		  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
		  console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());

		  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(new BN('0'));
		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  // Allow for a little bit of derivation for low reaction nfts - there is a decay rate
		  expect(finalDecoBalance.add(finalDecoBalance2)).to.be.bignumber.greaterThan(FOURTY_TOKENS);

		  expect(finalDecoBalance > finalDecoBalance2);

	  });

	  it('successfully deposits many NFT and batch skins with different users, then validates that we cant do random reactions', async () => {
	  		// Pre req, staker 2 puts some tokens in.
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
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
		  await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});

		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker2});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'],{from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'],{from: staker2});

		  await expectRevert(
			  this.stakingWeight.reactWhitelistedNFT(Array(1).fill(this.skinsToken.address), Array(1).fill( '100002'), Array(1).fill('Garbage'), {from: staker2}),
		  'An inputted reaction string is not allowed'
		  );

	  });

	  // todo

	  it('successfully unstakes via emergency admin unstake', async () => {
	  		// Pre req, staker 2 puts some tokens in.
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
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
		  await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});

		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker2});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'],{from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'],{from: staker2});

		  // TODO try emergency unstake by admin and make sure random accounts cannot do it.

	  });

	  it('successfully deposits many NFT and batch skins with different users, 1 appraiseWhitelistedNFT', async () => {
	  		// Pre req, staker 2 puts some tokens in.
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
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
		  await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});

		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker2});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'],{from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'],{from: staker2});

		  // reactionPoint["Love"] = 30;
		  // reactionPoint["Like"] = 10;
		  // reactionPoint["Fire"] = 25;
		  // reactionPoint["Sad"] = 5;
		  // reactionPoint["Angry"] = 15;
		  // reactionPoint["Novel"] = 20;
		  await this.stakingWeight.appraiseWhitelistedNFT([this.skinsToken.address], ['100002'], ['Sad'], {from: staker2})
		// await this.stakingWeight.appraiseWhitelistedNFT([this.skinsToken.address], ['100003'], ['Fire'], {from: staker})

		  console.log('The staked tokens are');
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker, this.skinsToken.address));
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker2, this.skinsToken.address));

		  await this.guildNFTRewards.setNowOverride('1209601'); // next week
		  await this.guildNftStaking.setNowOverride('1209601'); // next week
		  await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		  await this.stakingWeight.setNowOverride('1209601'); // next week


		  const initialDecoBalance = await this.decoToken.balanceOf(staker);
		  const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'], {from: staker});
		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'], {from: staker2});

		  const finalDecoBalance = await this.decoToken.balanceOf(staker);
		  const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  console.log('FOR THE SKINS TEST THE BALANCES ARE **********');
		  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
		  console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());

		  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(new BN('0'));
		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  // Allow for a little bit of derivation for low reaction nfts - there is a decay rate
		  expect(finalDecoBalance.add(finalDecoBalance2)).to.be.bignumber.greaterThan(FOURTY_TOKENS);

		  expect(finalDecoBalance > finalDecoBalance2);

	  });

	  it('successfully deposits many NFT and batch skins with different users, 1 clapWhitelistedNFT', async () => {
	  		// Pre req, staker 2 puts some tokens in.
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
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
		  await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});

		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker2});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'],{from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'],{from: staker2});

		  await this.stakingWeight.clapWhitelistedNFT([this.skinsToken.address], ['100002'], [30], {from: staker2})

		  console.log('The staked tokens are');
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker, this.skinsToken.address));
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker2, this.skinsToken.address));

		  await this.guildNFTRewards.setNowOverride('1209601'); // next week
		  await this.guildNftStaking.setNowOverride('1209601'); // next week
		  await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		  await this.stakingWeight.setNowOverride('1209601'); // next week


		  const initialDecoBalance = await this.decoToken.balanceOf(staker);
		  const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'], {from: staker});
		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'], {from: staker2});

		  const finalDecoBalance = await this.decoToken.balanceOf(staker);
		  const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);


		  console.log('FOR THE SKINS TEST THE BALANCES ARE **********');
		  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
		  console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());
		  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(new BN('0'));
		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  // Allow for a little bit of derivation for low reaction nfts - there is a decay rate
		  expect(finalDecoBalance.add(finalDecoBalance2)).to.be.bignumber.greaterThan(FOURTY_TOKENS);

		  expect(finalDecoBalance > finalDecoBalance2);

	  });
	  it('successfully deposits many NFT and batch skins with different users, lots of rewards', async () => {
	  		// Pre req, staker 2 puts some tokens in.
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
		  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");
		  await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: staker});
		  await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: staker2});

		  // Mint staker 1 some skins tokens
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});
		  await this.skinsToken.mint(staker2, randomURI, minter, {from: minter});

		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker});
		  await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker2});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'],{from: staker});
		  await this.guildWhitelistedNftStaking.stakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'],{from: staker2});

		  await this.stakingWeight.clapWhitelistedNFT([this.skinsToken.address], ['100002'], [30], {from: staker2})

		  console.log('The staked tokens are');
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker, this.skinsToken.address));
		  console.log(await this.guildWhitelistedNftStaking.getStakedTokens(staker2, this.skinsToken.address));

		  await this.guildNFTRewards.setNowOverride('1209601'); // next week
		  await this.guildNftStaking.setNowOverride('1209601'); // next week
		  await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		  await this.stakingWeight.setNowOverride('1209601'); // next week


		  await this.stakingWeight.clapWhitelistedNFT([this.skinsToken.address], ['100002'], [30], {from: staker2})

		  await this.stakingWeight.reactWhitelistedNFT([this.skinsToken.address], ['100002'], ['Favorite'], {from: staker2});
//		  await this.stakingWeight.follow([this.skinsToken.address], ['100002'], {from: staker2});
//		  await this.stakingWeight.share([this.skinsToken.address], ['100002'], {from: staker2});


		  const initialDecoBalance = await this.decoToken.balanceOf(staker);
		  const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100001','100002'], {from: staker});
		  await this.guildWhitelistedNftStaking.unstakeBatch(new Array(2).fill(this.skinsToken.address), ['100003','100004'], {from: staker2});

		  const finalDecoBalance = await this.decoToken.balanceOf(staker);
		  const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);


		  console.log('FOR THE SKINS TEST THE BALANCES ARE **********');
		  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
		  console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());
		  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(new BN('0'));
		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(new BN('0'));

		  expect(finalDecoBalance.add(finalDecoBalance2)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

		  expect(finalDecoBalance > finalDecoBalance2);

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


		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week

	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);


	  await this.guildNftStaking.unstakeBatch([TOKEN_2,TOKEN_4,TOKEN_1,TOKEN_3], {from: staker});

	  expect(await this.guildNftStaking.nftStakedTotal()).to.be.bignumber.equal("0");

	  const finalDecoBalance = await this.decoToken.balanceOf(staker);

		console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	  // TODO !!
	  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(FOURTY_NINE_TOKENS);

	});

	it('successfully claims reward  NFT', async () => {
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	  await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker});
	  await this.guildNftStaking.stake(TOKEN_1,{from: staker});


		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week

	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);


	  await this.guildNftStaking.claimReward(staker, {from: staker});


	  const finalDecoBalance = await this.decoToken.balanceOf(staker);

	  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(FOURTY_NINE_TOKENS);

	  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	});

	it('successfully claims reward  NFT', async () => {
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	  await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker});
	  await this.guildNftStaking.stake(TOKEN_1,{from: staker});


		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week

	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);


	  await this.guildNftStaking.claimReward(staker, {from: staker});


	  const finalDecoBalance = await this.decoToken.balanceOf(staker);

	  expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(FOURTY_NINE_TOKENS);

	  console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	});

	it('successfully emergency unstakes  NFT', async () => {
	  await this.token.mint(staker, minter, {from: minter});
	  await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	  await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: staker});
	  await this.guildNftStaking.stake(TOKEN_1,{from: staker});


		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week

	  console.log('balance of staker before and after:');

	  const initialDecoBalance = await this.decoToken.balanceOf(staker);


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
	//

	// // Make sure we can withdraw and deposit the same amount back in.
	// await this.guildNFTRewards.setRewards([3], [FIFTY_TOKENS], {from: admin});

		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week

	console.log('balance of staker before and after:');

	const initialDecoBalance = await this.decoToken.balanceOf(staker);
	const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

	console.log("Unclaimed rewards");
	console.log(await this.guildNftStaking.unclaimedRewards(staker));
	console.log(await this.guildNftStaking.unclaimedRewards(staker2));

	//await time.increase(time.duration.seconds(1000001));

	console.log('await this.guildNFTRewards.getDecoDailyAPY()');
	console.log(await this.guildNFTRewards.getDecoDailyAPY());

	console.log("staker1");
	console.log(staker);
	console.log("staker2");
	console.log(staker2);
	console.log("weights");
	console.log((await this.stakingWeight.getOwnerWeight(staker)).toString());
	console.log((await this.stakingWeight.getOwnerWeight(staker2)).toString());
	console.log((await this.stakingWeight.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_1,TOKEN_2], {from: staker});

		console.log("weights");
		console.log((await this.stakingWeight.getOwnerWeight(staker)).toString());
		console.log((await this.stakingWeight.getOwnerWeight(staker2)).toString());
		console.log((await this.stakingWeight.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_3, TOKEN_4], {from: staker2});


	const finalDecoBalance = await this.decoToken.balanceOf(staker);
	const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);


	console.log('initial deco balance 1');
	console.log(initialDecoBalance);
	console.log('initial deco balance 2');
	console.log(initialDecoBalance2);

	console.log('final deco balance 1');
	console.log(finalDecoBalance.toString());
	console.log('final deco balance 2');
	console.log(finalDecoBalance2.toString());

	expect(finalDecoBalance2.add(finalDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);


	// expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);
	// expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);

	console.log('Staker 1 and 2');
	console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());


  });

	it('successfully deposits many NFT and batch with multiple users multiple weeks and appraises appraiser', async () => {
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

		await this.stakingWeight.appraiseGuildMember(Array(1).fill(staker), Array(1).fill( 'Love'), {from: staker2});
	//	await this.stakingWeight.appraiseGuildMember(Array(200).fill(staker), Array(200).fill( 'Love'), {from: staker2});
	//await this.guildNftStaking.stakeAll({from: staker});
	console.log(await this.guildNftStaking.getStakedTokens(staker));
	console.log(await this.guildNftStaking.getStakedTokens(staker2));
	//

		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week
		 // next week
	console.log('balance of staker before and after:');

	const initialDecoBalance = await this.decoToken.balanceOf(staker);
	const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

	console.log("Unclaimed rewards");
	console.log(await this.guildNftStaking.unclaimedRewards(staker));
	console.log(await this.guildNftStaking.unclaimedRewards(staker2));

	//await time.increase(time.duration.seconds(1000001));

	console.log('await this.guildNFTRewards.getDecoDailyAPY()');
	console.log(await this.guildNFTRewards.getDecoDailyAPY());

	console.log("staker1");
	console.log(staker);
	console.log("staker2");
	console.log(staker2);
	console.log("weights");
	console.log((await this.stakingWeight.getOwnerWeight(staker)).toString());
	console.log((await this.stakingWeight.getOwnerWeight(staker2)).toString());
	console.log((await this.stakingWeight.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_1,TOKEN_2], {from: staker});

		console.log("weights");
		console.log((await this.stakingWeight.getOwnerWeight(staker)).toString());
		console.log((await this.stakingWeight.getOwnerWeight(staker2)).toString());
		console.log((await this.stakingWeight.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_3, TOKEN_4], {from: staker2});


	const finalDecoBalance = await this.decoToken.balanceOf(staker);
	const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);


	console.log('initial deco balance 1');
	console.log(initialDecoBalance);
	console.log('initial deco balance 2');
	console.log(initialDecoBalance2);

	console.log('final deco balance 1');
	console.log(finalDecoBalance.toString());
	console.log('final deco balance 2');
	console.log(finalDecoBalance2.toString());

	expect(finalDecoBalance2.add(finalDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);


	// expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);
	// expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);

	console.log('Staker 1 and 2');
	console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());
  });

	it('successfully deposits many NFT and batch with multiple users multiple weeks, test that DECO holder earns more', async () => {
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

		await this.decoToken.mint(staker, TWO_THOUSAND_TOKENS, { from: minter });
		await this.stakingWeight.appraiseGuildMember(Array(1).fill(staker), Array(1).fill( 'Love'), {from: staker2});
		await this.stakingWeight.appraiseGuildMember(Array(1).fill(staker2), Array(1).fill( 'Love'), {from: staker});
	//	await this.stakingWeight.appraiseGuildMember(Array(200).fill(staker), Array(200).fill( 'Love'), {from: staker2});
	//await this.guildNftStaking.stakeAll({from: staker});
	console.log(await this.guildNftStaking.getStakedTokens(staker));
	console.log(await this.guildNftStaking.getStakedTokens(staker2));
	//

		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week

	console.log('balance of staker before and after:');

	const initialDecoBalance = await this.decoToken.balanceOf(staker);
	const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

	console.log("Unclaimed rewards");
	console.log(await this.guildNftStaking.unclaimedRewards(staker));
	console.log(await this.guildNftStaking.unclaimedRewards(staker2));

	//await time.increase(time.duration.seconds(1000001));

	console.log('await this.guildNFTRewards.getDecoDailyAPY()');
	console.log(await this.guildNFTRewards.getDecoDailyAPY());

	console.log("staker1");
	console.log(staker);
	console.log("staker2");
	console.log(staker2);
	console.log("weights");
	console.log((await this.stakingWeight.getOwnerWeight(staker)).toString());
	console.log((await this.stakingWeight.getOwnerWeight(staker2)).toString());
	console.log((await this.stakingWeight.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_1,TOKEN_2], {from: staker});

		console.log("weights");
		console.log((await this.stakingWeight.getOwnerWeight(staker)).toString());
		console.log((await this.stakingWeight.getOwnerWeight(staker2)).toString());
		console.log((await this.stakingWeight.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_3, TOKEN_4], {from: staker2});


	const finalDecoBalance = await this.decoToken.balanceOf(staker);
	const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);


	console.log('initial deco balance 1');
	console.log(initialDecoBalance);
	console.log('initial deco balance 2');
	console.log(initialDecoBalance2);

	console.log('final deco balance 1');
	console.log(finalDecoBalance.toString());
	console.log('final deco balance 2');
	console.log(finalDecoBalance2.toString());

	expect(finalDecoBalance2.add(finalDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);
	console.log('Make sure that staker 1 gets more than staker 2 because they had more DECO');
	expect(finalDecoBalance2 < finalDecoBalance);


	// expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);
	// expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);

	console.log('Staker 1 and 2');
	console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());
  });

	it('successfully deposits many NFT and batch with multiple users multiple weeks, test that user appraising whitelisted nfts earns more', async () => {
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

	// Mint staker 3vsome skins tokens
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});

	await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker3});

	await this.guildWhitelistedNftStaking.stakeBatch(new Array(4).fill(this.skinsToken.address), ['100001','100002','100003','100004'],{from: staker3});

	await this.stakingWeight.reactWhitelistedNFT(new Array(3).fill(this.skinsToken.address), ['100001', '100002', '100003'], new Array(3).fill("Favorite"), {from: staker});

	await this.stakingWeight.appraiseGuildMember(Array(1).fill(staker), Array(1).fill( 'Love'), {from: staker2});
	await this.stakingWeight.appraiseGuildMember(Array(1).fill(staker2), Array(1).fill( 'Love'), {from: staker});
	//	await this.stakingWeight.appraiseGuildMember(Array(200).fill(staker), Array(200).fill( 'Love'), {from: staker2});
	//await this.guildNftStaking.stakeAll({from: staker});
	console.log(await this.guildNftStaking.getStakedTokens(staker));
	console.log(await this.guildNftStaking.getStakedTokens(staker2));
	//

		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week

	console.log('balance of staker before and after:');

	const initialDecoBalance = await this.decoToken.balanceOf(staker);
	const initialDecoBalance2 = await this.decoToken.balanceOf(staker2);

	console.log("Unclaimed rewards");
	console.log(await this.guildNftStaking.unclaimedRewards(staker));
	console.log(await this.guildNftStaking.unclaimedRewards(staker2));

	//await time.increase(time.duration.seconds(1000001));

	console.log('await this.guildNFTRewards.getDecoDailyAPY()');
	console.log(await this.guildNFTRewards.getDecoDailyAPY());

	console.log("staker1");
	console.log(staker);
	console.log("staker2");
	console.log(staker2);
	console.log("weights");
	console.log((await this.stakingWeight.getOwnerWeight(staker)).toString());
	console.log((await this.stakingWeight.getOwnerWeight(staker2)).toString());
	console.log((await this.stakingWeight.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_1,TOKEN_2], {from: staker});

		console.log("weights");
		console.log((await this.stakingWeight.getOwnerWeight(staker)).toString());
		console.log((await this.stakingWeight.getOwnerWeight(staker2)).toString());
		console.log((await this.stakingWeight.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_3, TOKEN_4], {from: staker2});


	const finalDecoBalance = await this.decoToken.balanceOf(staker);
	const finalDecoBalance2 = await this.decoToken.balanceOf(staker2);


	console.log('initial deco balance 1');
	console.log(initialDecoBalance);
	console.log('initial deco balance 2');
	console.log(initialDecoBalance2);

	console.log('final deco balance 1');
	console.log(finalDecoBalance.toString());
	console.log('final deco balance 2');
	console.log(finalDecoBalance2.toString());

	console.log('Make sure that staker 1 gets more than staker 2 because they had appraisals done');
	expect(finalDecoBalance).to.be.bignumber.greaterThan(finalDecoBalance2);

		expect(finalDecoBalance2.add(finalDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

	// expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);
	// expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);

	console.log('Staker 1 and 2');
	console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());
  });
it('successfully deposits many NFT and batch with multiple users, and emergency unstakes and admin emergency unstakes', async () => {
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

	// Mint staker 3vsome skins tokens
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});

	await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker3});

	await this.guildWhitelistedNftStaking.stakeBatch(new Array(4).fill(this.skinsToken.address), ['100001','100002','100003','100004'],{from: staker3});

	// Try emergency unstake, admin and admin safe unstake
	await this.guildWhitelistedNftStaking.emergencyUnstake(this.skinsToken.address, '100001', {from: staker3});
	await this.guildWhitelistedNftStaking.adminEmergencyUnstake(this.skinsToken.address, '100002', {from: admin});
	await this.guildWhitelistedNftStaking.adminEmergencySafeUnstake(this.skinsToken.address, '100003', {from: admin});
  });

	it('successfully upgrades the contract', async () => {
		const [adminAccount, stakerAccount, stakerAccount2] = await ethers.getSigners();

		const StakingWeightV2ContractFactory = await ethers.getContractFactory("GuildNFTStakingWeightV2Mock");
		const StakingWeightV2ContractFactoryV2 = await ethers.getContractFactory("GuildNFTStakingWeightV3Mock");

		const stakingWeightDeployedProxy = await upgrades.deployProxy(StakingWeightV2ContractFactory, [this.guildNftStaking.address, this.guildWhitelistedNftStaking.address, this.decoToken.address, this.accessControls.address, this.stakingWeightStorage.address], {initializer: 'initialize'});

		console.log('contracstt deployed');
		await this.guildNftStaking.setWeightingContract(stakingWeightDeployedProxy.address, {from: admin});
		await this.stakingWeightStorage.updateWeightContract(stakingWeightDeployedProxy.address, {from: admin});
			console.log('weighting contract switched');
		const stakingWeightDepoyedProxy2 = stakingWeightDeployedProxy; //

		const newWeighting = new ethers.Contract(
			stakingWeightDepoyedProxy2.address,
			GuildNFTStakingWeight.abi,
			stakerAccount
		);
		const newWeighting2 = new ethers.Contract(
			stakingWeightDepoyedProxy2.address,
			GuildNFTStakingWeight.abi,
			stakerAccount2
		);
		console.log('proxy updated');
	await this.token.mint(stakerAccount.address, minter, {from: minter});
	await this.token.mint(stakerAccount.address, minter, {from: minter});
	await this.token.mint(stakerAccount2.address, minter, {from: minter});
	await this.token.mint(stakerAccount2.address, minter, {from: minter});
	await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	await this.token.setPrimarySalePrice(TOKEN_2, ONE_ETH, {from: admin});
	await this.token.setPrimarySalePrice(TOKEN_3, ONE_ETH, {from: admin});
	await this.token.setPrimarySalePrice(TOKEN_4, ONE_ETH, {from: admin});
	await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: stakerAccount.address});
	await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: stakerAccount2.address});
	await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: stakerAccount.address});
	await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: stakerAccount2.address});

	// Mint staker 3vsome skins tokens
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});

	await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker3});

	await this.guildWhitelistedNftStaking.stakeBatch(new Array(4).fill(this.skinsToken.address), ['100001','100002','100003','100004'],{from: staker3});

	//await stakingWeightDeployedProxy.favorite(new Array(3).fill(this.skinsToken.address), ['100001', '100002', '100003'], {from: staker});
	await newWeighting.reactWhitelistedNFT(new Array(3).fill(this.skinsToken.address), ['100001', '100002', '100003'],  new Array(3).fill("Favorite"));

	// await stakingWeightDeployedProxy.appraiseGuildMember(Array(1).fill(staker), Array(1).fill( 'Love'), {from: staker2});
	// await stakingWeightDeployedProxy.appraiseGuildMember(Array(1).fill(staker2), Array(1).fill( 'Love'), {from: staker});
	await newWeighting2.appraiseGuildMember(Array(1).fill(stakerAccount.address), Array(1).fill( 'Love'));
	await newWeighting.appraiseGuildMember(Array(1).fill(stakerAccount2.address), Array(1).fill( 'Love'));

	//	await this.stakingWeight.appraiseGuildMember(Array(200).fill(staker), Array(200).fill( 'Love'), {from: staker2});
	//await this.guildNftStaking.stakeAll({from: staker});
	console.log(await this.guildNftStaking.getStakedTokens(stakerAccount.address));
	console.log(await this.guildNftStaking.getStakedTokens(stakerAccount2.address));
	//

		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week
		await stakingWeightDeployedProxy.setNowOverride('1209601'); // next week

	console.log('balance of staker before and after:');

	const initialDecoBalance = await this.decoToken.balanceOf(stakerAccount.address);
	const initialDecoBalance2 = await this.decoToken.balanceOf(stakerAccount2.address);

	console.log("Unclaimed rewards");
	console.log(await this.guildNftStaking.unclaimedRewards(stakerAccount.address));
	console.log(await this.guildNftStaking.unclaimedRewards(stakerAccount2.address));

	//await time.increase(time.duration.seconds(1000001));

	console.log('await this.guildNFTRewards.getDecoDailyAPY()');
	console.log(await this.guildNFTRewards.getDecoDailyAPY());

	console.log("staker1");
	console.log(stakerAccount.address);
	console.log("staker2");
	console.log(stakerAccount2.address);
	console.log("weights");
	console.log((await stakingWeightDepoyedProxy2.getOwnerWeight(stakerAccount.address)).toString());
	console.log((await stakingWeightDepoyedProxy2.getOwnerWeight(stakerAccount2.address)).toString());
	console.log("diving in");
	console.log((await stakingWeightDeployedProxy.getTotalWhitelistedNFTTokenWeight()).toString());
	console.log((await stakingWeightDepoyedProxy2.getTotalWhitelistedNFTTokenWeight()).toString());
	console.log((await stakingWeightDepoyedProxy2.startTime()).toString());
	console.log('Thats it folks');

	const stakingWeightV3Contract = await upgrades.upgradeProxy(stakingWeightDeployedProxy.address, StakingWeightV2ContractFactoryV2);

		await stakingWeightV3Contract.setNowOverride('1209601'); // next week
	console.log("diving in");
		console.log((await stakingWeightDeployedProxy.getTotalWhitelistedNFTTokenWeight()).toString());
		console.log((await stakingWeightDepoyedProxy2.getTotalWhitelistedNFTTokenWeight()).toString());
		console.log((await stakingWeightV3Contract.getTotalWhitelistedNFTTokenWeight()).toString());


		console.log((await stakingWeightDepoyedProxy2.startTime()).toString());
		console.log((await stakingWeightV3Contract.startTime()).toString());
/*
		console.log((await stakingWeightV3Contract.testValue()).toString());

		await stakingWeightV3Contract.setTest();
		console.log('initialized')
		console.log((await stakingWeightV3Contract.testValue()).toString());*/

		console.log('Thats it folks');

	await this.guildNftStaking.unstakeBatch([TOKEN_1,TOKEN_2], {from: stakerAccount.address});

		console.log("weights");
		console.log((await stakingWeightDeployedProxy.getOwnerWeight(stakerAccount.address)).toString());
		console.log((await stakingWeightDeployedProxy.getOwnerWeight(stakerAccount2.address)).toString());
		console.log((await stakingWeightDeployedProxy.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_3, TOKEN_4], {from: stakerAccount2.address});


	const finalDecoBalance = await this.decoToken.balanceOf(stakerAccount.address);
	const finalDecoBalance2 = await this.decoToken.balanceOf(stakerAccount2.address);


	console.log('initial deco balance 1');
	console.log(initialDecoBalance);
	console.log('initial deco balance 2');
	console.log(initialDecoBalance2);

	console.log('final deco balance 1');
	console.log(finalDecoBalance.toString());
	console.log('final deco balance 2');
	console.log(finalDecoBalance2.toString());

	console.log('Make sure that staker 1 gets more than staker 2 because they had appraisals done');
	expect(finalDecoBalance).to.be.bignumber.greaterThan(finalDecoBalance2);

		expect(finalDecoBalance2.add(finalDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

	// expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);
	// expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);

	console.log('Staker 1 and 2');
	console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());
  });

	it('successfully upgrades the contract', async () => {
		const [adminAccount, stakerAccount, stakerAccount2, stakerAccount3] = await ethers.getSigners();

		const StakingWeightV2ContractFactory = await ethers.getContractFactory("GuildNFTStakingWeightV2Mock");
		const StakingWeightV2ContractFactoryV2 = await ethers.getContractFactory("GuildNFTStakingWeightV3Mock");

		const stakingWeightDeployedProxy = await upgrades.deployProxy(StakingWeightV2ContractFactory, [this.guildNftStaking.address, this.guildWhitelistedNftStaking.address, this.decoToken.address, this.accessControls.address, this.stakingWeightStorage.address], {initializer: 'initialize'});

		console.log('contracstt deployed');
		await this.guildNftStaking.setWeightingContract(stakingWeightDeployedProxy.address, {from: admin});
		await this.stakingWeightStorage.updateWeightContract(stakingWeightDeployedProxy.address, {from: admin});
			console.log('weighting contract switched');
		const stakingWeightDepoyedProxy2 = stakingWeightDeployedProxy; //

		const newWeighting = new ethers.Contract(
			stakingWeightDepoyedProxy2.address,
			GuildNFTStakingWeight.abi,
			stakerAccount
		);
		const newWeighting2 = new ethers.Contract(
			stakingWeightDepoyedProxy2.address,
			GuildNFTStakingWeight.abi,
			stakerAccount2
		);
		console.log('proxy updated');
	await this.token.mint(stakerAccount.address, minter, {from: minter});
	await this.token.mint(stakerAccount.address, minter, {from: minter});
	await this.token.mint(stakerAccount2.address, minter, {from: minter});
	await this.token.mint(stakerAccount2.address, minter, {from: minter});
	await this.token.setPrimarySalePrice(TOKEN_1, ONE_ETH, {from: admin});
	await this.token.setPrimarySalePrice(TOKEN_2, ONE_ETH, {from: admin});
	await this.token.setPrimarySalePrice(TOKEN_3, ONE_ETH, {from: admin});
	await this.token.setPrimarySalePrice(TOKEN_4, ONE_ETH, {from: admin});
	await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: stakerAccount.address});
	await this.token.setApprovalForAll(this.guildNftStaking.address, true, {from: stakerAccount2.address});
	await this.guildNftStaking.stakeBatch([TOKEN_1,TOKEN_2],{from: stakerAccount.address});
	await this.guildNftStaking.stakeBatch([TOKEN_3,TOKEN_4],{from: stakerAccount2.address});

	// Mint staker 3vsome skins tokens
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});
	await this.skinsToken.mint(staker3, randomURI, minter, {from: minter});

	await this.skinsToken.setApprovalForAll(this.guildWhitelistedNftStaking.address, true, {from: staker3});

	await this.guildWhitelistedNftStaking.stakeBatch(new Array(4).fill(this.skinsToken.address), ['100001','100002','100003','100004'],{from: staker3});

	//await stakingWeightDeployedProxy.favorite(new Array(3).fill(this.skinsToken.address), ['100001', '100002', '100003'], {from: staker});
	await newWeighting.reactWhitelistedNFT(new Array(3).fill(this.skinsToken.address), ['100001', '100002', '100003'],  new Array(3).fill("Favorite"));

	// await stakingWeightDeployedProxy.appraiseGuildMember(Array(1).fill(staker), Array(1).fill( 'Love'), {from: staker2});
	// await stakingWeightDeployedProxy.appraiseGuildMember(Array(1).fill(staker2), Array(1).fill( 'Love'), {from: staker});
	await newWeighting2.appraiseGuildMember(Array(1).fill(stakerAccount.address), Array(1).fill( 'Love'));
	await newWeighting.appraiseGuildMember(Array(1).fill(stakerAccount2.address), Array(1).fill( 'Love'));

	//	await this.stakingWeight.appraiseGuildMember(Array(200).fill(staker), Array(200).fill( 'Love'), {from: staker2});
	//await this.guildNftStaking.stakeAll({from: staker});
	console.log(await this.guildNftStaking.getStakedTokens(stakerAccount.address));
	console.log(await this.guildNftStaking.getStakedTokens(stakerAccount2.address));
	//

		await this.guildNFTRewards.setNowOverride('1209601'); // next week
		await this.guildNftStaking.setNowOverride('1209601'); // next week
		await this.guildWhitelistedNftStaking.setNowOverride('1209601'); // next week
		await this.stakingWeight.setNowOverride('1209601'); // next week
		await stakingWeightDeployedProxy.setNowOverride('1209601'); // next week

	console.log('balance of staker before and after:');

	const initialDecoBalance = await this.decoToken.balanceOf(stakerAccount.address);
	const initialDecoBalance2 = await this.decoToken.balanceOf(stakerAccount2.address);

	console.log("Unclaimed rewards");
	console.log(await this.guildNftStaking.unclaimedRewards(stakerAccount.address));
	console.log(await this.guildNftStaking.unclaimedRewards(stakerAccount2.address));

	//await time.increase(time.duration.seconds(1000001));

	console.log('await this.guildNFTRewards.getDecoDailyAPY()');
	console.log(await this.guildNFTRewards.getDecoDailyAPY());

	console.log("staker1");
	console.log(stakerAccount.address);
	console.log("staker2");
	console.log(stakerAccount2.address);
	console.log("weights");
	console.log((await stakingWeightDepoyedProxy2.getOwnerWeight(stakerAccount.address)).toString());
	console.log((await stakingWeightDepoyedProxy2.getOwnerWeight(stakerAccount2.address)).toString());
	console.log("diving in");
	console.log((await stakingWeightDeployedProxy.getTotalWhitelistedNFTTokenWeight()).toString());
	console.log((await stakingWeightDepoyedProxy2.getTotalWhitelistedNFTTokenWeight()).toString());
	console.log((await stakingWeightDepoyedProxy2.startTime()).toString());
	console.log('Thats it folks');
	console.log('before balance whitelisted:');

		console.log((await stakingWeightDeployedProxy.balanceOfWhitelistedNFT(stakerAccount3.address)).toString());
	const stakingWeightV3Contract = await upgrades.upgradeProxy(stakingWeightDeployedProxy.address, StakingWeightV2ContractFactoryV2);

		await stakingWeightV3Contract.setNowOverride('1209601'); // next week
	console.log("diving in");
		console.log((await stakingWeightDeployedProxy.getTotalWhitelistedNFTTokenWeight()).toString());
		console.log((await stakingWeightDepoyedProxy2.getTotalWhitelistedNFTTokenWeight()).toString());
		console.log((await stakingWeightV3Contract.getTotalWhitelistedNFTTokenWeight()).toString());


		console.log('try upgrade and set whitelisted nft count')
		console.log((await stakingWeightV3Contract.balanceOfWhitelistedNFT(stakerAccount.address)).toString());
		console.log((await stakingWeightV3Contract.balanceOfWhitelistedNFT(stakerAccount2.address)).toString());
		console.log((await stakingWeightV3Contract.balanceOfWhitelistedNFT(stakerAccount3.address)).toString());
		// await stakingWeightV3Contract.setStakedWhitelistedNFTCount(stakerAccount3.address, 4);
		// console.log((await stakingWeightV3Contract.balanceOfWhitelistedNFT(stakerAccount3.address)).toString());

		console.log((await stakingWeightDepoyedProxy2.startTime()).toString());
		console.log((await stakingWeightV3Contract.startTime()).toString());

		// console.log((await stakingWeightV3Contract.testValue()).toString());
		//
		// await stakingWeightV3Contract.setTest();
		// console.log('initialized')
		// console.log((await stakingWeightV3Contract.testValue()).toString());

		console.log('Thats it folks');

	await this.guildNftStaking.unstakeBatch([TOKEN_1,TOKEN_2], {from: stakerAccount.address});

		console.log("weights");
		console.log((await stakingWeightDeployedProxy.getOwnerWeight(stakerAccount.address)).toString());
		console.log((await stakingWeightDeployedProxy.getOwnerWeight(stakerAccount2.address)).toString());
		console.log((await stakingWeightDeployedProxy.getTotalWeight()).toString());

	await this.guildNftStaking.unstakeBatch([TOKEN_3, TOKEN_4], {from: stakerAccount2.address});


	const finalDecoBalance = await this.decoToken.balanceOf(stakerAccount.address);
	const finalDecoBalance2 = await this.decoToken.balanceOf(stakerAccount2.address);


	console.log('initial deco balance 1');
	console.log(initialDecoBalance);
	console.log('initial deco balance 2');
	console.log(initialDecoBalance2);

	console.log('final deco balance 1');
	console.log(finalDecoBalance.toString());
	console.log('final deco balance 2');
	console.log(finalDecoBalance2.toString());

	console.log('Make sure that staker 1 gets more than staker 2 because they had appraisals done');
	expect(finalDecoBalance).to.be.bignumber.greaterThan(finalDecoBalance2);

//		console.log('Check greater than fifty tokens');
//		expect(finalDecoBalance2.add(finalDecoBalance)).to.be.bignumber.greaterThan(FIFTY_TOKENS);

	// 	console.log('Check greater than hundred tokens');
	// expect(finalDecoBalance.sub(initialDecoBalance)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);
	// 	console.log('Check greater than hundred tokens');
	// expect(finalDecoBalance2.sub(initialDecoBalance2)).to.be.bignumber.greaterThan(HUNDRED_TOKENS);

	console.log('Staker 1 and 2');
	console.log(finalDecoBalance.sub(initialDecoBalance).toString());
	console.log(finalDecoBalance2.sub(initialDecoBalance2).toString());

		const initial3balance = await stakingWeightV3Contract.calcNewOwnerWeight(stakerAccount3.address);
	await this.guildNftStaking.claimReward(stakerAccount3.address, {from: stakerAccount3.address});

		const finalBalance3 = await stakingWeightV3Contract.calcNewWhitelistedNFTOwnerWeight(stakerAccount3.address);
	console.log('Staker 3 was not staked and received:');
	console.log(initial3balance);
	console.log(finalBalance3);

  });

	async function getGasCosts(receipt) {
	  const tx = await web3.eth.getTransaction(receipt.tx);
	  const gasPrice = new BN(tx.gasPrice);
	  return gasPrice.mul(new BN(receipt.receipt.gasUsed));
	}
  });
