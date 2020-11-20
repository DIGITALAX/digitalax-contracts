const prompt = require('prompt-sync')();
const AuctionArtifact = require('../../artifacts/DigitalaxAuction.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Placing a bid with signer address:',
    deployerAddress
  );

  const auctionAddress = prompt('Auction address? ');
  const auction = new ethers.Contract(
    auctionAddress,
    AuctionArtifact.abi,
    deployer
  );

  await auction.placeBid(
    '3',
    {value: '700000000000000000'}
  );

  await auction.placeBid(
    '3',
    {value: '900000000000000000'}
  );

  await auction.placeBid(
    '4',
    {value: '700000000000000000'}
  );

  await auction.placeBid(
    '4',
    {value: '900000000000000000'}
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
