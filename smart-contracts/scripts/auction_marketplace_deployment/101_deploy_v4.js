const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Deploying the models ecosystem');

 //   const accessControlsAddress = "0xbe5c84e6b036cb41a7a6b5008b9427a5f4f1c9f5";
    const accessControlsAddress = "0x57efaa7190686031267c7412178c0610a0b31df1";
    const materialsAddress = "0x6c2a60333442aad9c34e7034fa1d04d7ad0a6f33";
    const childChain = '0x6c2a60333442aad9c34e7034fa1d04d7ad0a6f33';
    const trustedForwarderAddress = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8";

    const monaTokenAddress = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619';

    const oracleAddress = '0x850068534c72317a762f0340500dee727ea85e29';

    const nft = '0x78957e3394155721562fa64920ddcf173b18eeb3';
    const collectionAddress = '0xffe651a1d83107b198703faab2e0041aacd585aa';

    // const NFTFactory = await ethers.getContractFactory("ModelsNFT");
    // const nftDeploy = await NFTFactory.deploy();
    // const nft = await nftDeploy.deployed();
    // const init = await nft.initialize(
    //         accessControlsAddress,
    //         materialsAddress,
    //         childChain,
    //         trustedForwarderAddress);


    const MarketFactory = await ethers.getContractFactory("DigitalaxMarketplaceV3");
    const marketDeploy = await upgrades.deployProxy(MarketFactory,
        [
            accessControlsAddress,
            nft,
            collectionAddress,
            oracleAddress,
            '0xAA3e5ee4fdC831e5274FE7836c95D670dC2502e6', // Emma address
            monaTokenAddress,
            trustedForwarderAddress], {initializer: 'initialize'});
    const market = await marketDeploy.deployed();

    console.log('The marketplace v3');
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
