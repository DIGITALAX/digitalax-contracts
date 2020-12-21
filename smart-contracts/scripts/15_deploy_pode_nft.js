const {FUND_MULTISIG_ADDRESS, PODE_TOKEN_URI} = require('./constants');

async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log('Deploying DigitalaxPodeNFT with the account:', deployerAddress);

  const {
    PODE_START,
    PODE_END,
    PODE_LOCK_TIME,
  } = process.env;

  console.log(`Deploying Pode NFT`, {
    PODE_START,
    PODE_END,
    PODE_LOCK_TIME,
    FUND_MULTISIG_ADDRESS,
    PODE_TOKEN_URI
  });

  const DigitalaxPodeNFT = await ethers.getContractFactory('DigitalaxPodeNFT');
  const pode = await DigitalaxPodeNFT.deploy(
    FUND_MULTISIG_ADDRESS,
    PODE_START,
    PODE_END,
    PODE_LOCK_TIME,
    PODE_TOKEN_URI,
  );

  await pode.deployed();

  console.log('DigitalaxPodeNFT deployed to:', pode.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
