const GarmentArtifact = require('../../artifacts/DigitalaxSubscriptionNFT.json');
const BurnerArtifact = require('../../artifacts/DigitalaxSubscriptionBurner.json');


const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  MAX_NFT_SINGLE_TX = 10;

  const {SUBSCRIPTION_NFT_ADDRESS, BURNER_ADDRESS} = process.env;
  console.log(`BURNER_ADDRESS found [${BURNER_ADDRESS}]`);

  const garment = new ethers.Contract(
      SUBSCRIPTION_NFT_ADDRESS,
      GarmentArtifact.abi,
      deployer
  );

  const burner = new ethers.Contract(
      BURNER_ADDRESS,
      BurnerArtifact.abi,
      deployer
  );


  const firstTokenId = 101331;
  const lastTokenId = 102380;


    console.log(`----------------------`);

  // Approve for all
  // const approveToken = await garment.setApprovalForAll(BURNER_ADDRESS, true);
  // await approveToken.wait();

    let amountToBurn = lastTokenId - firstTokenId + 1;
    let numberOfLoops = 0;
    if(amountToBurn > MAX_NFT_SINGLE_TX){
      numberOfLoops = Math.floor(amountToBurn / MAX_NFT_SINGLE_TX);
      // amountToBurn = amountToBurn % MAX_NFT_SINGLE_TX; // Use this if you need to burn an uneven amount
    }

    // // Mint collection
    //  const tx = await burner.burnBatch(
    //
    // );
    //
    // await tx.wait();
    //
    // console.log(`First batch burned, going to continue burning`);

    // Mint more
    let currentLoop = 0;
    if(numberOfLoops > 0){
      while(numberOfLoops--){
        const keys = [...Array(MAX_NFT_SINGLE_TX).keys()].map(function(x)
          { return x + firstTokenId + (currentLoop * MAX_NFT_SINGLE_TX); });
        if(keys[0] > lastTokenId){ return;}
        const tx2 = await burner.burnBatch(
          keys
        );
        console.log(tx2.hash);
        await tx2.wait();
        console.log(keys);
        console.log('Have been burned');
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
