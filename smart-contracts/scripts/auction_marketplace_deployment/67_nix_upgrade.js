const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();


    const NixFactory = await ethers.getContractFactory("Nix");
    const nix = await upgrades.upgradeProxy("0x8cc988c30c3959fc0e77ef7baa9c3ed6438b4325", NixFactory);
    await nix.deployed();
    console.log(nix.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
