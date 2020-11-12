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

  const factoryAddress = prompt('Factory address? ');
  const factory = new ethers.Contract(
    factoryAddress,
    FactoryArtifact.abi,
    deployer
  );

  // const tx = await factory.createNewStrands(['randStrandUri7', 'randStrandUri8', 'randStrandUri9']);
  //
  // await tx.wait();

  const tx = await factory.mintParentWithChildren(
    'https://miro.medium.com/max/1000/1*PrWCeKJEFi9fxYtBh27SHQ.jpeg',
    '0x12D062B19a2DF1920eb9FC28Bd6E9A7E936de4c2',
    ['3','4', '1'],
    ['2', '9', '3'],
    deployerAddress
  );

  await tx.wait();

  const auctionAddress = prompt('Auction address? ');
  const auction = new ethers.Contract(
    auctionAddress,
    AuctionArtifact.abi,
    deployer
  );

  const tokenToList = '4';
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
    '0', // 0.65
    '1605879479',
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
