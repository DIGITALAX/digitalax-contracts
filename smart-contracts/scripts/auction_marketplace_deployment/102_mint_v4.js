const { ethers, upgrades } = require("hardhat");

const V4Artifact = require('../../artifacts/contracts/DigitalaxMarketplaceV4.sol/DigitalaxMarketplaceV4.json');
const {
    ether,
} = require('@openzeppelin/test-helpers');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  const V4_ADDRESS = "0x1Af58038af9885551CA9D969A45Ea7Ea67f1794f";
    const v4 = new ethers.Contract(
      V4_ADDRESS,
      V4Artifact.abi,
      deployer
  );

    for(let i = 0; i< 15 ; i++) {
        try {
            const buy = await v4.buyOffer("0xeFd3D060dDcFed7903806503440db1089031AF3A", 0, 0);
            await buy.wait();
            console.log(`Purchased for the # ${i} time`);
        }
        catch(e){
            console.log(e);
        }
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
