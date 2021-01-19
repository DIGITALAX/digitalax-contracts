const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxGarmentCollection.json');
const MarketplaceArtifact = require('../../artifacts/DigitalaxMarketplace.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');

const {ROUND_4_DESIGNERS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

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
  // const updateFee = await marketplace.updateMarketplacePlatformFee('420');
  // await updateFee.wait();
  // const updateDiscount = await marketplace.updateMarketplaceDiscountToPayInErc20('0');
  // await updateDiscount.wait();


  const accessControls = new ethers.Contract(
      ACCESS_CONTROLS_ADDRESS,
      AccessControlsArtifact.abi,
      deployer
  );

  //Optional TODO decide if needed
//  await accessControls.addSmartContractRole(MARKETPLACE_ADDRESS);


  //// SETTINGS
  // fill in uris for the nfts
  const tokenId_goodbye_sun_internal_treasure =  ['75']; // on mainnet 75 TODO confirm for mainnet
  const tokenId_seeing_sun_serenity =  ['74']; // on mainnet 74 TODO confirm for mainnet

  const tokenId_krkn_low_life =  ['70']; // on mainnet 70 TODO confirm for mainnet
  const tokenId_kero_mercenary =  ['71']; // on mainnet 71 TODO confirm for mainnet

  const tokenId_green_bean_caterpillar =  ['59']; // on mainnet 59 TODO confirm for mainnet
  const tokenId_blue_slide_cocoon =  ['60']; // on mainnet 60 TODO confirm for mainnet

  const tokenId_deep_blue_cybernetic =  ['67']; // on mainnet 67 TODO confirm for mainnet
  const tokenId_purple_cells_master_dreams =  ['68']; // on mainnet 68 TODO confirm for mainnet

  const tokenIdAmounts = ['1'];

  const reservePrice_common = '150000000000000000';
  const reservePrice2_semirare = '270000000000000000';

 // const test_startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th

  const mainnet_startTime = '1611086400'; // Jan 19, 8pm

  // Use the single auction id processed in the last script to build auction id specific collections in this script
  const auctionId_mar_guixa = 0; // golden spiral TODO update from result of last script (important)
  const auctionId_msistema = 0; // big shot TODO update from result of last script (important)
  const auctionId_alyona = 0; //butterfly TODO update from result of last script (important)
  const auctionId_vitaly = 0; // elimination TODO update from result of last script (important)

  // Next step is mint collections and open buy offers, run 1 at a time in production in case something drops
  const collectionUris = [
    {
      // Collection 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Internal Treasure/hash.json').uri, // TODO UNKNOWN
      price: reservePrice_common,
      collectionDesigner: ROUND_4_DESIGNERS.mar_guixa,
      amountToMintInCollection: 7,
      auctionIdToLink: auctionId_mar_guixa,
      rarity: 'Common',
      tokendIds: tokenId_goodbye_sun_internal_treasure,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 2 Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Serenity/hash.json').uri, // TODO UNKNOWN
      price: reservePrice2_semirare,
      collectionDesigner: ROUND_4_DESIGNERS.mar_guixa,
      amountToMintInCollection: 3,
      auctionIdToLink: auctionId_mar_guixa,
      rarity: 'Semi-Rare',
      tokendIds: tokenId_seeing_sun_serenity,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Low Life/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: ROUND_4_DESIGNERS.msistema,
      amountToMintInCollection: 7,
      auctionIdToLink: auctionId_msistema,
      rarity: 'Common',
      tokendIds: tokenId_krkn_low_life,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 4 Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Mercenary/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: ROUND_4_DESIGNERS.msistema,
      amountToMintInCollection: 3,
      auctionIdToLink: auctionId_msistema,
      rarity: 'Semi-Rare',
      tokendIds: tokenId_kero_mercenary,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 5 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Caterpillar/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: ROUND_4_DESIGNERS.alyona,
      amountToMintInCollection: 7,
      auctionIdToLink: auctionId_alyona,
      rarity: 'Common',
      tokendIds: tokenId_green_bean_caterpillar,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 6 Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Cocoon/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: ROUND_4_DESIGNERS.alyona,
      amountToMintInCollection: 3,
      auctionIdToLink: auctionId_alyona,
      rarity: 'Semi-Rare',
      tokendIds: tokenId_blue_slide_cocoon,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 7 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Cybernetic/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: ROUND_4_DESIGNERS.vitaly,
      amountToMintInCollection: 7,
      auctionIdToLink: auctionId_vitaly,
      rarity: 'Common',
      tokendIds: tokenId_deep_blue_cybernetic,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 8 Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Master Dreams/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: ROUND_4_DESIGNERS.vitaly,
      amountToMintInCollection: 3,
      auctionIdToLink: auctionId_vitaly,
      rarity: 'Semi-Rare',
      tokendIds: tokenId_purple_cells_master_dreams,
      tokenAmounts: tokenIdAmounts,
    }
  ]

  var arrayOfCollectionIdsDeployedForExclusiveNFT = [];
  for (let [index, collectionForMarketplace] of collectionUris.entries()) {
    console.log(`----------------------`);
    console.log(`Creating # ${collectionForMarketplace.amountToMintInCollection}  ${collectionForMarketplace.rarity} parent nfts with uri: ${collectionForMarketplace.uri} 
    and with child token ids of ${collectionForMarketplace.tokendIds} and amounts: ${collectionForMarketplace.tokenAmounts}`);
    console.log(`For the exclusive auction garment with id: ${collectionForMarketplace.auctionIdToLink}`);

    // Mint collection
     const tx = await garmentCollection.mintCollection(
        collectionForMarketplace.uri,
        collectionForMarketplace.collectionDesigner,
        collectionForMarketplace.amountToMintInCollection,
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

    // Approve the token for the marketplace contract
    console.log(`Approving Collection ${createCollectionId} for the marketplace contract...`)
    const allTokenIdsCreated = await garmentCollection.getCollection(createCollectionId);
    console.log(allTokenIdsCreated[0]);
    for (let [index, singleToken] of allTokenIdsCreated[0].entries()) {
      const approveSingleToken = await garment.approve(MARKETPLACE_ADDRESS, singleToken);
      await approveSingleToken.wait();
    }
    // Start a marketplace with that collection
    console.log(`Approvals Confirmed. Creating the marketplace for.. [${createCollectionId}]`)

    // Create a marketplace offer for this exclusive parent nft
    const createOfferTx = await marketplace.createOffer(
        createCollectionId, // Collection id
        collectionForMarketplace.price, // reservePrice for all collection items
        mainnet_startTime, // Marketplace buy offer available after start time
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
