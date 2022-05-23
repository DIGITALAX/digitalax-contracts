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
    const trustedForwarderAddress = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8";
    const wethTokenAddress = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619';
    const oracleAddress = '0x850068534c72317a762f0340500dee727ea85e29';
    const nft = '0xD377e81F441768A25600932F348480a198002540';

    // const accessControlsAddress = "0xf7580d46080e1ce832ac44cf7224b906d44110b4";
    // const trustedForwarderAddress = "0x86c80a8aa58e0a4fa09a69624c31ab2a6cad56b8";
    // const wethTokenAddress = '0xefd3d060ddcfed7903806503440db1089031af3a';
    // const oracleAddress = '0x51807f961eb2415e6a9cb8063b57660987468495';
    // const nft = '0xE7eb848EF330D6Dc0E08D13e9f8711aA7A95c6Ca';


    const MarketFactory = await ethers.getContractFactory("DigitalaxMarketplaceV4");
    const marketDeploy = await upgrades.deployProxy(MarketFactory,
        [
            accessControlsAddress,
            nft,
            oracleAddress,
            '0xAA3e5ee4fdC831e5274FE7836c95D670dC2502e6', // Emma address
            wethTokenAddress,
            trustedForwarderAddress,
            3453453214,
            '0xAA3e5ee4fdC831e5274FE7836c95D670dC2502e6'], {initializer: 'initialize'});
    const market = await marketDeploy.deployed();

    console.log('The marketplace v4');
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
