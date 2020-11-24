const AccessControlsArtifact = require('../artifacts/DigitalaxAccessControls.json');
const DigitalaxGarmentNFTArtifact = require('../artifacts/DigitalaxGarmentNFT.json');
const {FUND_MULTISIG_ADDRESS} = require('./constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying auction with signer address:',
    deployerAddress
  );

  const {
    ACCESS_CONTROLS_ADDRESS,
    ERC721_GARMENT_ADDRESS
  } = process.env;
  console.log(`ACCESS_CONTROLS_ADDRESS found [${ACCESS_CONTROLS_ADDRESS}]`);
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);
  console.log(`FUND_MULTISIG_ADDRESS found [${FUND_MULTISIG_ADDRESS}]`);

  const DigitalaxAuctionFactory = await ethers.getContractFactory('DigitalaxAuction');
  const auction = await DigitalaxAuctionFactory.deploy(
    ACCESS_CONTROLS_ADDRESS,
    ERC721_GARMENT_ADDRESS,
    FUND_MULTISIG_ADDRESS,
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

  console.log('Changing withdrawal lock time to 24hrs');
  await auction.updateBidWithdrawalLockTime('86400');

  console.log('Changing platform fee to 0%');
  await auction.updatePlatformFee('0');

  console.log('Changing bid increment to 0.01 ETH');
  await auction.updateMinBidIncrement('10000000000000000');

  //////////////////////
  // Setting approval //
  //////////////////////

  const nftAddress = new ethers.Contract(
    ERC721_GARMENT_ADDRESS,
    DigitalaxGarmentNFTArtifact.abi,
    deployer
  );
  console.log('Setting approval for all deployer');
  await nftAddress.setApprovalForAll(auction.address, true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
