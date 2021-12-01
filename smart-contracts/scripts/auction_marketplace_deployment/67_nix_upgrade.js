const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();


    const NixFactory = await ethers.getContractFactory("Nix");
    const nix = await upgrades.upgradeProxy("0x7e0e2aDB175B10b19ceACe7bed45d4FF3F3C567A", NixFactory);
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
