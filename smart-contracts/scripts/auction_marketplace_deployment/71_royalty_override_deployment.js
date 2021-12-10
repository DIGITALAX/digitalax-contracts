const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying Royalty override as upgradeable');

        const defaultReceiver = '0xAA3e5ee4fdC831e5274FE7836c95D670dC2502e6';
        const bps = 300;
      const royaltyContractFactory = await ethers.getContractFactory("EIP2981RoyaltyOverrideCloneable");
      const royalty = await upgrades.deployProxy(royaltyContractFactory, [defaultReceiver, bps]);
      await royalty.deployed();

  console.log(`royalty contract at: ${royalty.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
