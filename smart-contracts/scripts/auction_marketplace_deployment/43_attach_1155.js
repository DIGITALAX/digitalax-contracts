const AttacherArtifact = require('../../artifacts/DigitalaxMaterialsV2Attacher.json');
const CollectionArtifact = require('../../artifacts/DigitalaxGarmentCollectionV2.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  MAX_NFT_SINGLE_TX = 20;

  const {ATTACHER_ADDRESS, GARMENT_COLLECTION_ADDRESS} = process.env;
  console.log(`BURNER_ADDRESS found [${ATTACHER_ADDRESS}]`);


  const attacher = new ethers.Contract(
      ATTACHER_ADDRESS,
      AttacherArtifact.abi,
      deployer
  );

  const collectionContract = new ethers.Contract(
      GARMENT_COLLECTION_ADDRESS,
      CollectionArtifact.abi,
      deployer
  );

  const metadata = {
    "data": [
      100,101,105,106,107,124,143,144,145,146,147,148,149,150,151,152,153,154,155,160,167,169,174,175,18,184,185,186,187,188,189,19,190,191,20,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,23,24,25,250,255,256,257,258,26,266,267,27,274,28,29,3,30,31,32,33,339,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,62,67,69,70,83,84,85,86,90,91,92,96
         ]
  }

  //  Data length
//  console.log(metadata.data.length)
   let tokenArray = [];
  for(let i = 0; i< metadata.data.length ; i++){
    const x = metadata.data[i];
    const allCollectionIds = await collectionContract.getTokenIds(x)

  //  console.log('Here is the collection to process')
  //  console.log(`there are ${allCollectionIds.length} nfts in this collection`);
 //   console.log(allCollectionIds)
    if(allCollectionIds[0]){
        const firstTokenId = allCollectionIds[0].toNumber();
        const lastTokenId = allCollectionIds[allCollectionIds.length -1].toNumber();

  //    console.log(`----------------------`);

        let amountToBurn = lastTokenId - firstTokenId + 1;
        let numberOfLoops = 0;

        if(amountToBurn > MAX_NFT_SINGLE_TX){
          numberOfLoops = Math.floor(amountToBurn / MAX_NFT_SINGLE_TX);
          amountToBurn = amountToBurn % MAX_NFT_SINGLE_TX; // Use this if you need to burn an uneven amount
        }
        else {
          const keys = [...Array(amountToBurn).keys()].map(function(x)
          { return x + firstTokenId; });
          if(keys[0] > lastTokenId){ return;}

          // const tx2 = await attacher.attachERC1155ToExisting721(
          //     keys , [100308], [1]
          // );
          // console.log(tx2.hash);
          // await tx2.wait();

          console.log(keys);
          tokenArray  = tokenArray.concat(keys)
          //  console.log('Have been attached');
        }

        let currentLoop = 0;
        if(numberOfLoops > 0){
          while(numberOfLoops--){
            const keys = [...Array(MAX_NFT_SINGLE_TX).keys()].map(function(x)
            { return x + firstTokenId + (currentLoop * MAX_NFT_SINGLE_TX); });
            if(keys[0] > lastTokenId){ return;}

            // const tx2 = await attacher.attachERC1155ToExisting721(
            //     keys , [100308], [1]
            // );
            // console.log(tx2.hash);
            //await tx2.wait();
            console.log(keys)
            tokenArray = tokenArray.concat(keys);
            //  console.log('Have been attached');

            currentLoop++;

          }
      }
    }
  }
  console.log(tokenArray);
  console.log('above is the official token list')


  var file = require('fs').createWriteStream('hello.txt');
  file.on('error', function(err) { Console.log(err) });
  tokenArray.forEach(value => file.write(`${value}\r\n`));
  file.end();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
