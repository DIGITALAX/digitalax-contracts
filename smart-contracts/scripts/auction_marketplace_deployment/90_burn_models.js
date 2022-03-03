const GarmentArtifact = require('../../artifacts/contracts/garment/ModelsNFT.sol/ModelsNFT.json');
const BurnerArtifact = require('../../artifacts/contracts/utils/ModelsNFTBurner.sol/ModelsNFTBurner.json');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Burning with following address',
      deployerAddress
  );

  MAX_NFT_SINGLE_TX = 19;


  const SKINS_BURNER_ADDRESS = "0xb371f24067e9b48363A34f70a757BC3A9169bb39";
  const ERC721_GARMENT_ADDRESS = "0x2ffce9b58a788a54b4466b0d5ccc5c6dd00c1b83";

  console.log(`BURNER_ADDRESS found [${SKINS_BURNER_ADDRESS}]`);

  const garment = new ethers.Contract(
      ERC721_GARMENT_ADDRESS,
      GarmentArtifact.abi,
      deployer
  );

  const burner = new ethers.Contract(
      SKINS_BURNER_ADDRESS,
      BurnerArtifact.abi,
      deployer
  );


    console.log(`----------------------`);
  // Approve for all
  // const approveToken = await garment.setApprovalForAll(SKINS_BURNER_ADDRESS, true);
  // await approveToken.wait();

  const metadata = require('./modelsburntokens.json');
  //  Data length
  console.log("number of tokens to burn:")
  console.log(metadata.data.length)
  const datas = metadata.data;

  const chunks = _.chunk(metadata.data, MAX_NFT_SINGLE_TX);

  for(let i = 0; i< chunks.length ; i++){
    const x = chunks[i];
    console.log('Burning in progress....:');
    const tx2 = await burner.burnBatch(
        x
    );
    await tx2.wait();
    console.log(tx2.hash);
    console.log('These tokens HAVE BEEN BURNED:')
    console.log(x)
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
