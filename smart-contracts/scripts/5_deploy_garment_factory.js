const AccessControlsArtifact = require('../artifacts/DigitalaxAccessControls.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying garment factory with address:',
    deployerAddress
  );

  const {
    ACCESS_CONTROLS_ADDRESS,
    ERC1155_MATERIALS_ADDRESS,
    ERC721_GARMENT_ADDRESS
  } = process.env;
  console.log(`ACCESS_CONTROLS_ADDRESS found [${ACCESS_CONTROLS_ADDRESS}]`);
  console.log(`ERC1155_MATERIALS_ADDRESS found [${ERC1155_MATERIALS_ADDRESS}]`);
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);

  const DigitalaxGarmentFactory = await ethers.getContractFactory('DigitalaxGarmentFactory');
  const garmentFactory = await DigitalaxGarmentFactory.deploy(
    ERC721_GARMENT_ADDRESS,
    ERC1155_MATERIALS_ADDRESS,
    ACCESS_CONTROLS_ADDRESS,
  );

  await garmentFactory.deployed();

  console.log('Garment factory deployed at', garmentFactory.address);
  console.log('Granting garment factory smart contract role');
  const accessControls = new ethers.Contract(
    ACCESS_CONTROLS_ADDRESS,
    AccessControlsArtifact.abi,
    deployer
  );

  await accessControls.addSmartContractRole(garmentFactory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
