const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();


    const DigitalaxMonaStakingContractFactory = await ethers.getContractFactory("DigitalaxMonaStaking");
    const digitalaxMonaStakingContract = await upgrades.upgradeProxy("0xA12e61a68D2CAe395942DcC46759da8944Eb0C02", DigitalaxMonaStakingContractFactory);
    await digitalaxMonaStakingContract.deployed();
    console.log(digitalaxMonaStakingContract.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
