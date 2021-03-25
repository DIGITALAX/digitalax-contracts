async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying materials with address:',
    deployerAddress
  );

  const {ACCESS_CONTROLS_ADDRESS} = process.env;
  console.log(`ACCESS_CONTROLS_ADDRESS found [${ACCESS_CONTROLS_ADDRESS}]`);

  const DigitalaxMaterials = await ethers.getContractFactory('DigitalaxMaterials');
  const materials = await DigitalaxMaterials.deploy(
    'DigitalaxMaterials',
    'DXM',
    ACCESS_CONTROLS_ADDRESS,
    '0xb5505a6d998549090530911180f38aC5130101c6' // Mumbai child chain manager address
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
