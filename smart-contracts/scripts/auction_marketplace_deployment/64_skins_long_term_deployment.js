// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying the long term staking contracts');

    const accessControlsAddress = "0xbe5c84e6b036cb41a7a6b5008b9427a5f4f1c9f5";
    const trustedForwarderAddress = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8";
    const monaTokenAddress = '0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5';
    const skinsNFTAddress = '0x7B2a989c4D1AD1B79a84CE2EB79dA5D8d9C2b7a7';
    const oracleAddress = '0xee0b5f24d4b2cf80e3e54e9e5ff8acb9aff1f8a4';

    const DigitalaxNFTStakingFactory = await ethers.getContractFactory("DigitalaxNFTStaking");
    const nftStakingDeploy = await upgrades.deployProxy(DigitalaxNFTStakingFactory,
        [
            monaTokenAddress,
            skinsNFTAddress,
            accessControlsAddress,
            trustedForwarderAddress
        ], {initializer: 'initialize'});
    const nftStaking = await nftStakingDeploy.deployed();

  const StakingRewards = await ethers.getContractFactory("DigitalaxNFTRewardsV2");
  const instanceStakingRewards = await upgrades.deployProxy(StakingRewards,
      [
              monaTokenAddress,
              accessControlsAddress,
              nftStaking.address,
              oracleAddress,
              trustedForwarderAddress,
              0,
              0
        ], {initializer: 'initialize'});
     await instanceStakingRewards.deployed();

    console.log('tokens claimable');
    const setTokensClaimable = await nftStaking.setTokensClaimable(true);
    await setTokensClaimable.wait();

    console.log('rewards contract');
    const updateRewardContract = await nftStaking.setRewardsContract(instanceStakingRewards.address);
    await updateRewardContract.wait();

    console.log('start time');
    const startT = await instanceStakingRewards.setStartTime(1637776800); // TODO double check start time sets correctly
    await startT.wait();

    console.log(`The rewards: ${instanceStakingRewards.address} `);
    console.log(`The staking: ${nftStaking.address}`);

    // Afterwards need to approve token for the mona staking
    // Afterwards need to approve extra token for rewards
    // Afterwards need to deposit mona + extra rewards
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
