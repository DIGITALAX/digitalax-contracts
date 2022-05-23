const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

    const NixFactory2 = await ethers.getContractFactory("DigitalaxMarketplaceV4");
    const nix2 = await upgrades.upgradeProxy("0x1af58038af9885551ca9d969a45ea7ea67f1794f", NixFactory2);
    await nix2.deployed();
    console.log(nix2.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
