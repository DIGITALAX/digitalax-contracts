// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const LOOKArtifact = require('../../artifacts/contracts/LOOK.sol/LOOK.json');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

    // const {ACCESS_CONTROLS_ADDRESS} = process.env;
    // console.log(`ACCESS_CONTROLS_ADDRESS found [${ACCESS_CONTROLS_ADDRESS}]`);

    const look = new ethers.Contract(
        "0xc97f4244839c13c6df4258228c60488fa05c8528",
        LOOKArtifact.abi,
        deployer
    );
    // [
    //     143,  276,  427,  470,  476,516,624,685,720,731,759,846,908, 1149, 1168, 1181, 1224, 1237,1278, 1319, 1373, 1387, 1429, 1463,
    //     1527, 1581, 1640, 1682, 1745, 1963,
    //     2040, 2157, 2175, 2185, 2495, 2847
    // ]
    const tokenIds = [1319, 1373, 1387, 1429, 1463,
        1527, 1581, 1640, 1682, 1745, 1963,
        2040, 2157, 2175, 2185, 2495, 2847];

    for(let i=0; i< tokenIds.length; i++){
        console.log(`claiming token: #${tokenIds[i]}`);
        //for
        try{
            const looktx = await look.claim(tokenIds[i]);
            await looktx.wait();
            console.log('Successful claim.');

        } catch (e) {
            console.log(`token FAILURE: #${tokenIds[i]}`);
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
