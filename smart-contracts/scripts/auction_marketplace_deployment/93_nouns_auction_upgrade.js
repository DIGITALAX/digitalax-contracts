const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();


    const NixFactory = await ethers.getContractFactory("NounsAuctionHouse");
    const nix = await upgrades.upgradeProxy("0x6AAA153b30E632fa02c496b0524Be81e0422b10b", NixFactory);
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
