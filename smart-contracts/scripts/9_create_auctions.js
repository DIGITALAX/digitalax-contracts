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

  const _0_POINT_0_2_ETH = '200000000000000000';

  // FIXME - ADD PROPER DATES WHEN WE KNOW

  // Msistema / Crypto Bitch
  await auction.createAuction(
    0, // _garmentTokenId
    _0_POINT_0_2_ETH, // _reservePrice
    Date.now(), // _startTimestamp
    moment().add(1, 'days').startOf('day').unix() // _endTimestamp
  );

  // Lorena / The Puurse
  await auction.createAuction(
    0, // _garmentTokenId
    _0_POINT_0_2_ETH, // _reservePrice
    Date.now(), // _startTimestamp
    moment().add(1, 'days').endOf('day').unix() // _endTimestamp
  );

  // Rendoo / DeFi Summer (Male)
  await auction.createAuction(
    0, // _garmentTokenId
    _0_POINT_0_2_ETH, // _reservePrice
    Date.now(), // _startTimestamp
    moment().add(3, 'days').endOf('day').unix() // _endTimestamp
  );

  // Vitaly / To The Moon
  await auction.createAuction(
    0, // _garmentTokenId
    _0_POINT_0_2_ETH, // _reservePrice
    moment().startOf('day').unix(), // _startTimestamp
    moment().add(4, 'days').endOf('day').unix() // _endTimestamp
  );

  // Xander / Lightning Network
  await auction.createAuction(
    0, // _garmentTokenId
    _0_POINT_0_2_ETH, // _reservePrice
    moment().startOf('day').unix(), // _startTimestamp
    moment().add(4, 'days').endOf('day').unix() // _endTimestamp
  );

  // HonoreHL / DAI DAI DAI
  await auction.createAuction(
    0, // _garmentTokenId
    _0_POINT_0_2_ETH, // _reservePrice
    moment().startOf('day').unix(), // _startTimestamp
    moment().add(5, 'days').endOf('day').unix() // _endTimestamp
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
