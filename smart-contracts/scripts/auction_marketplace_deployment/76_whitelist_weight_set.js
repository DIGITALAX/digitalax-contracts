const GuildNftWeightV4Artifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV4.sol/GuildNFTStakingWeightV4.json');

const fs = require('fs');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Analyzing with following address',
      deployerAddress
  );

  const {GUILD_NFT_STAKING_WEIGHT_V4_ADDRESS} = process.env;

  console.log(`GUILD_NFT_STAKING_WEIGHT_V4 found [${GUILD_NFT_STAKING_WEIGHT_V4_ADDRESS}]`);

  const stakingWeight =  new ethers.Contract(
      GUILD_NFT_STAKING_WEIGHT_V4_ADDRESS,
      GuildNftWeightV4Artifact.abi,
      deployer
  );

    console.log(`----------------------`);

  const metadata = require('./dltawhitelistweights.json');
  //  Data length
  console.log("number of tokens to check:")
  console.log(metadata.length)
  const datas = metadata;
  const MAX_NFT_SINGLE_TX = 100;
  const chunks = _.chunk(datas, MAX_NFT_SINGLE_TX);

  for(let i = 0; i< chunks.length ; i++){
    const x = chunks[i];
    const migrate = await stakingWeight.migrateCurrentWhitelistStake(x.map((x)=>{return x["tokenId"]}), x.map((x)=>{return x["token"]}), x.map((x)=>{return x["weight"]}));
    await migrate.wait();
    console.log('migrated');
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
