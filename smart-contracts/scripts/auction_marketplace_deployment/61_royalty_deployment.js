const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying overrideRoyalty as upgradeable');

    const royaltyReceiver = "0x88BB4d01352C34dfd940Bd3f6f60B8EBd8e5C92b";
    const bps = "250"; // 2.5%


  const overrideContractFactory = await ethers.getContractFactory("EIP2981RoyaltyOverrideCloneable");
  const overrideRoyalty = await upgrades.deployProxy(overrideContractFactory, [royaltyReceiver, bps]);
  await overrideRoyalty.deployed();

  console.log(`overrideRoyalty at: ${overrideRoyalty.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
