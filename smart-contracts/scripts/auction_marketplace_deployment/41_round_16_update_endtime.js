const AuctionArtifact = require('../../artifacts/DigitalaxAuctionV2.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on auctions with the following address:',
      deployerAddress
  );

  const {AUCTION_ADDRESS} = process.env;
  console.log(`AUCTION_ADDRESS found [${AUCTION_ADDRESS}]`);

  const auction = new ethers.Contract(
      AUCTION_ADDRESS,
      AuctionArtifact.abi,
      deployer
  );

  const metadata = {
    "data": [
        133055,133054,133053,
      133052,133051,133050,133049,133048,133047,133056,133057,133058,133059,133060,133061,133062,133063,133064,133065,133066,133067,133068,133069,133070,133071,133072,133073,133074,133075,133076,133077,133078,
      133079,133080,133081,
      133082,133083,133084,133085,133086,133087,133088,133089,133090,133091,133092,132733,132734,132735,132736,132737,132738,132739,132740
    ]
  }

  //  Data length
  console.log(metadata.data.length)

  for(let i = 0; i< metadata.data.length ; i++){
    const x = metadata.data[i];
    const updateAuctionEndTime = await auction.updateAuctionEndTime(x, 1631289600);
    await updateAuctionEndTime.wait();

    console.log('Here is the updated auction')
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
