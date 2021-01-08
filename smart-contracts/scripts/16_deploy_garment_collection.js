async function main() {

    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log('Deploying DigitalaxGarmentCollection with the account:', deployerAddress);
  
    const {ACCESS_CONTROLS_ADDRESS, ERC721_GARMENT_ADDRESS, ERC1155_MATERIALS_ADDRESS} = process.env;
    console.log(`ACCESS_CONTROLS_ADDRESS found [${ACCESS_CONTROLS_ADDRESS}]`);
    console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);
    console.log(`ERC1155_MATERIALS_ADDRESS found [${ERC1155_MATERIALS_ADDRESS}]`);
  
  
    const DigitalaxGarmentCollection = await ethers.getContractFactory('DigitalaxGarmentCollection');
    const contract = await DigitalaxGarmentCollection.deploy(
      ACCESS_CONTROLS_ADDRESS,
      ERC721_GARMENT_ADDRESS,
      ERC1155_MATERIALS_ADDRESS,
    );
  
    await contract.deployed();
  
    console.log('DigitalaxGarmentCollection deployed to:', contract.address);
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  