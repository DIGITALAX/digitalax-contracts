const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying nouns dao as upgradeable');


  const contractFactory = await ethers.getContractFactory("NounsDAOExecutor");
  const executor = await upgrades.deployProxy(contractFactory, [deployerAddress, 172800]);
  await executor.deployed();

  console.log(`executor at: ${executor.address} `);

  const contractFactory2 = await ethers.getContractFactory("NounsDAOLogicV1");
  const logic = await contractFactory2.deploy();
  await logic.deployed();
  const initTx = await logic.initialize(
      executor.address,
    '0x9C41EaA62D0bd49fC43F7057E0a9077F6CbF07e9',
    '0x0000000000000000000000000000000000000000',
    5760,
    1,
    500,
    1000);
  await initTx.wait();

  console.log(`logic at: ${logic.address} `);

  const contractFactory3 = await ethers.getContractFactory("NounsDAOProxy");
  const proxy = await contractFactory3.deploy(
      executor.address,
    '0x9C41EaA62D0bd49fC43F7057E0a9077F6CbF07e9',
    '0x0000000000000000000000000000000000000000',
    deployerAddress,
    logic.address,
    5760,
    1,
    500,
    1000);

  await proxy.deployed();

  console.log(`proxy at: ${proxy.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
