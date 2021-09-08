const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTv2.json');
const BurnerArtifact = require('../../artifacts/DigitalaxGarmentNFTv2Burner.json');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Analyzing with following address',
      deployerAddress
  );

  const {ERC721_GARMENT_ADDRESS, } = process.env;
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);

  const garment = new ethers.Contract(
      ERC721_GARMENT_ADDRESS,
      GarmentArtifact.abi,
      deployer
  );

    console.log(`----------------------`);

  const metadata = require('./allburntokens.json');
  //  Data length
  console.log("number of tokens to check:")
  console.log(metadata.data.length)
  const datas = metadata.data;


  for(let i = 0; i< datas.length ; i++){
    const x = datas[i];
    try {
      const tx2 = await garment.ownerOf(
          x
      );
      console.log(`The owner of ${x} is: ${tx2}`);
    } catch(e){
      console.log(`It seems ${x} has been burned already`)
    }
  }


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
