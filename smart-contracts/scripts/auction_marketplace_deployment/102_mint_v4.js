const { ethers, upgrades } = require("hardhat");

const V4Artifact = require('../../artifacts/contracts/DigitalaxMarketplaceV4.sol/DigitalaxMarketplaceV4.json');
const {
    ether,
} = require('@openzeppelin/test-helpers');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  const V4_ADDRESS = "0x5394a69a126f3067a988906b57440a25e029abef";
    const v4 = new ethers.Contract(
      V4_ADDRESS,
      V4Artifact.abi,
      deployer
  );

    for(let i = 0; i< 100 ; i++) {
        const buy = await v4.buyOffer("0xeFd3D060dDcFed7903806503440db1089031AF3A",0,0);
        await buy.wait();
        console.log(`Purchased for the # ${i} time`);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
