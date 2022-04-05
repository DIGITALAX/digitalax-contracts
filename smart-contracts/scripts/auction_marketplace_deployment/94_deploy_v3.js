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

    const monaTokenAddress = '0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5';

    const oracleAddress = '0x850068534c72317a762f0340500dee727ea85e29';

    const nft = '0x32a89d8c7e511bd3c21d9e4e6ef6044033231490';
    const collectionAddress = '0x33b97da79fe456d14e4528931c6a013e20b41da8';

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
