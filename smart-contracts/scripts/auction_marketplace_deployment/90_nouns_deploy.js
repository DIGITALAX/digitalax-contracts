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


  const contractFactory = await ethers.getContractFactory("NounsToken");
  const nounsToken = await upgrades.deployProxy(contractFactory, [deployerAddress, deployerAddress, '0x58807baD0B376efc12F5AD86aAc70E78ed67deaE']);
  await nounsToken.deployed();

  console.log(`nounsToken at: ${nounsToken.address} `);

  await nounsToken.setDailyUris([1,2,3,4,5,6,7,8,9,10], Array(10).fill("https://digitalax.mypinata.cloud/ipfs/QmbPQrHcGGANeXKWTVQqYtreEntnofmMDa9jvR7N3iyb1m"));
  await nounsToken.setNextDaoNFTUri("https://digitalax.mypinata.cloud/ipfs/QmTc8thZRnEVHAAkhQnRVqTjNxVLyHbwpRGWCYuKnTigw3");

  const contractFactory2 = await ethers.getContractFactory("NounsAuctionHouse");
  //      .addOptionalParam('auctionTimeBuffer', 'The auction time buffer (seconds)', 30, types.int) // Default: 30 seconds
  // .addOptionalParam('auctionReservePrice', 'The auction reserve price (wei)', 1, types.int) // Default: 1 wei
  // .addOptionalParam(
  //   'auctionMinIncrementBidPercentage',
  //   'The auction min increment bid percentage (out of 100)', // Default: 5%
  //   5,
  //   types.int,
  // )
  // .addOptionalParam('auctionDuration', 'The auction duration (seconds)', 60 * 2, types.int) // Default: 2 minutes

  const nounsTokenAuction = await upgrades.deployProxy(contractFactory2, [nounsToken.address, "0xefd3d060ddcfed7903806503440db1089031af3a", 30, 1, 5, 120]);
  await nounsTokenAuction.deployed();

  await nounsTokenAuction.updateMonaToken("0xefd3d060ddcfed7903806503440db1089031af3a");
  await nounsTokenAuction.updateOracle("0x79Af5034F575eAA57DF52E00BAE80543e5Dca6B7");


  console.log(`nounsToken at: ${nounsTokenAuction.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
