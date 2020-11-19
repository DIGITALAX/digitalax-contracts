const prompt = require('prompt-sync')();
const DigitalaxAuctionArtifact = require('../artifacts/DigitalaxAuction.json');
const AccessControlsArtifact = require('../artifacts/DigitalaxAccessControls.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying auction with signer address:',
    deployerAddress
  );

  const {
    ACCESS_CONTROLS_ADDRESS,
    AUCTION_ADDRESS,
    ERC721_GARMENT_ADDRESS
  } = process.env;
  console.log(`ACCESS_CONTROLS_ADDRESS found [${ACCESS_CONTROLS_ADDRESS}]`);
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);

  const platformFeeRecipientAddress = prompt('Platform Fee Recipient address? ');

  const DigitalaxAuctionFactory = await ethers.getContractFactory('DigitalaxAuction');
  const auction = await DigitalaxAuctionFactory.deploy(
    ACCESS_CONTROLS_ADDRESS,
    ERC721_GARMENT_ADDRESS,
    platformFeeRecipientAddress,
  );

  await auction.deployed();
  console.log('Auction deployed at', auction.address);

  console.log('Giving auction smart contract role');
  const accessControls = new ethers.Contract(
    ACCESS_CONTROLS_ADDRESS,
    AccessControlsArtifact.abi,
    deployer
  );
  await accessControls.addSmartContractRole(auction.address);

  //////////////////////
  // Tweaking configs //
  //////////////////////

  const auctionContract = new ethers.Contract(
    auction.address,
    DigitalaxAuctionArtifact.abi,
    deployer
  );
  console.log('Changing withdrawal lock time to 24hrs');
  await auctionContract.updateBidWithdrawalLockTime('86400');

  console.log('Changing platform fee to 0%');
  await auctionContract.updatePlatformFee('0');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
