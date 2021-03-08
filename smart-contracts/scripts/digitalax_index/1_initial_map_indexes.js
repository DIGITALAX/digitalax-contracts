const DigitalaxIndexArtifact = require('../../artifacts/DigitalaxIndex.json');
const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();

    const {DIGITALAX_INDEX_ADDRESS} = process.env;
    console.log(`DIGITALAX_INDEX_ADDRESS found [${DIGITALAX_INDEX_ADDRESS}]`);

    const digitalaxIndex = new ethers.Contract(
        DIGITALAX_INDEX_ADDRESS,
        DigitalaxIndexArtifact.abi,
        deployer
    );

    let tx1 = await digitalaxIndex.addAuctionSet(['634', '635', '636', '637']);
    await tx1.wait();

    let tx2 = await digitalaxIndex.addDesignerSet(['634', '635', '636', '637']);
    await tx2.wait();

    let tx3 = await digitalaxIndex.updateDesignerInfo(0,'https://gateway.pinata.cloud/ipfs/QmYmsptRKxYCYDpvkxmQWNRw5wxquNVH6RW4cLJiL5bVCV');
    await tx3.wait();

    console.log(`Done`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
