const GarmentArtifact = require('../../artifacts/DigitalaxSubscriptionNFT.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxSubscriptionCollection.json');
const MarketplaceArtifact = require('../../artifacts/DigitalaxSubscriptionMarketplace.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');

const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  MAX_NFT_SINGLE_TX = 20;

  const {SUBSCRIPTION_NFT_ADDRESS, SUBSCRIPTION_NFT_COLLECTION_ADDRESS, SUBSCRIPTION_NFT_MARKETPLACE_ADDRESS, ACCESS_CONTROLS_ADDRESS} = process.env;
  console.log(`SUBSCRIPTION_NFT_ADDRESS found [${SUBSCRIPTION_NFT_ADDRESS}]`);

  const garment = new ethers.Contract(
      SUBSCRIPTION_NFT_ADDRESS,
      GarmentArtifact.abi,
      deployer
  );

  const garmentCollection = new ethers.Contract(
      SUBSCRIPTION_NFT_COLLECTION_ADDRESS,
      GarmentCollectionArtifact.abi,
      deployer
  );

  const marketplace = new ethers.Contract(
      SUBSCRIPTION_NFT_MARKETPLACE_ADDRESS,
      MarketplaceArtifact.abi,
      deployer
  );


  const accessControls = new ethers.Contract(
      ACCESS_CONTROLS_ADDRESS,
      AccessControlsArtifact.abi,
      deployer
  );

  //Optional TODO decide if needed
  // const acr = await accessControls.addSmartContractRole(MARKETPLACE_ADDRESS);
  // await acr.wait();
  //
  // const scr =  await accessControls.addSmartContractRole(GARMENT_COLLECTION_ADDRESS);
  // await scr.wait();
  //
  // const acr2 = await accessControls.addMinterRole(GARMENT_COLLECTION_ADDRESS);
  // await acr2.wait();


  //// SETTINGS

  const reservePrice_common = '50000000000000000'; // reduced 10x TODO ****
  const reservePrice2_semirare = '100000000000000000'; // reduced 10x TODO ***
  const reservePrice2_exclusive = '200000000000000000'; // reduced 10x TODO **

 // const test_startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th

  const mainnet_startTime = '1620712800'; //  TODO confirm
  const mainnet_endTime = '1622440800'; //  TODO confirm

  // Use the single auction id processed in the last script to build auction id specific collections in this script

  // Next step is mint collections and open buy offers, run 1 at a time in production in case something drops
  const collectionUris = [
      {
          // Collection 1 Common
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DigiFizzy/digifizzy_1_common/hash.json').uri,
          price: reservePrice_common,
          collectionDesigner: FUND_MULTISIG_ADDRESS,
          amountToMintInCollection: 500,
          collectionId: 1,
          rarity: 'Common',
          tokendIds: [100001],
          tokenAmounts: [5],
      },
      {
          // Collection 2 Semirare
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DigiFizzy/digifizzy_2_semirare/hash.json').uri,
          price: reservePrice2_semirare,
          collectionDesigner: FUND_MULTISIG_ADDRESS,
          amountToMintInCollection: 200,
          collectionId: 2,
          rarity: 'Semi-Rare',
          tokendIds: [100001],
          tokenAmounts: [5],
      },
      {
          // Collection 3 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DigiFizzy/digifizzy_3_exclusive/hash.json').uri,
          price: reservePrice2_exclusive,
          collectionDesigner: FUND_MULTISIG_ADDRESS,
          amountToMintInCollection: 50,
          collectionId: 3,
          rarity: 'Exclusive',
          tokendIds: [100001],
          tokenAmounts: [5],
      }
  ]
    // Approve for all
    const approveToken = await garment.setApprovalForAll(SUBSCRIPTION_NFT_MARKETPLACE_ADDRESS, true);
    await approveToken.wait();

  // Start a marketplace with that collection
  console.log(`Approvals Confirmed. Creating the marketplace offers`)

  var arrayOfCollectionIdsDeployedForExclusiveNFT = [];
  for (let [index, collectionForMarketplace] of collectionUris.entries()) {
    console.log(`----------------------`);
    console.log(`Creating # ${collectionForMarketplace.amountToMintInCollection}  ${collectionForMarketplace.rarity} parent nfts with uri: ${collectionForMarketplace.uri} 
    and with child token ids`);
    console.log(`For the exclusive auction garment with id: ${collectionForMarketplace.collectionId}`);

    let amountToMintInitially = collectionForMarketplace.amountToMintInCollection;
    let numberOfLoops = 0;
    if(amountToMintInitially > MAX_NFT_SINGLE_TX){
      amountToMintInitially = collectionForMarketplace.amountToMintInCollection % MAX_NFT_SINGLE_TX;
      numberOfLoops = Math.floor(collectionForMarketplace.amountToMintInCollection / MAX_NFT_SINGLE_TX);
    }

    // Mint collection
     const tx = await garmentCollection.mintCollection(
        collectionForMarketplace.uri,
        collectionForMarketplace.collectionDesigner,
         amountToMintInitially,
        collectionForMarketplace.collectionId,
        collectionForMarketplace.rarity,
        collectionForMarketplace.tokendIds, // childTokenIds
        collectionForMarketplace.tokenAmounts, // childTokenAmounts
    );

    const createCollectionId = await new Promise((resolve, reject) => {
      garmentCollection.on('MintSubscriptionCollection',
          async (collectionId, bundleId, rarity, event) => {
            const block = await event.getBlock();
            console.log(`Collection # ${collectionId} created`);
            console.log(`at time ${block.timestamp} for bundle id ${bundleId}`);
            resolve(collectionId);
          });
    });

    await tx.wait();
    arrayOfCollectionIdsDeployedForExclusiveNFT.push(createCollectionId.toString());

    console.log(`-Collection created-`);

    // Mint more
    if(numberOfLoops > 0){
      while(numberOfLoops--){
        const tx2 = await garmentCollection.mintMoreNftsOnCollection(
            createCollectionId,
            MAX_NFT_SINGLE_TX,
            collectionForMarketplace.tokendIds, // childTokenIds
            collectionForMarketplace.tokenAmounts, // childTokenAmounts
        );
        await tx2.wait();
      }
    }

    // Approve the token for the marketplace contract
    console.log(`Approving Collection ${createCollectionId} for the marketplace contract...`)
    const allTokenIdsCreated = await garmentCollection.getCollection(createCollectionId);
    console.log(allTokenIdsCreated[0]);

    // Create a marketplace offer for this exclusive parent nft
    const createOfferTx = await marketplace.createOffer(
        createCollectionId, // Collection id
        collectionForMarketplace.price, // reservePrice for all collection items
        mainnet_startTime, // Marketplace buy offer available after start time
        mainnet_endTime,
        0,
        0,
        10 // Hardcoded 10 as maximum for this round
    );

    await createOfferTx.wait();
    console.log(`--Marketplace created for collection--`);
    console.log(createCollectionId);
    console.log(`----------------------`);
  }

  console.log('The parent nfts with collections created for them are as follows: ');
  console.log(arrayOfCollectionIdsDeployedForExclusiveNFT);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
