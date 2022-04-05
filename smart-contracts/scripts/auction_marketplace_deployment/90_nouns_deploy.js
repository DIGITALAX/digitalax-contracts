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

  const nounsTokenAddress = nounsToken.address; //'0xEA11d04DEc0B6aec34fF49f1811F86417b0d952C';
  console.log(`nounsToken at: ${nounsTokenAddress} `);

  // TODO
  const tx1 = await nounsToken.setDailyUris([1], Array(1).fill("https://digitalax.mypinata.cloud/ipfs/QmbF8aj3BoaLFQTxgYJa71TnZcG1mHSp7x6fmzSFXESBq9"));
  await tx1.wait();
  // TODO
  const tx2 = await nounsToken.setNextDaoNFTUri("https://digitalax.mypinata.cloud/ipfs/Qmanarwy9GpHGwGiRzjTJLiumfL4o1xuhg4MgnbznM5pgk");
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
  // TODO
  const nounsTokenAuction = await upgrades.deployProxy(contractFactory2, [nounsTokenAddress, "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", 30, '10000000000000000000', 5, 0]);
  await nounsTokenAuction.deployed();

  const tx3 = await nounsTokenAuction.updateMonaToken("0x91Dbd2951310e887940C29D9828556086a52c54A");
  await tx3.wait();
  const tx4 = await nounsTokenAuction.updateOraclePrice('1000000000000000000'); // TODO
  await tx4.wait();
  // const tx5 = await nounsTokenAuction.toggleFreezeETHBid();
  // await tx5.wait();
  const tx6 = await nounsTokenAuction.unpause();
  await tx6.wait();


  // const date = (Date.now() / 1000)
  // console.log('it is currently');
  // const dateFuture = 1648756800;
// TODO
  const tx8 = await nounsTokenAuction.updateDuration('104800');
  await tx8.wait();
  const tx9 = await nounsTokenAuction.settleCurrentAndCreateNewAuction();
  await tx9.wait();

  const txDurationFix = await nounsTokenAuction.updateDuration('86400');
  await txDurationFix.wait();

  const tx10 = await nounsTokenAuction.transferOwnership('0x713c95BC55d5FD1a7d54C21CF980406cc973f27b');
  await tx10.wait();

   const tx7 = await nounsToken.setMinter(nounsTokenAuction.address);
  await tx7.wait();

  const startTx = await nounsToken.setStartTime('1648756800');
  await startTx.wait();
  const tx11 = await nounsToken.setNoundersDAO('0x713c95BC55d5FD1a7d54C21CF980406cc973f27b');
  await tx11.wait();

  const tx12 = await nounsToken.transferOwnership('0x713c95BC55d5FD1a7d54C21CF980406cc973f27b');
  await tx12.wait();



  console.log(`nounsToken at: ${nounsTokenAddress} `);
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
