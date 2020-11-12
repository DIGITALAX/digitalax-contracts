const prompt = require('prompt-sync')();
const FactoryArtifact = require('../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../artifacts/DigitalaxAuction.json');
const GarmentArtifact = require('../artifacts/DigitalaxGarmentNFT.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Creating a garment, wrapping 1155 and listing with signer address:",
    deployerAddress
  );

  // const factoryAddress = prompt('Factory address? ');
  // const factory = new ethers.Contract(
  //   factoryAddress,
  //   FactoryArtifact.abi,
  //   deployer
  // );

  // const tx = await factory.createNewStrands(['randStrandUri5', 'randStrandUri6', 'randStrandUri7']);
  //
  // await tx.wait();

  // await factory.createGarmentAndMintStrands(
  //   'garment3',
  //   '0x12D062B19a2DF1920eb9FC28Bd6E9A7E936de4c2',
  //   ['5','6', '7'],
  //   ['2', '9', '3'],
  //   deployerAddress
  // );

  const auctionAddress = prompt('Auction address? ');
  const auction = new ethers.Contract(
    auctionAddress,
    AuctionArtifact.abi,
    deployer
  );

  const tokenToList = '1';
  // const garmentAddress = prompt('Garment address? ');
  // const garment = new ethers.Contract(
  //   garmentAddress,
  //   GarmentArtifact.abi,
  //   deployer
  // );
  //
  // const tx = await garment.setApprovalForAll(auctionAddress, true);
  // await tx.wait();

  await auction.createAuction(
    tokenToList,
    '650000000000000000', // 0.65
    '0',
    '1606310534' //Date and time (GMT): Wednesday, November 25, 2020 1:22:14 PM
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
