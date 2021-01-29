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
const DigitalaxMonaStakingReal = artifacts.require('DigitalaxMonaStaking');

// 1,000 * 10 ** 18
const ONE_THOUSAND_TOKENS = '1000000000000000000000';
const TWO_HUNDRED_TOKENS = new BN('200000000000000000000');
const TWENTY_TOKENS = new BN('20000000000000000000');
const TWO_ETH = ether('2');

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
    it('Reverts when access controls is zero', async () => {
      await expectRevert(
        DigitalaxRewardsV2.new(
          this.monaToken.address,
          constants.ZERO_ADDRESS,
          this.monaStaking.address,
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
          0,
          0,
          0,
          {from: admin}
        ),
        "DigitalaxRewardsV2: Invalid Mona Staking"
      );
    });
  });

  describe('Admin functions', () => {
    beforeEach(async () => {
         // TODO
      });
/*
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
        expect(original).to.be.equal(this.digitalaxRewards.address);

        await this.digitalaxRewards.updateAccessControls(accessControlsV2.address, {from: admin});

        const updated = await this.digitalaxRewards.accessControls();
        expect(updated).to.be.equal(accessControlsV2.address);
      });
    });

  describe('reclaimETH()', async () => {
    describe('validation', async () => {
      it('cannot reclaim eth if it is not Admin', async () => {
        await expectRevert(
          this.digitalaxRewards.reclaimETH( {from: staker}),
          'DigitalaxRewardsV2.reclaimETH: Sender must be admin'
        );
      });

      // TODO
      // it('can reclaim Eth', async () => {
      //   await send.ether(staker, this.digitalaxRewards.address, TWO_ETH); // Token buyer sends 2 random eth into contract
      //   const marketplaceBalanceTracker = await balance.tracker(this.digitalaxRewards.address, 'ether');
      //   const adminBalanceTracker = await balance.tracker(admin, 'ether');
      //
      //   const adminBalanceBeforeReclaim = await adminBalanceTracker.get('ether');
      //
      //   // Reclaim eth from contract
      //   await this.marketplace.reclaimETH({from: admin});
      //
      //   expect(await marketplaceBalanceTracker.delta('ether')).to.be.bignumber.equal('-2');
      //   expect((await marketplaceBalanceTracker.get('ether')).toString()).to.be.equal('0');
      //
      //   // Admin receives eth minus gas fees.
      //   expect(await adminBalanceTracker.get('ether')).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
      // });
    });
  });

  describe('reclaimERC20()', async () => {
    describe('validation', async () => {
      it('cannot reclaim erc20 if it is not Admin', async () => {
        await expectRevert(
          this.digitalaxRewards.reclaimERC20(this.weth.address, {from: staker}),
          'DigitalaxRewardsV2.reclaimERC20: Sender must be admin'
        );

      // TODO
      //
      // it('can reclaim Erc20', async () => {
      //   // Send some wrapped eth
      //   await this.weth.transfer(this.marketplace.address, TWENTY_TOKENS, { from: minter });
      //
      //   const adminBalanceBeforeReclaim = await this.weth.balanceOf(admin);
      //   expect(await this.weth.balanceOf(this.marketplace.address)).to.be.bignumber.equal(TWENTY_TOKENS);
      //
      //   // Reclaim erc20 from contract
      //   await this.marketplace.reclaimERC20(this.weth.address, {from: admin});
      //
      //   expect(await this.weth.balanceOf(this.marketplace.address)).to.be.bignumber.equal(new BN('0'));
      //
      //   // Admin receives eth minus gas fees.
      //   expect(await this.weth.balanceOf(admin)).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
      // });
  });
  });
  });
  
 */
  });


  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
