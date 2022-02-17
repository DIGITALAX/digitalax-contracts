// const NFTStakingArtifact = require('../../artifacts/contracts/staking/DigitalaxMonaStaking.sol/DigitalaxMonaStaking.json');

const fs = require('fs');
const _ = require('lodash');

async function main() {
 //  const [deployer] = await ethers.getSigners();
 //  const deployerAddress = await deployer.getAddress();
 //  console.log(
 //      'Analyzing with following address',
 //      deployerAddress
 //  );
 //
 // // const DIGITALAX_STAKING_ADDRESS = "0x8Df6c229B3645F7440C2902bAa135635AbB845EB"
 //  const DIGITALAX_STAKING_ADDRESS = "0xF795c2abB0E7A56A0C011993C37A51626756B4BD"
 //
 //  const stakingContract =  new ethers.Contract(
 //      DIGITALAX_STAKING_ADDRESS,
 //      NFTStakingArtifact.abi,
 //      deployer
 //  );


    console.log(`----------------------`);

  const metadata = require('./bancor_mp4s.json');
  //  Data length
  console.log("number of tokens to check:")
   console.log(metadata.data.tokens.length)
   const datas = metadata.data.tokens;

  // console.log(metadata.data.digitalaxGDNMembershipStakers.length)
  // const datas = metadata.data.digitalaxGDNMembershipStakers;

 // const minting = [];

  for(let i = 0; i< datas.length ; i++){
    const x = datas[i];
    console.log(x["token"]);
    // minting.push({
    //         token: x["token"],
    //       });
    const mintingJsonInfo = {
          "name": "DEXLoverz",
          "description": "Protect the tokens you love and practice Safe DEX.",
          "external_url": "http://drip.digitalax.xyz/bancor",
          "animation_url": x["token"],
          "attributes": [
            {
              "trait_type": "Collection",
              "value": "Bancor"
            }
          ]
        }

    const mintingJson = JSON.stringify(mintingJsonInfo);
    const fileName = 'tokensuri/token' + (i+1).toString()+'.json';
    fs.writeFileSync(fileName, mintingJson, (err) => {
        if (err) {
            throw err;
        }
    });

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
