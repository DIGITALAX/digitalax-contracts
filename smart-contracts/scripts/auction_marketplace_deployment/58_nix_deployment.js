const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying Nix as upgradeable');

    // Some constants setup
    const monaAddress = "0xefd3d060ddcfed7903806503440db1089031af3a";
    const royaltyEngine = "0x0a01e11887f727d1b1cd81251eeee9bee4262d07";
   // const nftAddress = "0x1bc6d640710759be37e5dcd1b23b322250353751";

    // const NFTArtifact = require('../../artifacts/contracts/garment/DigitalaxGarmentNFTv2.sol/DigitalaxGarmentNFTv2.json');
    // const nft = new ethers.Contract(
    //     nftAddress,
    //     NFTArtifact.abi,
    //     deployer
    // );

  const nixContractFactory = await ethers.getContractFactory("Nix");
  const nix = await upgrades.deployProxy(nixContractFactory, [monaAddress, royaltyEngine]);
  await nix.deployed();

  console.log(`Nix contract at: ${nix.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
