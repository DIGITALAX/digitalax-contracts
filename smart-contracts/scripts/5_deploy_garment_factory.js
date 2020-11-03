var prompt = require('prompt-sync')();

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Deploying garment factory with address:",
    deployerAddress
  );

  const accessControlsAddress = prompt('Access controls address? ');
  const garmentAddress = prompt('garment address? ');
  const materialsAddress = prompt('Materials address? ');

  const DigitalaxGarmentFactory = await ethers.getContractFactory('DigitalaxGarmentFactory');
  const garmentFactory = await DigitalaxGarmentFactory.deploy(
    garmentAddress,
    materialsAddress,
    accessControlsAddress,
  );

  await garmentFactory.deployed();

  console.log('Garment factory deployed at', garmentFactory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
