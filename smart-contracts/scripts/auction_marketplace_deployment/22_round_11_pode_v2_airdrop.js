const PodeV2Artifact = require('../../artifacts/PodeNFTv2.json');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Airdropping pode v2 token with following address',
      deployerAddress
  );

  MAX_NFT_SINGLE_TX = 20;

  const {PODE_V2_ADDRESS} = process.env;
  console.log(`PODE_V2_ADDRESS found [${PODE_V2_ADDRESS}]`);

  const garment = new ethers.Contract(
      PODE_V2_ADDRESS,
      PodeV2Artifact.abi,
      deployer
  );



    console.log(`----------------------`);

  // Approve for all
  // const approveToken = await garment.setApprovalForAll(BURNER_ADDRESS, true);
  // await approveToken.wait();
  const metadata = require('./pode.json');
  //  Data length
  console.log(metadata.data.length)
  const datas = metadata.data;

  const chunks = _.chunk(metadata.data, MAX_NFT_SINGLE_TX);

  for(let i = 0; i< chunks.length ; i++){
    const x = chunks[i];
    const tx = await garment.batchMint(x, x);
    await tx.wait();

    console.log('Here is the minted receivers')
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
