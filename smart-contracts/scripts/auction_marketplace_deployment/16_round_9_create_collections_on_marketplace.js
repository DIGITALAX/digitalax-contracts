const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTV2.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxGarmentCollectionV2.json');
const MarketplaceArtifact = require('../../artifacts/DigitalaxMarketplaceV2.json');
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

  const {ERC721_GARMENT_ADDRESS, GARMENT_COLLECTION_ADDRESS, MARKETPLACE_ADDRESS, ACCESS_CONTROLS_ADDRESS} = process.env;
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);

  const garment = new ethers.Contract(
      ERC721_GARMENT_ADDRESS,
      GarmentArtifact.abi,
      deployer
  );

  const garmentCollection = new ethers.Contract(
      GARMENT_COLLECTION_ADDRESS,
      GarmentCollectionArtifact.abi,
      deployer
  );

  const marketplace = new ethers.Contract(
      MARKETPLACE_ADDRESS,
      MarketplaceArtifact.abi,
      deployer
  );

  //Optional TODO decide if needed
 //  const updateFee = await marketplace.updateMarketplacePlatformFee('999');
 //  await updateFee.wait();
  // const updateDiscount = await marketplace.updateMarketplaceDiscountToPayInErc20('0');
  // await updateDiscount.wait();


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

    const reservePrice_common = '200000000000000000';
    const reservePrice2_semirare = '50000000000000000';
    const reservePrice2_exclusive = '50000000000000000';

    const mainnet_startTime = '1621017000';
    const mainnet_endTime = '1623344400';

  // Use the single auction id processed in the last script to build auction id specific collections in this script

   const auctionId_9 = 100454; // TODO update from result of last script (important)
   const auctionId_10 = 100455; // TODO update from result of last script (important)
   const auctionId_11 = 100456; // TODO update from result of last script (important)
   const auctionId_12 = 100457; // TODO update from result of last script (important)

  // Next step is mint collections and open buy offers, run 1 at a time in production in case something drops
  const collectionUris = [
    {
      // Collection Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Common/INMC01/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 128,
      auctionIdToLink: auctionId_9,
      rarity: 'Common',
      tokendIds: [],
      tokenAmounts: [],
    },
    {
      // Collection Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Common/INMC02/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 128,
      auctionIdToLink: auctionId_10,
      rarity: 'Common',
      tokendIds: [],
      tokenAmounts: [],
    },
    {
      // Collection Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Common/INMC03/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 128,
      auctionIdToLink: auctionId_11,
      rarity: 'Common',
      tokendIds: [],
      tokenAmounts: [],
    },
    {
      // Collection Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Common/INMC04/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 128,
      auctionIdToLink: auctionId_12,
      rarity: 'Common',
      tokendIds: [],
      tokenAmounts: [],
    },
    {
      // Collection Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Semi-Rare/INMC05/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 64,
      auctionIdToLink: auctionId_9,
      rarity: 'Semi-Rare',
      tokendIds: [],
      tokenAmounts: [],
      },
    {
      // Collection Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Semi-Rare/INMC06/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 64,
      auctionIdToLink: auctionId_10,
      rarity: 'Semi-Rare',
      tokendIds: [],
      tokenAmounts: [],
      },
    {
      // Collection Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Semi-Rare/INMC07/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 64,
      auctionIdToLink: auctionId_11,
      rarity: 'Semi-Rare',
      tokendIds: [],
      tokenAmounts: [],
      },
    {
      // Collection Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Semi-Rare/INMC08/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 64,
      auctionIdToLink: auctionId_12,
      rarity: 'Semi-Rare',
      tokendIds: [],
      tokenAmounts: [],
      },
  ]
    // Approve for all
    const approveToken = await garment.setApprovalForAll(MARKETPLACE_ADDRESS, true);
    await approveToken.wait();

  // Start a marketplace with that collection
  console.log(`Approvals Confirmed. Creating the marketplace offers`)

  var arrayOfCollectionIdsDeployedForExclusiveNFT = [];
  for (let [index, collectionForMarketplace] of collectionUris.entries()) {
    console.log(`----------------------`);
    console.log(`Creating # ${collectionForMarketplace.amountToMintInCollection}  ${collectionForMarketplace.rarity} parent nfts with uri: ${collectionForMarketplace.uri} 
    and with child token ids of 0`);
    console.log(`For the exclusive auction garment with id: ${collectionForMarketplace.auctionIdToLink}`);

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
        collectionForMarketplace.auctionIdToLink,
        collectionForMarketplace.rarity,
        collectionForMarketplace.tokendIds, // childTokenIds
        collectionForMarketplace.tokenAmounts, // childTokenAmounts
    );

    const createCollectionId = await new Promise((resolve, reject) => {
      garmentCollection.on('MintGarmentCollection',
          async (collectionId, auctionId, rarity, event) => {
            const block = await event.getBlock();
            console.log(`Collection # ${collectionId} created`);
            console.log(`at time ${block.timestamp} for auction id ${auctionId}`);
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
        mainnet_endTime, // Marketplace buy offer available after start time
        0,
        0,
        10
    );

    await createOfferTx.wait();
    console.log(`--Marketplace created for collection--`);
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
