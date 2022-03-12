const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying nouns dao as upgradeable');


  // deploy logic contract
  // deploy proxy with the previous 2 address + token address


    //  executor
  //   const TIME_LOCK_DELAY = 172800; // 2 days
  //
  // address timelock_,-- executor
  //         address nouns_,
  //         address vetoer_, -- 0
  //         address admin_, -- executor
  //         address implementation_, -- logic
  //   5760
  //   1
  // const PROPOSAL_THRESHOLD_BPS = 500; // 5%
  // const QUORUM_VOTES_BPS = 1_000; // 10%

    const accessControls = "0xbe5c84e6b036cb41a7a6b5008b9427a5f4f1c9f5";
    const childContract = "0x6c2a60333442aad9c34e7034fa1d04d7ad0a6f33";


  const contractFactory = await ethers.getContractFactory("NounsDAOExecutor");
  const executor = await upgrades.deployProxy(contractFactory, [deployerAddress, 172800]);
  await executor.deployed();

  console.log(`executor at: ${executor.address} `);

  const contractFactory2 = await ethers.getContractFactory("NounsDAOLogicV1");
  const logic = await contractFactory2.deploy();
  await logic.deployed();
  await logic.initialize(
      executor.address,
    '0x781feAcf4Ce415b950f4fe538301EDC48150c4F9',
    '0x0000000000000000000000000000000000000000',
    5760,
    1,
    500,
    1000);

  console.log(`logic at: ${logic.address} `);

  const contractFactory3 = await ethers.getContractFactory("NounsDAOProxy");
  const proxy = await contractFactory3.deploy(
      executor.address,
    '0x781feAcf4Ce415b950f4fe538301EDC48150c4F9',
    '0x0000000000000000000000000000000000000000',
    executor.address,
    logic.address,
    5760,
    1,
    500,
    1000);

  await proxy.deployed();

  console.log(`proxy at: ${logic.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
