const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying cco nft');

    const accessControls = "0xbe5c84e6b036cb41a7a6b5008b9427a5f4f1c9f5";
    const childContract = "0x567c7b3364ba2903a80ecbad6c54ba8c0e1a069e";
    const trustedForwarder = "0x567c7b3364ba2903a80ecbad6c54ba8c0e1a069e";
    const childChain = "0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa";


  const contractFactory2 = await ethers.getContractFactory("CC0DAONFT");
  const logic = await contractFactory2.deploy();
  await logic.deployed();
  await logic.initialize(
      accessControls,
      childContract,
      childChain,
      trustedForwarder,
    );

  console.log(`logic at: ${logic.address} `);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
