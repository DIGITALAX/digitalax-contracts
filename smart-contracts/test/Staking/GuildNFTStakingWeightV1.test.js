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
  const GuildNFTStaking = artifacts.require('GuildNFTStakingMock');
  const GuildNFTStakingWeight = artifacts.require('GuildNFTStakingWeightMock');
  const DigitalaxMonaOracle = artifacts.require('DigitalaxMonaOracle');
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
  const THREE_ETH = ether('3');
  const FOUR_ETH = ether('4');
  const FIVE_ETH = ether('5');
  const SIX_ETH = ether('6');
  const SEVEN_ETH = ether('7');
  const EIGHT_ETH = ether('8');
	const NINE_ETH = ether('9');
	const THIRTEEN_ETH = ether('13');
	const FIFTEEN_ETH = ether('15');
  const MAX_NUMBER_OF_POOLS = new BN('20');
	const randomURI = 'rand';

  contract('GuildNFTStaking', (accounts) => {
	const [admin, smartContract, platformFeeAddress, minter, provider, staker, staker2] = accounts;

	beforeEach(async () => {
	  this.accessControls = await DigitalaxAccessControls.new({from: admin});
	  await this.accessControls.addMinterRole(minter, {from: admin});
	  await this.accessControls.addSmartContractRole(smartContract, {from: admin});

	  this.stakingWeight = await GuildNFTStakingWeight.new();
	});

	it('successfully stakes NFT and unstakes', async () => {
		await this.stakingWeight.stake('100001', staker, ONE_ETH);
		await this.stakingWeight.stake('100002', staker, TWO_ETH);
	  const stakedBalance = await this.stakingWeight.balanceOf(staker);
	  expect(stakedBalance).to.be.bignumber.equal(THREE_ETH);

	  await time.increase(time.duration.seconds(120));

	  await this.stakingWeight.unstake('100001', staker);
	  const unstakedBalance = await this.stakingWeight.balanceOf(staker);

	  expect(stakedBalance.sub(unstakedBalance)).to.be.bignumber.equal(ONE_ETH);
	});

	it('successfully update weight', async () => {
		await this.stakingWeight.stake('100001', staker, ONE_ETH);
		await this.stakingWeight.stake('100002', staker, ONE_ETH);
		await this.stakingWeight.stake('100003', staker, ONE_ETH);
		const stakedBalance = await this.stakingWeight.balanceOf(staker);
	  expect(stakedBalance).to.be.bignumber.equal(THREE_ETH);

		await this.stakingWeight.updateOwnerWeight(staker);
		const ownerWeight1 = await this.stakingWeight.getOwnerWeight(staker);
		const totalWeight1 = await this.stakingWeight.getTotalWeight();
	  expect(ownerWeight1).to.be.bignumber.equal("0");
	  expect(totalWeight1).to.be.bignumber.equal("0");

		const startTime = await this.stakingWeight.startTime();
	  expect(startTime).to.be.bignumber.equal("0");

	  await time.increase(time.duration.seconds(120));
	  await this.stakingWeight.setNowOverride('3'); // after 3 seconds3

		await this.stakingWeight.updateOwnerWeight(staker);
		const ownerWeight2 = await this.stakingWeight.getOwnerWeight(staker);
		const totalWeight2 = await this.stakingWeight.getTotalWeight();
	  expect(ownerWeight2).to.be.bignumber.equal(NINE_ETH);
	  expect(totalWeight2).to.be.bignumber.equal(NINE_ETH);
	});

	it('successfully update weight with multiple owners', async () => {
		await this.stakingWeight.stake('100001', staker, ONE_ETH);
		await this.stakingWeight.stake('100002', staker, ONE_ETH);
		await this.stakingWeight.stake('100003', staker2, ONE_ETH);
		await this.stakingWeight.stake('100004', staker2, TWO_ETH);
		const stakedBalance = await this.stakingWeight.balance();
	  expect(stakedBalance).to.be.bignumber.equal(FIVE_ETH);

	  await time.increase(time.duration.seconds(120));
	  await this.stakingWeight.setNowOverride('3'); // after 3 seconds

		await this.stakingWeight.updateOwnerWeight(staker);	// update only staker1's weight (update total weight automatically)
		const owner1_Weight1 = await this.stakingWeight.getOwnerWeight(staker);
		const owner2_Weight1 = await this.stakingWeight.getOwnerWeight(staker2);
		const totalWeight1 = await this.stakingWeight.getTotalWeight();
	  expect(owner1_Weight1).to.be.bignumber.equal(SIX_ETH);
	  expect(owner2_Weight1).to.be.bignumber.equal("0");
	  expect(totalWeight1).to.be.bignumber.equal(FIFTEEN_ETH);

		await this.stakingWeight.updateOwnerWeight(staker2);	// update only staker2's weight (doesn't update total weight by lastUpdateTime)
		const owner1_Weight2 = await this.stakingWeight.getOwnerWeight(staker);
		const owner2_Weight2 = await this.stakingWeight.getOwnerWeight(staker2);
		const totalWeight2 = await this.stakingWeight.getTotalWeight();
	  expect(owner1_Weight2).to.be.bignumber.equal(SIX_ETH);
	  expect(owner2_Weight2).to.be.bignumber.equal(NINE_ETH);
	  expect(totalWeight2).to.be.bignumber.equal(FIFTEEN_ETH);
	});

	it('successfully update weight with multiple owners and different stake & update time', async () => {
		
		// --------------------- after 1 sec (owner1 stakes his token) ---------------------
	  await this.stakingWeight.setNowOverride('1');
		await this.stakingWeight.stake('100001', staker, ONE_ETH);
		let stakedBalance = await this.stakingWeight.balance();
	  expect(stakedBalance).to.be.bignumber.equal(ONE_ETH);

		// --------------------- after 2 secs (owner2 stakes his token & update total weight) ---------------------
		await time.increase(time.duration.seconds(120));
	  await this.stakingWeight.setNowOverride('2');

		await this.stakingWeight.stake('100003', staker2, ONE_ETH);
		stakedBalance = await this.stakingWeight.balance();
	  expect(stakedBalance).to.be.bignumber.equal(TWO_ETH);

		await this.stakingWeight.updateWeight();
		let owner1_Weight = await this.stakingWeight.getOwnerWeight(staker);
		let owner2_Weight = await this.stakingWeight.getOwnerWeight(staker2);
		let totalWeight = await this.stakingWeight.getTotalWeight();
	  expect(owner1_Weight).to.be.bignumber.equal("0");
	  expect(owner2_Weight).to.be.bignumber.equal("0");
	  expect(totalWeight).to.be.bignumber.equal(ONE_ETH);

		// --------------------- after 3 secs (owner1 & owner2 stake new tokens) ---------------------
		await time.increase(time.duration.seconds(120));
	  await this.stakingWeight.setNowOverride('3');

		await this.stakingWeight.stake('100002', staker, ONE_ETH);
		await this.stakingWeight.stake('100004', staker2, TWO_ETH);
		stakedBalance = await this.stakingWeight.balance();
	  expect(stakedBalance).to.be.bignumber.equal(FIVE_ETH);

		owner1_Weight = await this.stakingWeight.getOwnerWeight(staker);
		owner2_Weight = await this.stakingWeight.getOwnerWeight(staker2);
		totalWeight = await this.stakingWeight.getTotalWeight();
	  expect(owner1_Weight).to.be.bignumber.equal(TWO_ETH); // updateOwnerWeight has been called in stake
	  expect(owner2_Weight).to.be.bignumber.equal(ONE_ETH);	// updateOwnerWeight has been called in stake
	  expect(totalWeight).to.be.bignumber.equal(THREE_ETH);

		// --------------------- after 4 secs (owner2 updateOwnerWeight) ---------------------
		await time.increase(time.duration.seconds(120));
	  await this.stakingWeight.setNowOverride('4');

		await this.stakingWeight.updateOwnerWeight(staker2);
		owner1_Weight = await this.stakingWeight.getOwnerWeight(staker);
		owner2_Weight = await this.stakingWeight.getOwnerWeight(staker2);
		totalWeight = await this.stakingWeight.getTotalWeight();
	  expect(owner1_Weight).to.be.bignumber.equal(TWO_ETH);
	  expect(owner2_Weight).to.be.bignumber.equal(FOUR_ETH);
	  expect(totalWeight).to.be.bignumber.equal(EIGHT_ETH);

		// --------------------- after 5 secs (owner2 unstakes 1ETH token) ---------------------
		await time.increase(time.duration.seconds(120));
	  await this.stakingWeight.setNowOverride('5');

		await this.stakingWeight.unstake('100003', staker2);
		stakedBalance = await this.stakingWeight.balance();
	  expect(stakedBalance).to.be.bignumber.equal(FOUR_ETH);

		owner1_Weight = await this.stakingWeight.getOwnerWeight(staker);
		owner2_Weight = await this.stakingWeight.getOwnerWeight(staker2);
		totalWeight = await this.stakingWeight.getTotalWeight();
	  expect(owner1_Weight).to.be.bignumber.equal(TWO_ETH);
	  expect(owner2_Weight).to.be.bignumber.equal(SEVEN_ETH);
	  expect(totalWeight).to.be.bignumber.equal(THIRTEEN_ETH);

		await this.stakingWeight.updateOwnerWeight(staker);
		owner1_Weight = await this.stakingWeight.getOwnerWeight(staker);
		owner2_Weight = await this.stakingWeight.getOwnerWeight(staker2);
		totalWeight = await this.stakingWeight.getTotalWeight();
	  expect(owner1_Weight).to.be.bignumber.equal(SIX_ETH);
	  expect(owner2_Weight).to.be.bignumber.equal(SEVEN_ETH);
	  expect(totalWeight).to.be.bignumber.equal(THIRTEEN_ETH);
	});

	async function getGasCosts(receipt) {
	  const tx = await web3.eth.getTransaction(receipt.tx);
	  const gasPrice = new BN(tx.gasPrice);
	  return gasPrice.mul(new BN(receipt.receipt.gasUsed));
	}
});
