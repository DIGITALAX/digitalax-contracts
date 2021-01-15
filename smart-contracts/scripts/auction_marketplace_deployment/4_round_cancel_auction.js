const AuctionArtifact = require('../../artifacts/DigitalaxAuction.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Cancelling auction with the following address:',
    deployerAddress
  );

  const {AUCTION_ADDRESS} = process.env;

  const auction = new ethers.Contract(
        AUCTION_ADDRESS,
        AuctionArtifact.abi,
        deployer
   );

  const tx = await auction.cancelAuction('181');
    await tx.wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
