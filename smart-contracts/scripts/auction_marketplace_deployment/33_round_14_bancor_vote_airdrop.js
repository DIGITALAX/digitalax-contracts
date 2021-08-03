const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTv2.json');
const _ = require('lodash');
var utils = require('ethers').utils;


async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Airdropping bancor vote token with following address',
      deployerAddress
  );


  const {ERC721_GARMENT_ADDRESS} = process.env;
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);

  const garment = new ethers.Contract(
      ERC721_GARMENT_ADDRESS,
      GarmentArtifact.abi,
      deployer
  );

 // const metadata = require('./bancor-airdrop.json');
  const metadata = require('./swordart-airdrop.json');
  //  Data length
  console.log(metadata.data.length)
  const datas = metadata.data;

  let firstId = 130894;

  for(let i=0; i< datas.length ; i++){
    console.log("now setting primary sale price");
    await garment.setPrimarySalePrice(firstId, utils.parseEther('0.051771228'));

    console.log("set");

    console.log("TRANSFERRING FROM");
    console.log(datas[i]);
    console.log("FOR TOKEN ID");
    console.log(firstId);
    // Transfer
    await garment.transferFrom('0x88BB4d01352C34dfd940Bd3f6f60B8EBd8e5C92b', datas[i], firstId);
    firstId++;
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
