async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log('Deploying DigitalaxIndex with the account:', deployerAddress);

  const {
    ACCESS_CONTROLS_ADDRESS,
  } = process.env;

  console.log(`Deploying DigitalaxIndex`, {
    ACCESS_CONTROLS_ADDRESS,
  });

  const DigitalaxIndex = await ethers.getContractFactory('DigitalaxIndex');
  const contract = await DigitalaxIndex.deploy(ACCESS_CONTROLS_ADDRESS);

  await contract.deployed();

  console.log('DigitalaxIndex deployed to:', contract.address);
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
