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
   // const monaAddress = "0xefd3d060ddcfed7903806503440db1089031af3a";
   // const royaltyEngine = "0x0a01e11887f727d1b1cd81251eeee9bee4262d07";
    const monaAddress = "0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5";
    const royaltyEngine = "0x28EdFcF0Be7E86b07493466e7631a213bDe8eEF2";


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
  const ownership = await nix.transferOwnership('0xAA3e5ee4fdC831e5274FE7836c95D670dC2502e6');
  await ownership.wait();

  console.log(`Ownership set`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
