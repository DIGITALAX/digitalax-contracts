// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
const { ethers, upgrades } = require("hardhat");

const {
    ether,
    BN
} = require('@openzeppelin/test-helpers');

const AccessControlsArtifact = require('../../artifacts/contracts/DigitalaxAccessControls.sol/DigitalaxAccessControls.json');
const WeightContract = require('../../artifacts/contracts/Staking/GuildNFTStakingWeightV3.sol/GuildNFTStakingWeightV3.json');

const _ = require('lodash');

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();

    const weight = new ethers.Contract(
        "0xE69E1eD04501b1bE9aEb24aa471F68303137a8eA",
        WeightContract.abi,
        deployer
    );


    const metadata = require('./whitelist_stakers_dlta.json');
    const stakers = metadata.data.guildWhitelistedNFTStakers;
    let totalWeight = new BN(0);

    for(let i=0; i< stakers.length; i++){
        console.log(`staker: ${stakers[i].id}`);
        //for
        try{
            const stakerWeight = await weight.calcNewWhitelistedNFTOwnerWeight(stakers[i].id);
            console.log(`Staker weight: ${stakerWeight}`);
            totalWeight = totalWeight.add(new BN(Number(stakerWeight)));

        } catch (e) {
            console.log(`fail: #${stakers[i].id}`);
        }
    }
    console.log('The total weight is: ');
    console.log(totalWeight.toString());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
