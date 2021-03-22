const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxGarmentCollection.json');
const MarketplaceArtifact = require('../../artifacts/DigitalaxMarketplace.json');
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
  const acr = await accessControls.addSmartContractRole(MARKETPLACE_ADDRESS);
  await acr.wait();

  const scr =  await accessControls.addSmartContractRole(GARMENT_COLLECTION_ADDRESS);
  await scr.wait();

  const acr2 = await accessControls.addMinterRole(GARMENT_COLLECTION_ADDRESS);
  await acr2.wait();


  //// SETTINGS

  const reservePrice_common = '6200000000000000'; // Reduced 10x
  const reservePrice2_semirare = '57000000000000000'; // Reduced 10x

 // const test_startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th

  const mainnet_startTime = '1616439400'; //  TODO confirm

  // Use the single auction id processed in the last script to build auction id specific collections in this script

   const auctionId_lockdown = 3; // TODO update from result of last script (important)
   const auctionId_pluto = 4; // TODO update from result of last script (important)
   const auctionId_prima = 5; // TODO update from result of last script (important)
   const auctionId_witchdoctor = 108; // TODO update from result of last script (important)

  // Next step is mint collections and open buy offers, run 1 at a time in production in case something drops
  const collectionUris = [
      {
     // Collection 2 Semi-Rare
     uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Among Us/Semi-Rare/CC Glastonbury Skin/hash.json').uri,
     price: reservePrice2_semirare,
     collectionDesigner: FUND_MULTISIG_ADDRESS,
     amountToMintInCollection: 64,
     auctionIdToLink: auctionId_lockdown,
     rarity: 'Semi-Rare',
     tokendIds: [],
     tokenAmounts: [],
   },
    {
      // Collection 4 Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Among Us/Semi-Rare/CC Powder Skin/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 64,
      auctionIdToLink: auctionId_pluto,
      rarity: 'Semi-Rare',
      tokendIds: [],
      tokenAmounts: [],
    },
    {
      // Collection 6 Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Among Us/Semi-Rare/CC Renegade Skin/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 64,
      auctionIdToLink: auctionId_prima,
      rarity: 'Semi-Rare',
      tokendIds: [],
      tokenAmounts: [],
    },

    {
      // Collection 8 Semi-Rare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Among Us/Semi-Rare/CC Undercover Skin/hash.json').uri,
      price: reservePrice2_semirare,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 64,
      auctionIdToLink: auctionId_witchdoctor,
      rarity: 'Semi-Rare',
      tokendIds: [],
      tokenAmounts: [],
    },
    {
      // Collection 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Among Us/Common/CC Aciddrop Skin/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 128,
      auctionIdToLink: auctionId_lockdown,
      rarity: 'Common',
      tokendIds: [],
      tokenAmounts: [],
    },
    {
      // Collection 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Among Us/Common/CC Ranger Skin/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 128,
      auctionIdToLink: auctionId_pluto,
      rarity: 'Common',
      tokendIds: [],
      tokenAmounts: [],
    },
    {
      // Collection 5 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Among Us/Common/CC Stealth Skin/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 128,
      auctionIdToLink: auctionId_prima,
      rarity: 'Common',
      tokendIds: [],
      tokenAmounts: [],
    },
    {
      // Collection 7 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Among Us/Common/CC Utility Skin/hash.json').uri,
      price: reservePrice_common,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 128,
      auctionIdToLink: auctionId_witchdoctor,
      rarity: 'Common',
      tokendIds: [],
      tokenAmounts: [],
    },

    {
      // Collection 9 Semi-Rare PAC
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Among Us/Semi-Rare/PAC/hash.json').uri,
      price: '2000000000000000000',
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 20,
      auctionIdToLink: auctionId_witchdoctor,
      rarity: 'Semi-Rare',
      tokendIds: [],
      tokenAmounts: [],
    }

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
        0,
        0
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
