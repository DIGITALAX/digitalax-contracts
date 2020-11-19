const prompt = require('prompt-sync')();
const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuction.json');
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Using signer address:',
    deployerAddress
  );

  const auctionAddress = prompt('Auction address? ');
  // const accessControlsAddress = prompt('Access controls address? ');
  // const accessControls = new ethers.Contract(
  //   accessControlsAddress,
  //   AccessControlsArtifact.abi,
  //   deployer
  // );
  //
  // await accessControls.addSmartContractRole(auctionAddress);

  // const garmentAddress = prompt('Garment address? ');
  // const garment = new ethers.Contract(
  //   garmentAddress,
  //   GarmentArtifact.abi,
  //   deployer
  // );
  //
  // const tx = await garment.approve(auctionAddress, '1');
  // await tx.wait();

  const auction = new ethers.Contract(
    auctionAddress,
    AuctionArtifact.abi,
    deployer
  );

  //1605534912

  await auction.resultAuction(
    '1'
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
