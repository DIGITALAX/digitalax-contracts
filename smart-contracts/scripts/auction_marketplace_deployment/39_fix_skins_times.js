const MarketplaceArtifact = require('../../artifacts/DigitalaxMarketplaceV2.json');
var utils = require('ethers').utils;

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  const {MARKETPLACE_ADDRESS} = process.env;

  const marketplace = new ethers.Contract(
      MARKETPLACE_ADDRESS,
      MarketplaceArtifact.abi,
      deployer
  );


  // TODO ***** fill in the collection ids for today
  const metadata = {
    "data": [
      439,
      440,
    ]
  }

  //  Data length
  console.log(metadata.data.length)

  for(let i = 0; i< metadata.data.length ; i++){
    const x = metadata.data[i];
    const tx = await marketplace.updateOfferStartEndTime(x, 1629729900, 1655866036);
    await tx.wait();

    console.log('Here is the updated collections')
    console.log(x)
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
