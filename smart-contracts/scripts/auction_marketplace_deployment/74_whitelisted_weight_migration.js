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

  //{
    // guildWhitelistedNFTs(first: 1000)
    //   {
    //     id
    //   }
    // }
    
  const {GUILD_NFT_STAKING_WEIGHT_V3_ADDRESS} = process.env;

  console.log(`GUILD_NFT_STAKING_WEIGHT_V3 found [${GUILD_NFT_STAKING_WEIGHT_V3_ADDRESS}]`);

  const stakingWeight =  new ethers.Contract(
      GUILD_NFT_STAKING_WEIGHT_V3_ADDRESS,
      GuildNftWeightArtifact.abi,
      deployer
  );

    console.log(`----------------------`);

  const metadata = require('./thedlta_snapshot_whitelisted_tokens.json');
  //  Data length
  console.log("number of stakers to check:")
  console.log(metadata.data.guildWhitelistedNFTs.length)
  const datas = metadata.data.guildWhitelistedNFTs;

  const minting = [];

  for(let i = 0; i< datas.length ; i++){
    const x = datas[i];

    console.log(`The token staked is ${x["id"]}`);
    const myArray = x["id"].split("-");

    const token = myArray[0];
    const tokenId = myArray[1];

    console.log(`The token is ${token}`);
    console.log(`The token id is ${tokenId}`);

    const weight = (await stakingWeight.whitelistedNFTTokenWeight(token, tokenId))[0];
    console.log(`Their token staking weight  is: ${weight}`);
    minting.push({
          token,
          tokenId,
          weight: weight.toString()
        });

      // for(let j = 0; j< x.garments.length ; j++) {
      //   const y = x.garments[j];
      //   console.log(`${y["id"]}`);
      // // console.log(`${x["id"]}`);
      //   const migrateWeight = await staking.migrateCurrentStake(y["id"], x["id"], weightEachToken);
      //   await migrateWeight.wait();
      //   console.log(`${y["id"]} **** migrated stake with value: ${weightEachToken}`);

    //  }
  console.log("------------");

  }

   // convert JSON object to string
    const mintingJson = JSON.stringify(minting);

    // write JSON string to a file
    fs.writeFileSync('dltawhitelistweights.json', mintingJson, (err) => {
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
