const prompt = require('prompt-sync')();
const FactoryArtifact = require('../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../artifacts/DigitalaxAuction.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Creating a garment, wrapping 1155 and listing with signer address:",
    deployerAddress
  );

  const factoryAddress = prompt('Factory address? ');
  const factory = new ethers.Contract(
    factoryAddress,
    FactoryArtifact.abi,
    deployer
  );

  // const tx = await factory.createNewStrands(['randStrandUri5', 'randStrandUri6', 'randStrandUri7']);
  //
  // await tx.wait();

  await factory.createGarmentAndMintStrands(
    'garment3',
    '0x12D062B19a2DF1920eb9FC28Bd6E9A7E936de4c2',
    ['5','6', '7'],
    ['2', '9', '3'],
    deployerAddress
  );

  const auctionAddress = prompt('Auction address? ');
  const auction = new ethers.Contract(
    auctionAddress,
    AuctionArtifact.abi,
    deployer
  );

  await auction.createAuction(
    '3',
    '5000000000000000', // 0.005
    '0',
    '1604679967' //Date and time (GMT): Friday, November 6, 2020 4:26:07 PM
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
