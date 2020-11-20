async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying garment with address:',
    deployerAddress
  );

  const {ACCESS_CONTROLS_ADDRESS, ERC1155_MATERIALS_ADDRESS} = process.env;
  console.log(`ACCESS_CONTROLS_ADDRESS found [${ACCESS_CONTROLS_ADDRESS}]`);
  console.log(`ERC1155_MATERIALS_ADDRESS found [${ERC1155_MATERIALS_ADDRESS}]`);

  const DigitalaxGarmentNFT = await ethers.getContractFactory('DigitalaxGarmentNFT');
  const garment = await DigitalaxGarmentNFT.deploy(
    ACCESS_CONTROLS_ADDRESS,
    ERC1155_MATERIALS_ADDRESS
  );

  await garment.deployed();

  console.log('Garment deployed at', garment.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
