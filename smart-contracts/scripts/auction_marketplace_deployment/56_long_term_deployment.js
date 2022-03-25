// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const AccessControlsArtifact = require('../../artifacts/contracts/DigitalaxAccessControls.sol/DigitalaxAccessControls.json');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying the long term staking contracts');

    // Some constants setup
    // const accessControlsAddress = "0xf7580d46080E1ce832aC44cF7224b906D44110B4";
    // const trustedForwarderAddress = "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b";

    const accessControlsAddress = "0xbe5c84e6b036cb41a7a6b5008b9427a5f4f1c9f5";
    const trustedForwarderAddress = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8";

    // // Deploy oracle for deco (rewards token) price
    // const DecoOracleFactory = await ethers.getContractFactory("DecoOracle");
    // const decoOracle = await DecoOracleFactory.deploy( '315400000', '120', '1',  accessControlsAddress);

    // const monaTokenAddress = '0xefd3d060ddcfed7903806503440db1089031af3a';
    // const decoTokenAddress = '0xBCD79f68a91500a2Cc7C29e3AaA80046cDa29833';

    const monaTokenAddress = '0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5';
    const lpTokenAddress = '0x856ad56defbb685db8392d9e54441df609bc5ce1';
    const usdtTokenAddress = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f';

    const MonaStakingFactory = await ethers.getContractFactory("DigitalaxMonaStaking");
    const monaStakingDeploy = await upgrades.deployProxy(MonaStakingFactory,
        [
            monaTokenAddress,
            lpTokenAddress,
            usdtTokenAddress,
            accessControlsAddress,
            trustedForwarderAddress
        ], {initializer: 'initialize'});
    const monaStaking = await monaStakingDeploy.deployed();

  const StakingRewards = await ethers.getContractFactory("DigitalaxRewardsV2");
  const instanceStakingRewards = await upgrades.deployProxy(StakingRewards,
      [
              monaTokenAddress,
              accessControlsAddress,
              monaStaking.address,
                trustedForwarderAddress,
                0,
                0,
                0
        ], {initializer: 'initialize'});
     await instanceStakingRewards.deployed();

    console.log('tokens claimable');
    const setTokensClaimable = await monaStaking.setTokensClaimable(true);
    await setTokensClaimable.wait();

    console.log('rewards contract');
    const updateRewardContract = await monaStaking.setRewardsContract(instanceStakingRewards.address);
    await updateRewardContract.wait();

    console.log('init staking pool contract');
    const initStakingPool = await monaStaking.initMonaStakingPool(10000000000, 100);
    await initStakingPool.wait();

    // console.log('add extra tokens');
    // const extraTokens = await instanceStakingRewards.addRewardTokens([decoTokenAddress]);
    // await extraTokens.wait();

    console.log('start time');
    const startT = await instanceStakingRewards.setStartTime(1637776800); // TODO double check start time sets correctly
    await startT.wait();

    console.log(`The rewards: ${instanceStakingRewards.address} `);
    console.log(`The staking: ${monaStaking.address}`);

    // Afterwards need to approve LP token for the mona staking
    // Afterwards need to approve mona token for mona staking and rewards
    // Afterwards need to deposit mona rewards
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
