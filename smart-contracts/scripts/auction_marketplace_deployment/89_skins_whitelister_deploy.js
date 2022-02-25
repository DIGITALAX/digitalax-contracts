// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying the models ecosystem');

    const accessControlsAddress = "0xbe5c84e6b036cb41a7a6b5008b9427a5f4f1c9f5";
    const collectionAddress = "0x721f7c76e447174141a761ce3e80ad88e5e07047";
    const marketplaceAddress = "0xb79f4cae758813cf5a661e68bcadca216912f6e7";
    const nftAddress = "0x7b2a989c4d1ad1b79a84ce2eb79da5d8d9c2b7a7";
    const indexAddress = "0x5394A69A126f3067A988906b57440A25E029Abef";


    const WhitelistedSalesFactory = await ethers.getContractFactory("DigitalaxWhitelistedSales");
    const collDeploy = await upgrades.deployProxy(WhitelistedSalesFactory,
        [
            accessControlsAddress,
            collectionAddress,
            marketplaceAddress,
            indexAddress,
            nftAddress,
        ], {initializer: 'initialize'});
    const whitelistedSales = await collDeploy.deployed();


    console.log('The whitelisted sales');
    console.log(whitelistedSales.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
