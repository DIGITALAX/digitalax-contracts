const MarketplaceArtifact = require('../../artifacts/DripMarketplace.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  const {DRIP_MARKETPLACE_ADDRESS} = process.env;

  const marketplace = new ethers.Contract(
      DRIP_MARKETPLACE_ADDRESS,
      MarketplaceArtifact.abi,
      deployer
  );

  const metadata = require('./collections.json');
  //  Data length
  console.log(metadata.data.length)

  const maxAmount = 201;

  for(let i = 0; i<= metadata.data.length ; i++){
    const x = metadata.data[i];
    const tx = await marketplace.updateOfferMaxAmount(x, maxAmount);
    await tx.wait();

    console.log('Here is the updated collections')
    console.log(x)
    console.log('For amount')
    console.log(maxAmount)
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
