const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying nft');

    // Todo
    const childContract = "0x632914b69b11dca3b391b62fb2812f5eee36a626";


  const contractFactory = await ethers.getContractFactory("contracts/ERC721A.sol:ERC721A");
  const verifiedMinter = await upgrades.deployProxy(contractFactory, ['RND', 'Randomtoken', childContract, 20, 1000000]);
  await verifiedMinter.deployed();

  console.log(`erc721a at: ${verifiedMinter.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
