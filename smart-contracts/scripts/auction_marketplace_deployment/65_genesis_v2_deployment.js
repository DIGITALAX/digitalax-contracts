const NFTArtifact = require('../../artifacts/contracts/DigitalaxGenesisStaking.sol/DigitalaxGenesisStaking.json');
const { ethers, upgrades } = require("hardhat");

const fs = require('fs');

const {
    ether,
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    const genesisStaking = new ethers.Contract(
      "0xa202d5b0892f2981ba86c981884ceba49b8ae096",
      NFTArtifact.abi,
      deployer
  );

    console.log('Getting genesis contributions');
    var tokens = {
        tokens: []
    };
    for(let indexx = 0; indexx < 600; indexx++){
        const contribution = parseFloat((await genesisStaking.contribution(indexx)).toString());
        const contributionStruct = {
            token: indexx,
            contribution,
            address: "0x0000000000000000000000000000000000000000"
        };
        console.log(contributionStruct);
        console.log(",");
        tokens.tokens.push(contributionStruct);
    }
    // convert JSON object to string
    const data = JSON.stringify(tokens);

    // write JSON string to a file
    fs.writeFileSync('genesisTokens.json', data, (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved.");
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
