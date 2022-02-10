const NFTStakingArtifact = require('../../artifacts/contracts/staking/DigitalaxNFTStaking.sol/DigitalaxNFTStaking.json');

const fs = require('fs');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Analyzing with following address',
      deployerAddress
  );

  //const DIGITALAX_STAKING_ADDRESS = "0xd80eeB5aFfd3C419f2Cb05477372778862D26757"
  const DIGITALAX_STAKING_ADDRESS = "0x2E4ae1f8E1463f450e9B01F20cee1590Bff4E1fC"


  const stakingContract =  new ethers.Contract(
      DIGITALAX_STAKING_ADDRESS,
      NFTStakingArtifact.abi,
      deployer
  );


// {
// {
//   digitalaxNFTStakers(first: 1000){
//     garments{
//       id
//     }
//   }
// }


    console.log(`----------------------`);

  const metadata = require('./nft_staking_tokens.json');
  //  Data length
  console.log("number of stakers to check:")
   console.log(metadata.data.digitalaxNFTStakers.length)
   const datas = metadata.data.digitalaxNFTStakers;
  // console.log(metadata.data.digitalaxGDNMembershipStakers.length)
  // const datas = metadata.data.digitalaxGDNMembershipStakers;

  const minting = [];

  for(let i = 0; i< datas.length ; i++){
    const x = datas[i];
    if(x.garments.length >0){
        for(let j = 0; j< x.garments.length ; j++) {
          const y = x.garments[j];
          console.log(`${y["id"]}`);
          minting.push({
            id: y["id"],
          });
        }
  console.log("------------");
    }
  }

   // convert JSON object to string
    const mintingJson = JSON.stringify(minting);

    // write JSON string to a file
    fs.writeFileSync('tokensmigrated.json', mintingJson, (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON mintingJson is saved.");
    });


  // set all whitelisted nft weights

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
