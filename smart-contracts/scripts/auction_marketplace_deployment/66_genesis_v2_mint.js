const GenesisV2Artifact = require('../../artifacts/contracts/DigitalaxGenesisV2.sol/DigitalaxGenesisV2.json');
const _ = require('lodash');
const fs = require('fs');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Airdropping genesis v2 token with following address',
      deployerAddress
  );

  MAX_NFT_SINGLE_TX = 20;

  // const {GENESIS_V2_Address} = process.env;
  // console.log(`PODE_V2_ADDRESS found [${PODE_V2_ADDRESS}]`);
  //
  const genesis = new ethers.Contract(
      '0x2543D997E766aF463e2b11bD7EE3e6D722bb1D9B',
      GenesisV2Artifact.abi,
      deployer
  );

    console.log(`----------------------`);

  // Approve for all
  // const approveToken = await garment.setApprovalForAll(BURNER_ADDRESS, true);
  // await approveToken.wait();
  const metadata = require('./genesisWallets.json');
  const stakers = require('./genesisStakers.json');
  const tokenData = require('./genesisTokens.json');
  //  Data length
  console.log(metadata.data.digitalaxGenesisNFTs.length)
  const datas = metadata.data.digitalaxGenesisNFTs;
  const tokenContributions = tokenData.tokens;
  const stakerData = stakers.data.digitalaxGenesisStakedTokens;

  const minting = [];
  for(let i = 0; i< datas.length + 1 ; i++){
    const index = datas.filter(function(val, _){
    return val.id === i.toString();
   });
    if(!index[0]){
        continue;
    }
    let owner = index[0].owner;
    if(owner == "0x0000000000000000000000000000000000000000" | owner == "0x000000000000000000000000000000000000dead") {
        continue;
    }
    if(owner == '0xa202d5b0892f2981ba86c981884ceba49b8ae096'){
        // Token is staked lets find owner
         const stakerIndex = stakerData.filter(function(val, _){
            return val.id === i.toString();
         });
         if(!stakerIndex[0]){
             continue;
         }
        owner = stakerIndex[0].staker;
    }

    const contribution = tokenContributions.filter(function(val, _){
    return val.token === i;
   });
    if(contribution[0].contribution == 0){
        continue;
    }
    minting.push({
        id: i,
        owner,
        price: contribution[0].contribution
    });
  }

   // convert JSON object to string
    const mintingJson = JSON.stringify(minting);

    // write JSON string to a file
    fs.writeFileSync('genesisMinting.json', mintingJson, (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON mintingJson is saved.");
    });


  const chunks = _.chunk(minting, MAX_NFT_SINGLE_TX);

  for(let i = 0; i< chunks.length ; i++){
      const chunky = chunks[i];
      console.log("----");
      const chunkIds = chunky.map((x)=> {
          return x.id;
      });
      const chunkPrices = chunky.map((x)=> {
          return x.price.toString();
      });
      const chunkOwners = chunky.map((x)=> {
          return x.owner;
      });
        console.log(chunkIds);
        console.log(chunkPrices);
        console.log(chunkOwners);
      const mintTx = await genesis.batchMint(chunkIds, chunkOwners, chunkOwners, chunkPrices);
      await mintTx.wait();
      console.log('Minted...');
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
