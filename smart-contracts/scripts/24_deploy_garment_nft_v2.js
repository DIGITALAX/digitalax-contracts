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
  
    const DigitalaxGarmentNFTV2 = await ethers.getContractFactory('DigitalaxGarmentNFTv2');
    const garment = await DigitalaxGarmentNFTV2.deploy();
  
    await garment.deployed();
    await garment.initialize(
        ACCESS_CONTROLS_ADDRESS,
        ERC1155_MATERIALS_ADDRESS,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        '0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b' // Mumbai trusted forwarder
    );
  
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
  