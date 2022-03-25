const GarmentArtifact = require('../../artifacts/DigitalaxSubscriptionNFT.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxSubscriptionCollection.json');
const MarketplaceArtifact = require('../../artifacts/DigitalaxSubscriptionMarketplace.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');

const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );


  const {SUBSCRIPTION_NFT_ADDRESS} = process.env;
  console.log(`SUBSCRIPTION_NFT_ADDRESS found [${SUBSCRIPTION_NFT_ADDRESS}]`);

  const garment = new ethers.Contract(
      SUBSCRIPTION_NFT_ADDRESS,
      GarmentArtifact.abi,
      deployer
  );

    const metadata = require('./pode.json');
    //  Data length
    console.log(metadata.data.length)
    const datas = metadata.data;

    let firstId = 100001;

    for(let i=0; i< datas.length ; i++){
        console.log("TRANSFERRING FROM");
        console.log(datas[i]);
        console.log("FOR TOKEN ID");
        console.log(firstId);
        // Transfer
        await garment.transferFrom('0x88BB4d01352C34dfd940Bd3f6f60B8EBd8e5C92b', datas[i], firstId);
        // await this.garment.setPrimarySalePrice(firstId, 1000000000000000000);
        firstId++;
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
