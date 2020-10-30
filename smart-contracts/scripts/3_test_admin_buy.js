var prompt = require('prompt-sync')();
const DigitalaxGenesisNFTContract = require('../artifacts/DigitalaxGenesisNFT.json');

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(
        "Test buy with the account:",
        deployerAddress
    );

    const genesisNftAddress = prompt('Genesis address? ');
    const genesis = new ethers.Contract(
        genesisNftAddress,
        DigitalaxGenesisNFTContract.abi,
        deployer //provider
    );
    const beneficiary = prompt('Genesis admin NFT beneficiary? ');

    await genesis.adminBuy(beneficiary, {from: deployerAddress});
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
