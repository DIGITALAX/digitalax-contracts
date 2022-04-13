const SkinsArtifact = require('../../artifacts/contracts/garment/DigitalaxBatchMint.sol/DigitalaxBatchMint.json');
const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Airdropping pode v2 token with following address',
      deployerAddress
  );

const {ERC721_GARMENT_ADDRESS, GARMENT_COLLECTION_ADDRESS, DRIP_MARKETPLACE_ADDRESS, ACCESS_CONTROLS_ADDRESS} = process.env;
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);


  const batchminter = "0x33fef67387b98e4214cb38fa4912435a1bd6f105";

  const garment = new ethers.Contract(
      batchminter,
      SkinsArtifact.abi,
      deployer
  );

  console.log(`----------------------`);

  // Approve for all
  // const approveToken = await garment.setApprovalForAll(BURNER_ADDRESS, true);
  // await approveToken.wait();
  const metadatas = require('./bancor_uris.json');
  const addressesList = require('./bancor_addresses.json');
  //  Data length

  console.log(metadatas.data.tokens.length)
  console.log(addressesList.data.addresses.length)

  const datas = metadatas.data.tokens;
  const addresses = addressesList.data.addresses;
  const MAX_NFT_SINGLE_TX = 5;

  const chunksUri = _.chunk(datas, MAX_NFT_SINGLE_TX);
  const chunksAddress = _.chunk(addresses, MAX_NFT_SINGLE_TX);

  for(let i = 0; i< chunksAddress.length ; i++){
  //for(let i = 0; i< addresses.length ; i++){

    let metadata = chunksUri[i];
    const address = chunksAddress[i];
    if(metadata.length != address.length) {
      return;
    }
    console.log('Going to mint to');
    console.log(address);
    console.log('With the metadata:');
    console.log(metadata)
    console.log("Iteration ***")
    console.log(i)
    const tx = await garment.batchMint(ERC721_GARMENT_ADDRESS, address.map(x=> {return x["address"]}), metadata.map(x=> {return x["token"]}), Array(address.length).fill("0xaa3e5ee4fdc831e5274fe7836c95d670dc2502e6"));

     // console.log(   address.map(x=> {return x["address"]}));
     //   console.log( metadata.map(x=> {return x["token"]}));
     //    console.log(Array(address.length).fill("0xaa3e5ee4fdc831e5274fe7836c95d670dc2502e6"));
    await tx.wait();
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
