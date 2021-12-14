const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying Patron Marketplace as upgradeable');

    // Some constants setup
    const accessControls = "0xbe5c84e6b036cb41a7a6b5008b9427a5f4f1c9f5";
    const nft = "0x7b2a989c4d1ad1b79a84ce2eb79da5d8d9c2b7a7";
    const garmentCollection = "0x721f7c76e447174141a761ce3e80ad88e5e07047";
    const dripOracle = "0x850068534c72317a762f0340500dee727ea85e29";
    const platformFeeRecipient = "0xea41cd3f972db6237ffa2918df9199b547172420";
    const wetherc20token = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619";
    const trustedForwarder = "0x86c80a8aa58e0a4fa09a69624c31ab2a6cad56b8";

  const patronContractFactory = await ethers.getContractFactory("PatronMarketplace");
  const patron = await upgrades.deployProxy(patronContractFactory,
      [accessControls, nft, garmentCollection, dripOracle, platformFeeRecipient, wetherc20token, trustedForwarder]);
  await patron.deployed();

  console.log(`patron contract at: ${patron.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
