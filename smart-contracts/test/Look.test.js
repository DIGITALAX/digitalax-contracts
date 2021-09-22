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

  const Look = artifacts.require('LOOK');

  contract('LOOK', (accounts) => {
	const [admin, smartContract, platformFeeAddress, minter, provider, staker, staker2, staker3] = accounts;

	beforeEach(async () => {
	  // this.look = await Look.new({from: admin});
	  // await this.look.initialize();
		const LookFactory = await ethers.getContractFactory("LOOK");
		this.look = await upgrades.deployProxy(LookFactory, [], {initializer: 'initialize', unsafeAllow: 'constructor' });

	});

	it('successfully claims look', async () => {
		console.log('this account is');
	//	await this.look.addWhitelisted([admin]);
	  await this.look.claim(1);
	  await this.look.claim(2);
	  console.log(await this.look.getPattern(1));
	  console.log(await this.look.getPattern(2));
	  console.log(await this.look.getPattern(3));
	  console.log(await this.look.getPattern(2999));
	  console.log(await this.look.getPattern(2332));
	  console.log(await this.look.getPattern(1000));
	 console.log(await this.look.getTexture(1));
	  console.log(await this.look.randomMultiplier());
	 console.log((await this.look.pluckMe(3, "TEXTURE", ["hi", "hello"])).toString());
	  console.log(await this.look.pickSuffixCategories(90030287, 1));
	  console.log(await this.look.pickSuffixCategories(1890001, 2));
	  console.log(await this.look.pickSuffixCategories(45576, 3000));
	  console.log(await this.look.pickSuffixCategories(38767, 239));
	  console.log(await this.look.getTexture(2));
	  console.log(await this.look.getTexture(3));
	  console.log(await this.look.getTexture(4));
	  console.log(await this.look.getTexture(5));
	  console.log(await this.look.getTexture(6));
	  console.log(await this.look.getTexture(7));
	  console.log(await this.look.getTexture(8));
	  console.log(await this.look.getTexture(9));
	  console.log(await this.look.getTexture(10));
	  console.log(await this.look.getTexture(11));
	  console.log(await this.look.getTexture(12));
	  console.log(await this.look.getTexture(13));
	  console.log(await this.look.getTexture(14));
	  console.log(await this.look.getTexture(15));
	  console.log(await this.look.getTexture(16));
	  console.log(await this.look.getTexture(17));
	  console.log(await this.look.getTexture(18));
	  console.log(await this.look.getTexture(19));
	  console.log(await this.look.getTexture(20));
	  console.log(await this.look.getTexture(21));
	  console.log(await this.look.getTexture(22));

		console.log(await this.look.getElement(2));
		console.log(await this.look.getElement(3));
		console.log(await this.look.getElement(4));
		console.log(await this.look.getElement(5));
		console.log(await this.look.getElement(6));
		console.log(await this.look.getElement(7));
		console.log(await this.look.getElement(8));
		console.log(await this.look.getElement(9));
		console.log(await this.look.getElement(10));
		console.log(await this.look.getElement(11));
		console.log(await this.look.getElement(12));
		console.log(await this.look.getElement(13));
		console.log(await this.look.getElement(14));
		console.log(await this.look.getElement(15));
		console.log(await this.look.getElement(16));
		console.log(await this.look.getElement(17));
		console.log(await this.look.getElement(18));
		console.log(await this.look.getElement(19));
		console.log(await this.look.getElement(20));
		console.log(await this.look.getElement(21));
		console.log(await this.look.getElement(22));

		console.log(await this.look.getColour(2));
		console.log(await this.look.getColour(3));
		console.log(await this.look.getColour(4));
		console.log(await this.look.getColour(5));
		console.log(await this.look.getColour(6));
		console.log(await this.look.getColour(7));
		console.log(await this.look.getColour(8));
		console.log(await this.look.getColour(9));
		console.log(await this.look.getColour(10));
		console.log(await this.look.getColour(11));
		console.log(await this.look.getColour(12));
		console.log(await this.look.getColour(13));
		console.log(await this.look.getColour(14));
		console.log(await this.look.getColour(15));
		console.log(await this.look.getColour(16));
		console.log(await this.look.getColour(17));
		console.log(await this.look.getColour(18));
		console.log(await this.look.getColour(19));
		console.log(await this.look.getColour(20));
		console.log(await this.look.getColour(21));
		console.log(await this.look.getColour(22));

		console.log(await this.look.getShape(2));
		console.log(await this.look.getShape(3));
		console.log(await this.look.getShape(4));
		console.log(await this.look.getShape(5));
		console.log(await this.look.getShape(6));
		console.log(await this.look.getShape(7));
		console.log(await this.look.getShape(8));
		console.log(await this.look.getShape(9));
		console.log(await this.look.getShape(10));
		console.log(await this.look.getShape(11));
		console.log(await this.look.getShape(12));
		console.log(await this.look.getShape(13));
		console.log(await this.look.getShape(14));
		console.log(await this.look.getShape(15));
		console.log(await this.look.getShape(16));
		console.log(await this.look.getShape(17));
		console.log(await this.look.getShape(18));
		console.log(await this.look.getShape(19));
		console.log(await this.look.getShape(20));
		console.log(await this.look.getShape(21));
		console.log(await this.look.getTexture(10));
		console.log(await this.look.getColour(10));
		console.log(await this.look.getBackgroundColour(10));
		console.log(await this.look.getShape(10));
		console.log(await this.look.getElement(10));



		console.log(await this.look.getForm(1));
		console.log(await this.look.getLine(1));
		console.log(await this.look.getForm(2));
		console.log(await this.look.getLine(2));
		console.log(await this.look.getForm(3));
		console.log(await this.look.getLine(3));
		console.log(await this.look.getForm(4));
		console.log(await this.look.getLine(4));
		console.log(await this.look.getForm(5));
		console.log(await this.look.getLine(5));
		console.log(await this.look.getForm(6));
		console.log(await this.look.getLine(6));
		console.log(await this.look.getForm(7));
		console.log(await this.look.getLine(7));
		console.log(await this.look.getForm(8));
		console.log(await this.look.getLine(8));
		console.log(await this.look.getForm(9));
		console.log(await this.look.getLine(9));
		console.log(await this.look.getForm(10));
		console.log(await this.look.getLine(10));

		console.log(await this.look.tokenURI(10));
	});

	async function getGasCosts(receipt) {
	  const tx = await web3.eth.getTransaction(receipt.tx);
	  const gasPrice = new BN(tx.gasPrice);
	  return gasPrice.mul(new BN(receipt.receipt.gasUsed));
	}
  });
