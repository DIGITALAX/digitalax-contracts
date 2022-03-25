const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying verified minter as upgradeable');


  const contractFactory = await ethers.getContractFactory("NounsToken");
  const nounsToken = await upgrades.deployProxy(contractFactory, [deployerAddress, deployerAddress, '0x58807baD0B376efc12F5AD86aAc70E78ed67deaE']);
  await nounsToken.deployed();

  console.log(`nounsToken at: ${nounsToken.address} `);

  const tx1 = await nounsToken.setDailyUris([0,1,2,3,4,5,6,7,8,9,10], Array(11).fill("https://digitalax.mypinata.cloud/ipfs/QmbPQrHcGGANeXKWTVQqYtreEntnofmMDa9jvR7N3iyb1m"));
  await tx1.wait();
  const tx2 = await nounsToken.setNextDaoNFTUri("https://digitalax.mypinata.cloud/ipfs/QmTc8thZRnEVHAAkhQnRVqTjNxVLyHbwpRGWCYuKnTigw3");
  await tx2.wait();

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

// WILL BE 0.1 ETH not 1 WEI
  const nounsTokenAuction = await upgrades.deployProxy(contractFactory2, [nounsToken.address, "0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa", 30, 1, 5, 0]);
  await nounsTokenAuction.deployed();

  const tx3 = await nounsTokenAuction.updateMonaToken("0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5");
  await tx3.wait();
  const tx4 = await nounsTokenAuction.updateOraclePrice('1000000000000000000');
  await tx4.wait();
  const tx5 = await nounsTokenAuction.toggleFreezeETHBid();
  await tx5.wait();
  const tx6 = await nounsTokenAuction.unpause();
  await tx6.wait();
  const tx7 = await nounsToken.setMinter(nounsTokenAuction.address);
  await tx7.wait();
  const tx8 = await nounsTokenAuction.updateDuration(86400);
  await tx8.wait();
  const tx9 = await nounsTokenAuction.settleCurrentAndCreateNewAuction();
  await tx9.wait();

  console.log(`nounsToken at: ${nounsToken.address} `);
  console.log(`nounsTokenAuction at: ${nounsTokenAuction.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
