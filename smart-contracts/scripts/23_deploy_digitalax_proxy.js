async function main() {

    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log('Deploying DigitalaxProxy with the account:', deployerAddress);
  
    const {
      ACCESS_CONTROLS_ADDRESS,
    } = process.env;
  
    console.log(`Deploying DigitalaxProxy`, {
      ACCESS_CONTROLS_ADDRESS,
    });
  
    const DigitalaxProxy = await ethers.getContractFactory('DigitalaxProxy');
    const contract = await DigitalaxProxy.deploy('0x8867D638862265F4CD4d48288E321525520b82C1', '0xf7580d46080e1ce832ac44cf7224b906d44110b4');
  
    await contract.deployed();
  
    console.log('DigitalaxProxy deployed to:', contract.address);
    
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  