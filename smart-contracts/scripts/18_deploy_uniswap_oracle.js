async function main() {

    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log('Deploying UniswapOracle with the account:', deployerAddress);
  
    const {UNISWAP_FACTORY_ADDRESS, WETH_TOKEN_ADDRESS, MONA_TOKEN_ADDRESS} = process.env;
    console.log(`UNISWAP_FACTORY_ADDRESS found [${UNISWAP_FACTORY_ADDRESS}]`);
    console.log(`WETH_TOKEN_ADDRESS found [${WETH_TOKEN_ADDRESS}]`);
    console.log(`MONA_TOKEN_ADDRESS found [${MONA_TOKEN_ADDRESS}]`);
  
  
    const UniswapOracle = await ethers.getContractFactory('UniswapOracleExample');
    const contract = await UniswapOracle.deploy(
        UNISWAP_FACTORY_ADDRESS,
        WETH_TOKEN_ADDRESS,
        MONA_TOKEN_ADDRESS
    );
  
    await contract.deployed();
  
    console.log('UniswapOracle deployed to:', contract.address);
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  