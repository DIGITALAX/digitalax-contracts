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
    const collectionAddress = "0xb1487bA03a19f906571BD89a6C154BF58d3299fB";
    const marketplaceAddress = '0x68FEe8726D617460d717ecCcC35556d7C32696bD';
    const nftAddress = "0x2ffce9b58a788a54b4466b0d5ccc5c6dd00c1b83";
    const indexAddress = "0xc7931d20ed02c571336840f89159abc0e023e529";


    const WhitelistedSalesFactory = await ethers.getContractFactory("ModelsWhitelistedSales");
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
