const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxGarmentCollection.json');
const MarketplaceArtifact = require('../../artifacts/DigitalaxMarketplace.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');

const {ROUND_3_DESIGNERS} = require('../constants');

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
  const updateFee = await marketplace.updateMarketplacePlatformFee('420');
  await updateFee.wait();
  const updateDiscount = await marketplace.updateMarketplaceDiscountToPayInErc20('0');
  await updateDiscount.wait();


  const accessControls = new ethers.Contract(
      ACCESS_CONTROLS_ADDRESS,
      AccessControlsArtifact.abi,
      deployer
  );

  //Optional TODO decide if needed
//  await accessControls.addSmartContractRole(MARKETPLACE_ADDRESS);


  //// SETTINGS
  // fill in uris for the nfts
  const tokenId_astral_chrysalis =  ['143']; // on mainnet 63 TODO confirm, change for mainnet
  const tokenId_crux_firstarmor =  ['141']; // on mainnet 62 TODO confirm, change for mainnet
  const tokenId_gridded_green_imagineer =  ['138']; // on mainnet 78 TODO confirm, change for mainnet
  const tokenId_sit_in_green_freecolor =  ['139']; // on mainnet 79 TODO confirm, change for mainnet

  const tokenIdAmounts = ['1'];

  const reservePrice_chrysalis = '200000000000000000'; // TODO real price
  const reservePrice2_firstarmor = '400000000000000000'; // TODO real price
  const reservePrice3_imagineer = '200000000000000000'; // TODO real price
  const reservePrice4_freecolor = '400000000000000000'; // TODO real price

  const startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th

  //const mainnet_startTime = '1610740800'; // Jan 15, 8pm

  // Use the single auction id processed in the last script to build auction id specific collections in this script
  const auctionId_3dBehemoth = 223; // transfor TODO update from result of last script (important)
  const auctionId_yekaterina = 224; // harajuku TODO update from result of last script (important)

  // Next step is mint collections and open buy offers, run 1 at a time in production in case something drops
  const collectionUris = [
    {
      // Collection 1 Semirare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Chrysalis/hash.json').uri,
      price: reservePrice_chrysalis,
      collectionDesigner: ROUND_3_DESIGNERS._3dBehemoth,
      amountToMintInCollection: 3,
      auctionIdToLink: auctionId_3dBehemoth,
      rarity: 'Semi-Rare',
      tokendIds: tokenId_astral_chrysalis,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/First Armor/hash.json').uri,
      price: reservePrice2_firstarmor,
      collectionDesigner: ROUND_3_DESIGNERS._3dBehemoth,
      amountToMintInCollection: 7,
      auctionIdToLink: auctionId_3dBehemoth,
      rarity: 'Common',
      tokendIds: tokenId_crux_firstarmor,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 3 Semirare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Imagineer/hash.json').uri,
      price: reservePrice3_imagineer,
      collectionDesigner: ROUND_3_DESIGNERS.yekatarina,
      amountToMintInCollection: 3,
      auctionIdToLink: auctionId_yekaterina,
      rarity: 'Semi-Rare',
      tokendIds: tokenId_gridded_green_imagineer,
      tokenAmounts: tokenIdAmounts,
    },
    {
      // Collection 4 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Free Colour/hash.json').uri,
      price: reservePrice4_freecolor,
      collectionDesigner: ROUND_3_DESIGNERS.yekatarina,
      amountToMintInCollection: 7,
      auctionIdToLink: auctionId_yekaterina,
      rarity: 'Common',
      tokendIds: tokenId_sit_in_green_freecolor,
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
    await marketplace.createOffer(
        createCollectionId, // Collection id
        collectionForMarketplace.price, // reservePrice for all collection items
        startTime, // Marketplace buy offer available after start time
    );
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
