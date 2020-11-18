var prompt = require('prompt-sync')();
const AccessControlsArtifact = require('../artifacts/DigitalaxAccessControls.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Deploying auction with signer address:",
    deployerAddress
  );

  const accessControlsAddress = prompt('Access controls address? ');
  const garmentAddress = prompt('garment nft address? ');
  const platformFeeRecipientAddress = prompt('Platform Fee Recipient address? ');

  const DigitalaxAuctionFactory = await ethers.getContractFactory('DigitalaxAuction');
  const auction = await DigitalaxAuctionFactory.deploy(
    accessControlsAddress,
    garmentAddress,
    platformFeeRecipientAddress,
  );

  await auction.deployed();

  console.log('Auction deployed at', auction.address);
  console.log('Giving auction smart contract role');

  const accessControls = new ethers.Contract(
    accessControlsAddress,
    AccessControlsArtifact.abi,
    deployer
  );

  await accessControls.addSmartContractRole(auction.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
