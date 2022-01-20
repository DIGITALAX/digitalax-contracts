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
    const materialsAddress = "0x6c2a60333442aad9c34e7034fa1d04d7ad0a6f33";
    const childChain = '0x6c2a60333442aad9c34e7034fa1d04d7ad0a6f33';
    const trustedForwarderAddress = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8";

    const monaTokenAddress = '0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5';

    const oracleAddress = '0xee0b5f24d4b2cf80e3e54e9e5ff8acb9aff1f8a4';

    const nft = '0x2ffce9b58a788a54b4466b0d5ccc5c6dd00c1b83';

    // const NFTFactory = await ethers.getContractFactory("ModelsNFT");
    // const nftDeploy = await NFTFactory.deploy();
    // const nft = await nftDeploy.deployed();
    // const init = await nft.initialize(
    //         accessControlsAddress,
    //         materialsAddress,
    //         childChain,
    //         trustedForwarderAddress);

    const CollectionFactory = await ethers.getContractFactory("ModelsCollection");
    const collDeploy = await upgrades.deployProxy(CollectionFactory,
        [
            accessControlsAddress,
            nft,
            materialsAddress,
        ], {initializer: 'initialize'});
    const collection = await collDeploy.deployed();

    const MarketFactory = await ethers.getContractFactory("ModelsMarketplace");
    const marketDeploy = await upgrades.deployProxy(MarketFactory,
        [
            accessControlsAddress,
            nft,
            collection.address,
            oracleAddress,
            '0xAA3e5ee4fdC831e5274FE7836c95D670dC2502e6', // Emma address
            monaTokenAddress,
            trustedForwarderAddress], {initializer: 'initialize'});
    const market = await marketDeploy.deployed();

    console.log('The nft');
    console.log(nft);

    console.log('The collection');
    console.log(collection.address);

    console.log('The market');
    console.log(market.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
