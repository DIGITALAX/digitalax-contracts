const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTv2.json');


const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  QUANTITY_NFT_SINGLE_BATCH_TX = 25;

  const {ERC721_GARMENT_ADDRESS} = process.env;


  const garment = new ethers.Contract(
      ERC721_GARMENT_ADDRESS,
      GarmentArtifact.abi,
      deployer
  );

  const firstTokenId = 111232;
  const updatedURI_fill_me =
      'https://digitalax.mypinata.cloud/ipfs/QmVPQDF43gb1kd56xMzBKS99nXpPED5pouu5hJW85xM9YS';

  const newUriArray = new Array(QUANTITY_NFT_SINGLE_BATCH_TX).fill(updatedURI_fill_me);
  const lastTokenId = firstTokenId + 199; // 200 total quantity


    console.log(`----------------------`);

  // Approve for all
  // const approveToken = await garment.setApprovalForAll(BURNER_ADDRESS, true);
  // await approveToken.wait();

    let amountToBurn = lastTokenId - firstTokenId + 1;

    if(amountToBurn % QUANTITY_NFT_SINGLE_BATCH_TX !== 0){
      console.log("please burn an even amount vs the max nft per single tx");
      return;
         }

    let numberOfLoops = Math.floor(amountToBurn / QUANTITY_NFT_SINGLE_BATCH_TX);
    console.log("Number of txs:");
    console.log(numberOfLoops);

    //
    let currentLoop = 0;
    if(numberOfLoops > 0){
      while(numberOfLoops--){
        const keys = [...Array(QUANTITY_NFT_SINGLE_BATCH_TX).keys()].map(function(x)
          { return x + firstTokenId + (currentLoop * QUANTITY_NFT_SINGLE_BATCH_TX); });
        if(keys[0] > lastTokenId){ return;}
        const tx2 = await garment.batchSetTokenURI(
          keys,
            newUriArray
        );
        console.log(tx2.hash);
        await tx2.wait();
        console.log('following tokens have been set:');
        console.log(keys);
        console.log('');
        currentLoop++;
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
