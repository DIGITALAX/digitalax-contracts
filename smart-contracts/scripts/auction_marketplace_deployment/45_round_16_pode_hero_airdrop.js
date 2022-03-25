const SkinsArtifact = require('../../artifacts/DigitalaxGarmentNFTv2.json');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Airdropping pode v2 token with following address',
      deployerAddress
  );

  MAX_NFT_SINGLE_TX = 20;

  const {ERC721_GARMENT_ADDRESS} = process.env;
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);

  const garment = new ethers.Contract(
      ERC721_GARMENT_ADDRESS,
      SkinsArtifact.abi,
      deployer
  );

  console.log(`----------------------`);

  // Approve for all
  // const approveToken = await garment.setApprovalForAll(BURNER_ADDRESS, true);
  // await approveToken.wait();
  const addressesList = require('./pode_airdrop.json');
  const metadatas = require('./pode_heroes.json');
  //  Data length

  console.log(metadatas.data.length)
  console.log(addressesList.data.length)

  const datas = metadatas.data;
  const addresses = addressesList.data;


  for(let i = 0; i< addresses.length ; i++){
    const metadata = "https://digitalax.mypinata.cloud/ipfs/"+datas[i];
    const address = addresses[i];
    console.log('Going to mint to');
    console.log(address);
    console.log('With the metadata:');
    console.log(metadata)
    const tx = await garment.mint(address, metadata, "0xEa41Cd3F972dB6237FfA2918dF9199B547172420");
    await tx.wait();
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
