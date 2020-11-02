const {FUND_MULTISIG_ADDRESS, GENESIS_TOKEN_URI} = require('./constants');

async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log('Deploying DigitalaxGenesisNFT with the account:', deployerAddress);

  const {
    ACCESS_CONTROLS_ADDRESS,
    GENESIS_START,
    GENESIS_END,
  } = process.env;

  console.log(`Deploying Genesis NFT`, {
    ACCESS_CONTROLS_ADDRESS,
    GENESIS_START,
    GENESIS_END,
    FUND_MULTISIG_ADDRESS,
    GENESIS_TOKEN_URI
  });

  const DigitalaxGenesisNFT = await ethers.getContractFactory('DigitalaxGenesisNFT');
  const genesis = await DigitalaxGenesisNFT.deploy(
    ACCESS_CONTROLS_ADDRESS,
    FUND_MULTISIG_ADDRESS,
    GENESIS_START,
    GENESIS_END,
    GENESIS_TOKEN_URI,
  );

  await genesis.deployed();

  console.log('DigitalaxGenesisNFT deployed to:', genesis.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
