const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
const GuildNftWeightArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV1.sol/GuildNFTStakingWeightV1.json');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Analyzing with following address',
      deployerAddress
  );

  const {GUILD_NFT_STAKING_ADDRESS, GUILD_NFT_STAKING_WEIGHT_V1_ADDRESS} = process.env;
  console.log(`GUILD_NFT_STAKING found [${GUILD_NFT_STAKING_ADDRESS}]`);
  console.log(`GUILD_NFT_STAKING_WEIGHT_V1 found [${GUILD_NFT_STAKING_WEIGHT_V1_ADDRESS}]`);

  const staking = new ethers.Contract(
      GUILD_NFT_STAKING_ADDRESS,
      GuildNftStakingArtifact.abi,
      deployer
  );

  const stakingWeight =  new ethers.Contract(
      GUILD_NFT_STAKING_WEIGHT_V1_ADDRESS,
      GuildNftWeightArtifact.abi,
      deployer
  );

    console.log(`----------------------`);

  const metadata = require('./thedlta_snapshot_9_8_2021.json');
  //  Data length
  console.log("number of tokens to check:")
  console.log(metadata.data.length)
  const datas = metadata.data.podeNFTv2Stakers;
  console.log("everyones weight together is 682012146000000000000000000")

  for(let i = 0; i< datas.length ; i++){
    const x = datas[i];
    if(x.garments.length >0){
      console.log(`The Address staker is ${x["id"]}`);
      console.log(`The PODE ID's they hold are:`);
      x.garments.map(y=>{
        console.log(`${y["id"]}`);
      })

      const weight = await stakingWeight.calcNewOwnerWeight(x["id"]);
      console.log(`Their overall staking weight (all pode they own) is: ${weight}`);
      console.log(`Their share of the overall weight is: ${(100*(weight / parseFloat(682012146000000000000000000))).toFixed(2)} %`);
      console.log(`-----------------`);

    }

    // console.log(x.garments.)
    // try {
    //   const tx2 = await garment.ownerOf(
    //       x
    //   );
    //   console.log(`The owner of ${x} is: ${tx2}`);
    // } catch(e){
    //   console.log(`It seems ${x} has been burned already`)
    // }
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
