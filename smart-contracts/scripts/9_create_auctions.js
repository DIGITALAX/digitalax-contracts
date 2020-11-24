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

  const startTime = '1606260600'; // 11/24/2020 @ 11:30pm (UTC) | 3:30pm pst November 24th
  const endTime = '1606865400';   // 12/01/2020 @ 11:30pm (UTC) | 3:30pm pst December 1st

  // Msistema / Crypto Bitch
  await auction.createAuction(
    1, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // Lorena / The Puurse
  await auction.createAuction(
    2, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // ddy / Decentralised Dress
  await auction.createAuction(
    3, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // Vitaly / To The Moon
  await auction.createAuction(
    4, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // Xander / Lightning Network
  await auction.createAuction(
    5, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // HonoreHL / DAI DAI DAI
  await auction.createAuction(
    6, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
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
