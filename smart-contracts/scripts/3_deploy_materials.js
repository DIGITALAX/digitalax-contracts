var prompt = require('prompt-sync')();

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Deploying materials with address:",
    deployerAddress
  );

  const accessControlsAddress = prompt('Access controls address? ');

  const DigitalaxMaterials = await ethers.getContractFactory('DigitalaxMaterials');
  const materials = await DigitalaxMaterials.deploy(
    "DigitalaxMaterials",
    "DXM",
    accessControlsAddress
  );

  await materials.deployed();

  console.log('Materials deployed at', materials.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
