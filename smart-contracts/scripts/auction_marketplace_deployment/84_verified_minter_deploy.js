const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying verified minter as upgradeable');

    const accessControls = "0xbe5c84e6b036cb41a7a6b5008b9427a5f4f1c9f5";
    const childContract = "0x6c2a60333442aad9c34e7034fa1d04d7ad0a6f33";


  const contractFactory = await ethers.getContractFactory("DigitalaxChildVerifiedMint");
  const verifiedMinter = await upgrades.deployProxy(contractFactory, [accessControls, childContract]);
  await verifiedMinter.deployed();

  console.log(`verifiedMinter at: ${verifiedMinter.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
