const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

    // for the w3f gdn Important - backup at 0x0408d8442bdc1bff2d8338ad2d6536a131fba669
    // const NixFactory = await ethers.getContractFactory("DigitalaxNFTStaking");
    // const nix = await upgrades.upgradeProxy("0x2E4ae1f8E1463f450e9B01F20cee1590Bff4E1fC", NixFactory);
    // await nix.deployed();
    // console.log(nix.address);

    // Important back up at 0xe78fc90a90aa51cb6c89b89682521d719109dceb
    // backup at 0xe8fe11af9656792f0c0948dac2282b8d3cdc9029
    const NixFactory2 = await ethers.getContractFactory("DigitalaxNFTStaking");
    const nix2 = await upgrades.upgradeProxy("0xd80eeb5affd3c419f2cb05477372778862d26757", NixFactory2);
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
