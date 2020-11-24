const moment = require('moment');
const AuctionArtifact = require('../artifacts/DigitalaxAuction.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying auction with signer address:',
    deployerAddress
  );

  const {
    AUCTION_ADDRESS,
  } = process.env;

  const auction = new ethers.Contract(
    AUCTION_ADDRESS,
    AuctionArtifact.abi,
    deployer
  );

  const reservePrice = '100000000000000000';

  // FIXME - ADD PROPER DATES WHEN WE KNOW
  /*
    Start will be 3:30pm pst November 24th (today)
  And end time wil be 7 days from now
   */

  // Msistema / Crypto Bitch
  await auction.createAuction(
    1, // garmentTokenId
    reservePrice, // reservePrice
    0, // startTimestamp
    moment().add(1, 'days').startOf('day').unix() // endTimestamp
  );

  // Lorena / The Puurse
  await auction.createAuction(
    2, // garmentTokenId
    reservePrice, // reservePrice
    0, // startTimestamp
    moment().add(1, 'days').endOf('day').unix() // endTimestamp
  );

  // ddy / Decentralised Dress
  await auction.createAuction(
    3, // garmentTokenId
    reservePrice, // reservePrice
    0, // startTimestamp
    moment().add(3, 'days').endOf('day').unix() // endTimestamp
  );

  // Vitaly / To The Moon
  await auction.createAuction(
    4, // garmentTokenId
    reservePrice, // reservePrice
    moment().startOf('day').unix(), // startTimestamp
    moment().add(4, 'days').endOf('day').unix() // endTimestamp
  );

  // Xander / Lightning Network
  await auction.createAuction(
    5, // garmentTokenId
    reservePrice, // reservePrice
    moment().startOf('day').unix(), // startTimestamp
    moment().add(4, 'days').endOf('day').unix() // endTimestamp
  );

  // HonoreHL / DAI DAI DAI
  await auction.createAuction(
    6, // garmentTokenId
    reservePrice, // reservePrice
    moment().startOf('day').unix(), // startTimestamp
    moment().add(5, 'days').endOf('day').unix() // endTimestamp
  );

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
