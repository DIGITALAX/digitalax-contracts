const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxGarmentCollection.json');
const MarketplaceArtifact = require('../../artifacts/DigitalaxMarketplace.json');
const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  const {ERC721_GARMENT_ADDRESS, GARMENT_COLLECTION_ADDRESS, MARKETPLACE_ADDRESS} = process.env;
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

  // await accessControls.addSmartContractRole(AUCTION_ADDRESS);

  //// SETTINGS
  const designer = FUND_MULTISIG_ADDRESS;
  const beneficiary = FUND_MULTISIG_ADDRESS;
  // fill in uris for the nfts
  const testTokenIds =  ['134', '135', '136'];
  const testTokenIdAmounts = ['1', '1', '1'];
  const reservePrice = '1000000000000000';
  const reservePrice2 = '2000000000000000';

  const startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th

  // Use the single auction id processed in the last script to build auction id specific collections in this script
  const auctionId = 168

  // Next step is mint collections and open buy offers
  const collectionUris = [
    {
      // Collection 1 Tester Semirare
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/tester_semirare/hash.json').uri,
      price: reservePrice2,
      collectionDesigner: designer,
      amountToMintInCollection: 3,
      auctionIdToLink: auctionId,
      rarity: 'Semi-Rare',
      tokendIds: testTokenIds,
      tokenAmounts: testTokenIdAmounts,
    },
    {
      // Collection 2 Tester Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/tester_common/hash.json').uri,
      price: reservePrice,
      collectionDesigner: designer,
      amountToMintInCollection: 7,
      auctionIdToLink: auctionId,
      rarity: 'Common',
      tokendIds: testTokenIds,
      tokenAmounts: testTokenIdAmounts,
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
