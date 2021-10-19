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
    const accessControlsAddress = "0xf7580d46080E1ce832aC44cF7224b906D44110B4";
    const trustedForwarderAddress = "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b";

    // // Deploy oracle for deco (rewards token) price
    // const DecoOracleFactory = await ethers.getContractFactory("DecoOracle");
    // const decoOracle = await DecoOracleFactory.deploy( '315400000', '120', '1',  accessControlsAddress);

    const monaTokenAddress = '0xefd3d060ddcfed7903806503440db1089031af3a';
    const decoTokenAddress = '0xBCD79f68a91500a2Cc7C29e3AaA80046cDa29833';
    const monaOracleAddress = '0x79Af5034F575eAA57DF52E00BAE80543e5Dca6B7';

    const MonaStakingFactory = await ethers.getContractFactory("DigitalaxMonaStaking");
    const monaStakingDeploy = await upgrades.deployProxy(MonaStakingFactory,
        [
            monaTokenAddress,
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
             //monaOracleAddress,
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

    console.log('add extra tokens');
    const extraTokens = await instanceStakingRewards.addRewardTokens([decoTokenAddress]);
    await extraTokens.wait();

    console.log('start time');
    const startT = await instanceStakingRewards.setStartTime(1634124053);
    await startT.wait();

    console.log(`The rewards: ${instanceStakingRewards.address} `);
    console.log(`The staking: ${monaStaking.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
