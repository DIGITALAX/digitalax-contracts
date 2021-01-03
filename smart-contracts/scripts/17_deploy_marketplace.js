const {FUND_MULTISIG_ADDRESS} = require('./constants');

async function main() {

    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log('Deploying DigitalaxMarketplace with the account:', deployerAddress);
  
    const {
        ACCESS_CONTROLS_ADDRESS,
        ERC721_GARMENT_ADDRESS,
        GARMENT_COLLECTION_ADDRESS,
        UNISWAP_ORACLE_ADDRESS,
        WETH_TOKEN_ADDRESS,
        MONA_TOKEN_ADDRESS,
    } = process.env;
    console.log(`ACCESS_CONTROLS_ADDRESS found [${ACCESS_CONTROLS_ADDRESS}]`);
    console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);
    console.log(`GARMENT_COLLECTION_ADDRESS found [${GARMENT_COLLECTION_ADDRESS}]`);
    console.log(`UNISWAP_ORACLE_ADDRESS found [${UNISWAP_ORACLE_ADDRESS}]`);
    console.log(`FUND_MULTISIG_ADDRESS found [${FUND_MULTISIG_ADDRESS}]`);
    console.log(`MONA_TOKEN_ADDRESS found [${MONA_TOKEN_ADDRESS}]`);
    console.log(`WETH_TOKEN_ADDRESS found [${WETH_TOKEN_ADDRESS}]`);
  
  
    const DigitalaxMarketplace = await ethers.getContractFactory('DigitalaxMarketplace');
    const contract = await DigitalaxMarketplace.deploy(
      ACCESS_CONTROLS_ADDRESS,
      ERC721_GARMENT_ADDRESS,
      GARMENT_COLLECTION_ADDRESS,
      UNISWAP_ORACLE_ADDRESS,
      FUND_MULTISIG_ADDRESS,
      MONA_TOKEN_ADDRESS,
      WETH_TOKEN_ADDRESS,
    );
  
    await contract.deployed();
  
    console.log('DigitalaxMarketplace deployed to:', contract.address);
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  