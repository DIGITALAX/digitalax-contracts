const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();


    const StakingFactory = await ethers.getContractFactory("GuildNFTStakingWeightV4");

    const stakingWeight = await upgrades.upgradeProxy("0xB574d5843B6898d710addaA409cB43B48b7b06e4", StakingFactory);
    await stakingWeight.deployed();
    console.log(stakingWeight.address);

    const stakingWeight2 = await upgrades.upgradeProxy("0x0eAE037c3fB4e02eac70b0Af331a34a30E30d730", StakingFactory);
    await stakingWeight2.deployed();
    console.log(stakingWeight2.address);

    const stakingWeight3 = await upgrades.upgradeProxy("0x17d11b301575453bf3B2806Dd1f67f317E7D2dD7", StakingFactory);
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
