const NFTStakingArtifact = require('../../artifacts/contracts/staking/DigitalaxMonaStaking.sol/DigitalaxMonaStaking.json');

const fs = require('fs');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Analyzing with following address',
      deployerAddress
  );

 // const DIGITALAX_STAKING_ADDRESS = "0x8Df6c229B3645F7440C2902bAa135635AbB845EB"
  const DIGITALAX_STAKING_ADDRESS = "0xF795c2abB0E7A56A0C011993C37A51626756B4BD"

  const stakingContract =  new ethers.Contract(
      DIGITALAX_STAKING_ADDRESS,
      NFTStakingArtifact.abi,
      deployer
  );


    console.log(`----------------------`);

  const metadata = require('./mona_staking_tokens.json');
  //  Data length
  console.log("number of stakers to check:")
   console.log(metadata.data.stakers.length)
   const datas = metadata.data.stakers;
  // console.log(metadata.data.digitalaxGDNMembershipStakers.length)
  // const datas = metadata.data.digitalaxGDNMembershipStakers;

  const minting = [];

  for(let i = 0; i< datas.length ; i++){
    const x = datas[i];
    const value = (await stakingContract.getStakedLPBalance(x["id"])) / 1000000000000000000;

    const monaValue = 90000 / 0.000909;
  //    const monaValue = 409;
    console.log(`${x["id"]}: ${value} W3F -- $${value * monaValue} USD`);
    }

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
