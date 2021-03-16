async function main() {

    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log('Deploying DigitalaxMonaOracle with the account:', deployerAddress);
  
    const {
      ACCESS_CONTROLS_ADDRESS,
      ORACLE_PROVIDER_ADDRESS,
    } = process.env;
  
    console.log(`Deploying DigitalaxMonaOracle`, {
      ACCESS_CONTROLS_ADDRESS,
      ORACLE_PROVIDER_ADDRESS,
    });
  
    const DigitalaxMonaOracle = await ethers.getContractFactory('DigitalaxMonaOracle');
    const contract = await DigitalaxMonaOracle.deploy(
        '86400',
        '120',
        '1',
        ACCESS_CONTROLS_ADDRESS
    );
  
    await contract.deployed();
  
    console.log('DigitalaxMonaOracle deployed to:', contract.address);

    // add provider to the oracle contract
    await contract.addProvider(ORACLE_PROVIDER_ADDRESS);
    
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  