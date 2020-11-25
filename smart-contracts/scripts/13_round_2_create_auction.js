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
  const startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th
  const endTime = '1606951800';   // 12/02/2020 @ 11:30pm (UTC) | 3:30pm pst December 2nd

  // rendooo - defi summer male - 10
  await auction.createAuction(
    10, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // rendooo - defi summer female - 11
  await auction.createAuction(
    11, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // Nina - shitcoin jacket  - 12
  await auction.createAuction(
    12, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // McAfee.Design - when lambo  - 13
  await auction.createAuction(
    13, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // stanislav - incognito  - 14
  await auction.createAuction(
    14, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // Album Corvum - ico suit  - 15
  await auction.createAuction(
    15, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // Album Corvum - defi shoe  - 16
  await auction.createAuction(
    16, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // Msistema - The whale hunter  - 17
  await auction.createAuction(
    17, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // Mar Guixa Studio - dao out - 18
  await auction.createAuction(
    18, // garmentTokenId
    reservePrice, // reservePrice
    startTime, // startTimestamp
    endTime // endTimestamp
  );

  // Lorena Bello - the puurse v2  - 19
  await auction.createAuction(
    19, // garmentTokenId
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
