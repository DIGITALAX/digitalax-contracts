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

  // EMMA FILL ME OUT BELOW
  // THIS SCRIPT IS READY TO RUN FOR RARI CAP 1
  // AFTER 1st RUNNING IT, for 2nd run, UPDATE LINE 43 with the next "first" token id
  // And the line below , line 45 with the token uri
  // You can double check the script and the excel sheet to make sure there is accuracy.

  //     112832	https://digitalax.mypinata.cloud/ipfs/QmXW1KznmKSq2pT5buZ5paoB53dTJcbR3j7zD1gQxEicgk
  //     113032	https://digitalax.mypinata.cloud/ipfs/QmSrRZJe5EmSokixYqYuNGDANKix2mp7LmZTEuUmHRJfbS
  //     113232	https://digitalax.mypinata.cloud/ipfs/QmUtk91RFne78TmGCLYGvw5mdgfM5bYsxo22N6Wi8VsQ6h
  //     113432	https://digitalax.mypinata.cloud/ipfs/QmPmgVgMmrduUM6UcdnrmixzVku77huECyo27ED1QgAn3n
  //     113632	https://digitalax.mypinata.cloud/ipfs/QmNqYoJ6HziXiK99v5irw9v6euMd8iZoRr2zrsMBDjqZTk
  //     114552	https://digitalax.mypinata.cloud/ipfs/QmbmAoj8bczeGhw4QcYtQrw4tDuMi13ZiCEX2FV11sHbtY
  //     114752	https://digitalax.mypinata.cloud/ipfs/QmZhmCBXTJeKHhEVL34qZWuoS7JFcFvMR76Dp3WS1oSJ97
  //     114952	https://digitalax.mypinata.cloud/ipfs/QmUyoSufLttjegdfMdFWrHrVfYc7iZ5JJsGYaAY4hvXb1k
  //     115712	https://digitalax.mypinata.cloud/ipfs/QmbFe63jfCPi6mLPPHnvb1qJkV6vs4aX9XFBc8N9NZ6Vk8
  //     115912	https://digitalax.mypinata.cloud/ipfs/QmRet5pP9i3C71fMrm8Zaii2hnutYRiRRLfiPFhnfCu1HS
  //     116112	https://digitalax.mypinata.cloud/ipfs/QmSHq7fxeiiQS7g4p1Py1QG1HA1u24Jv319iBCqB5V1PDM

  const firstTokenId = 112632;
  const updatedURI_fill_me =
      'https://digitalax.mypinata.cloud/ipfs/QmUPMdGKDkipEfasF9t4P9UxdkXCs7gS8ByQZW6t951EXA';

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
