const GuildNftWeightArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV3.sol/GuildNFTStakingWeightV3.json');

const fs = require('fs');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Analyzing with following address',
      deployerAddress
  );

  const {GUILD_NFT_STAKING_WEIGHT_V3_ADDRESS} = process.env;

  console.log(`GUILD_NFT_STAKING_WEIGHT_V3 found [${GUILD_NFT_STAKING_WEIGHT_V3_ADDRESS}]`);

  const stakingWeight =  new ethers.Contract(
      GUILD_NFT_STAKING_WEIGHT_V3_ADDRESS,
      GuildNftWeightArtifact.abi,
      deployer
  );

// {
// podeNFTv2Stakers(first: 1000)
//   {
//     id
//     garments(first:1000){
//       id
//     }
//   }
// }

    console.log(`----------------------`);

  const metadata = require('./thedlta_snapshot_12_13_2021.json');
  //  Data length
  console.log("number of stakers to check:")
  console.log(metadata.data.podeNFTv2Stakers.length)
  const datas = metadata.data.podeNFTv2Stakers;

  const minting = [];

  for(let i = 0; i< datas.length ; i++){
    const x = datas[i];
    if(x.garments.length >0){
      console.log(`The Address staker is ${x["id"]}`);
      console.log(`The number of pode this hold is ${x.garments.length}`);


      const weight = parseFloat(await stakingWeight.calcNewOwnerWeight(x["id"]));
      console.log(`Their overall staking weight (all pode they own) is: ${weight}`);

      let newWeight = Math.floor(weight/ x.garments.length);

        for(let j = 0; j< x.garments.length ; j++) {
          const y = x.garments[j];
          console.log(`${y["id"]}`);
        // // console.log(`${x["id"]}`);
        //   const migrateWeight = await staking.migrateCurrentStake(y["id"], x["id"], weightEachToken);
        //   await migrateWeight.wait();
        //   console.log(`${y["id"]} **** migrated stake with value: ${weightEachToken}`);
          minting.push({
            id: y["id"],
            owner: x["id"],
            weight: newWeight
          });
        }
  console.log("------------");
    }
  }

   // convert JSON object to string
    const mintingJson = JSON.stringify(minting);

    // write JSON string to a file
    fs.writeFileSync('dltapodeweights.json', mintingJson, (err) => {
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
