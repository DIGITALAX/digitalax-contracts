 const NFTArtifact = require('../../artifacts/contracts/garment/DigitalaxGarmentNFTv2.sol/DigitalaxGarmentNFTv2.json');
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
      NFTArtifact.abi,
      deployer
  );

  console.log(`----------------------`);

  // Approve for all
  // const approveToken = await garment.setApprovalForAll(BURNER_ADDRESS, true);
  // await approveToken.wait();
  const addressesList = require('./pode_airdrop.json');
  //  Data length

  console.log(addressesList.data.length)

  const addresses = addressesList.data;


  for(let i = 1275; i< addresses.length ; i++){
    const metadata = "https://digitalax.mypinata.cloud/ipfs/QmTc8thZRnEVHAAkhQnRVqTjNxVLyHbwpRGWCYuKnTigw3";
    const address = addresses[i];
    console.log('Going to mint to');
    console.log(address);
    console.log('With the metadata:');
    console.log(metadata)
    try {
      const tx = await garment.mint(address, metadata, "0xEa41Cd3F972dB6237FfA2918dF9199B547172420");
      await tx.wait();
    } catch(e){
      console.log('this address could not mint:');
      console.log(address);
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
