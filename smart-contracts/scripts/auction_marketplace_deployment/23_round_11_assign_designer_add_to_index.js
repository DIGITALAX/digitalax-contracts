const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTv2.json');


const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  MAX_NFT_SINGLE_TX = 100;

  const {ERC721_GARMENT_ADDRESS} = process.env;

  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);


  const garment = new ethers.Contract(
      ERC721_GARMENT_ADDRESS,
      GarmentArtifact.abi,
      deployer
  );

  const firstTokenId = 100294

  const lastTokenId = 101104;


    console.log(`----------------------`);

  // Approve for all
  // const approveToken = await garment.setApprovalForAll(BURNER_ADDRESS, true);
  // await approveToken.wait();

    let amountToModify = lastTokenId - firstTokenId + 1;
    let numberOfLoops = 0;
    if(amountToModify > MAX_NFT_SINGLE_TX){
      numberOfLoops = Math.floor(amountToModify / MAX_NFT_SINGLE_TX);
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
        // const tx2 = await garment.batchSetGarmentDesigner(
        //   keys, Array(keys.length).fill('0x316cC6d214Ce4077a01C828acBb3E9f3D4A24938')
        // );
        // console.log(tx2.hash);
        // await tx2.wait();
        console.log(keys);
        console.log('Have been set');
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
