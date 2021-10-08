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



    const StakingWeightV3ContractFactory = await ethers.getContractFactory("GuildNFTStakingWeightV3");
  //  const stakingWeightV3Contract = await upgrades.upgradeProxy("0xa6C4d291Aae3b1de46BCC13e34E57e1d52A032dB", StakingWeightV3ContractFactory);
    const stakingWeightV3Contract = await upgrades.upgradeProxy("0xE69E1eD04501b1bE9aEb24aa471F68303137a8eA", StakingWeightV3ContractFactory);
    await stakingWeightV3Contract.deployed();
    console.log(stakingWeightV3Contract.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
