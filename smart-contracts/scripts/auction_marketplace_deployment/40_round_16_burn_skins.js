const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTv2.json');
const BurnerArtifact = require('../../artifacts/DigitalaxGarmentNFTv2Burner.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuctionV2.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  MAX_NFT_SINGLE_TX = 18;

  const {ERC721_GARMENT_ADDRESS, SKINS_BURNER_ADDRESS, AUCTION_ADDRESS} = process.env;
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
  const auction = new ethers.Contract(
      AUCTION_ADDRESS,
      AuctionArtifact.abi,
      deployer
  );


  const firstTokenId = 132696;
  const lastTokenId = 132732;

    console.log(`----------------------`);

  // Approve for all
  const approveToken = await garment.setApprovalForAll(SKINS_BURNER_ADDRESS, true);
  await approveToken.wait();

    let amountToBurn = lastTokenId - firstTokenId + 1;
    let numberOfLoops = 0;
    if(amountToBurn > MAX_NFT_SINGLE_TX){
      numberOfLoops = Math.floor(amountToBurn / MAX_NFT_SINGLE_TX);
      amountToBurn = amountToBurn % MAX_NFT_SINGLE_TX; // Use this if you need to burn an uneven amount
    }


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

        // // OPTIONAL TODO use if needed
        for(let i =0; i< keys.length; i++){
          const cancelAuction = await auction.cancelAuction(keys[i]);
          await cancelAuction.wait();
          console.log('cancelled its auction:');
          console.log(keys[i]);
        }
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
