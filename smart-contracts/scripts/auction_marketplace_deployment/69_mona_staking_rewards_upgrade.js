const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();


    const NixFactory = await ethers.getContractFactory("DigitalaxNFTRewardsV2");
    const nix = await upgrades.upgradeProxy("0x0a23f877b546881defd1f2143cfa0ef50af2f46a", NixFactory);
    await nix.deployed();
    const nix2 = await upgrades.upgradeProxy("0x0e100417c6052af71fae9e5cee2cc16ac8ed99ec", NixFactory);
    await nix2.deployed();
    console.log(nix.address);
    console.log(nix2.address);

    const NixFactory2 = await ethers.getContractFactory("DigitalaxRewardsV2");
    const nix3 = await upgrades.upgradeProxy("0x03a3b7f1a5ac493f7a179e84b5fec32650a11eb6", NixFactory2);
    await nix3.deployed();
    console.log(nix3.address);


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
