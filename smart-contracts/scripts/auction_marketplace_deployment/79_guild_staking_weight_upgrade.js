const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();


    // const StakingFactory = await ethers.getContractFactory("GuildNFTStakingWeightV4");
    //
    // const stakingWeight = await upgrades.upgradeProxy("0xB574d5843B6898d710addaA409cB43B48b7b06e4", StakingFactory);
    // await stakingWeight.deployed();
    // console.log(stakingWeight.address);
    //
    // const stakingWeight2 = await upgrades.upgradeProxy("0x0eAE037c3fB4e02eac70b0Af331a34a30E30d730", StakingFactory);
    // await stakingWeight2.deployed();
    // console.log(stakingWeight2.address);
    //
    // const stakingWeight3 = await upgrades.upgradeProxy("0x17d11b301575453bf3B2806Dd1f67f317E7D2dD7", StakingFactory);
    // await stakingWeight3.deployed();
    // console.log(stakingWeight3.address);

    // const StakingFactory = await ethers.getContractFactory("GuildWhitelistedNFTStakingV3");
    // //0x06b8dbe9e31e3982a50d5c7ad1971d49fc123ec2
    // const stakingWeight = await upgrades.upgradeProxy("0x16218D677e160DDfb398D26508e5f6fB44c06f28", StakingFactory);
    // await stakingWeight.deployed();
    // console.log(stakingWeight.address);
    //
    // const stakingWeight2 = await upgrades.upgradeProxy("0xfFc6f1eb06c8248339E9E247D850931D6D58c728", StakingFactory);
    // await stakingWeight2.deployed();
    // console.log(stakingWeight2.address);
    //
    // const stakingWeight3 = await upgrades.upgradeProxy("0xB08F4575D1Ab2FBa5463d13395279C134ACE6aF7", StakingFactory);
    // await stakingWeight3.deployed();
    // console.log(stakingWeight3.address);

    const StakingFactory = await ethers.getContractFactory("GuildNFTStakingV3");
    //0x4ba25cc53bf3737a05745ce92584e79681d984d8
    const stakingWeight = await upgrades.upgradeProxy("0x8CaF6ceaA682F0569d5Ee83F5022bf1cD6705395", StakingFactory);
    await stakingWeight.deployed();
    console.log(stakingWeight.address);

    const stakingWeight2 = await upgrades.upgradeProxy("0x83f92d1aB94B0817Bfe297872dbD11B46DAe3596", StakingFactory);
    await stakingWeight2.deployed();
    console.log(stakingWeight2.address);
    // 0xa94b48c076a3930c7d94a91ec80d26d943bbe47c
    const stakingWeight3 = await upgrades.upgradeProxy("0xD750612b4C2653F938f4CA3edEa2a2182AD996f8", StakingFactory);
    await stakingWeight3.deployed();
    console.log(stakingWeight3.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
