const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTV2.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxGarmentCollectionV2.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuctionV2.json');
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

  const {ERC721_GARMENT_ADDRESS, AUCTION_ADDRESS, GARMENT_COLLECTION_ADDRESS, ACCESS_CONTROLS_ADDRESS} = process.env;
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

  const auction = new ethers.Contract(
      AUCTION_ADDRESS,
      AuctionArtifact.abi,
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
  //
  // //Optional TODO decide if needed
  // const acr = await accessControls.addSmartContractRole(MARKETPLACE_ADDRESS);
  // await acr.wait();

  // const scr =  await accessControls.addSmartContractRole(GARMENT_COLLECTION_ADDRESS);
  // await scr.wait();
  //
  // const acr2 = await accessControls.addMinterRole(GARMENT_COLLECTION_ADDRESS);
  // await acr2.wait();


  //// SETTINGS

  const reservePrice = '0';


  // const test_startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th

  const mainnet_startTime = '1629738000';
  const mainnet_endTime = '1630065600';

  // Use the single auction id processed in the last script to build auction id specific collections in this script
  const ROUND_15_DESIGNERS = {
    adam: '0x817ae7c66661801FD260d3b9f3A7610ffA208A90',
    aisha: '0x9c8381D02A1c38932C2aCDc33953BD6f1dd0e1db',
    alexander: '0x5c4FEcDB7788190dDdA685dB29940569eC28CA6D',
    alyona: '0x6C3859f7E64227164c8b93CE68f0473f32802d3A',
    annguyen: '0xB8eE29bb3c72c50A1fD189d526B5394B85cAC34d',
    ava3d: '0xf8187F711aEAc7f47074bd856ce922D1a082E68D',
    ksenia: '0x2dBb5c3a47191dC0218524ef9301dB346f5424c5',
    lucii: '0x0313b00C066Ba9e9791Cb4F7064C0A1e8A230DaD',
    maria: '0xCAbDD947c827A593CA6CC3c1f0A3D00Da2dAc8c0',
    paola: '0xdaCB9699094abeC66244f193aB6Cb901Ee286cEd',
    ros3d: '0x5f2a0aE12f34b08F070230eB6Bd456A6db08221f',
    xenotech: '0xCa47339b4EE5A97e250F64046052132bd8c8544c',
    myse: '0x341d9DB2F4FD8106F1F4bF22b3DCbF838bc40d8a',
    // TODO
    edward: '',
    katerina: '',
    stella: '',
    kimajak: '',
  }
  // Next step is mint collections and open buy offers, run 1 at a time in production in case something drops
  const collectionUris = [
    {
      // DAO Auction ****
      // Design 1
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Adam/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.adam,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 1
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Aisha/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.aisha,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 1
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Alexander/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.alexander,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 1
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Alyona/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.alyona,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 2
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/AnNguyen/Design1/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.annguyen,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 2
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/AnNguyen/Design2/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.annguyen,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 3
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Ava3D/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.ava3d,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 4
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Edward/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.edward,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Crazy Shoes ****
      // Design 1
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/kimajak/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.kimajak,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 2
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Ksenia/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.ksenia,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 3
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/LUCII/Design1/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.lucii,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 3
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/LUCII/Design2/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.lucii,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Haute Couture
      // Design 1
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Maria/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.maria,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 2
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Myse/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.myse,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 3
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Paola/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.paola,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      // Design 4
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Ros3D/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.ros3d,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
      tokendIds: [],
    },
    {
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Stella/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.stella,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
    }, {
      // Wild Web3
      // Design 1
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Xenotech/hash.json').uri,
      price: reservePrice,
      collectionDesigner: ROUND_15_DESIGNERS.xenotech,
      amountToMintInCollection: 1,
      auctionIdToLink: 1,
      rarity: 'Exclusive',
    },
  ];

  // Approve for all
  const approveToken = await garment.setApprovalForAll(AUCTION_ADDRESS, true);
  await approveToken.wait();

  // Start a marketplace with that collection
  console.log(`Approvals Confirmed. Creating the auction offers`)

  var arrayOfCollectionIdsDeployedForExclusiveNFT = [];
  for (let [index, collectionForMarketplace] of collectionUris.entries()) {
    console.log(`----------------------`);
    console.log(`Creating # ${collectionForMarketplace.amountToMintInCollection}  ${collectionForMarketplace.rarity} parent nfts with uri: ${collectionForMarketplace.uri}
    and with child token ids of 0`);
    console.log(`For the exclusive auction garment with id: ${collectionForMarketplace.auctionIdToLink}`);
    console.log(`uri: ${collectionForMarketplace.uri}`);

    let amountToMintInitially = collectionForMarketplace.amountToMintInCollection;
    let numberOfLoops = 0;
    if (amountToMintInitially > MAX_NFT_SINGLE_TX) {
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
        new Array(collectionForMarketplace.tokendIds.length).fill(1)
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
    if (numberOfLoops > 0) {
      while (numberOfLoops--) {
        const tx2 = await garmentCollection.mintMoreNftsOnCollection(
            createCollectionId,
            MAX_NFT_SINGLE_TX,
            [],    // collectionForMarketplace.tokendIds, // childTokenIds
            [] // new Array(collectionForMarketplace.tokendIds.length).fill(1), // childTokenAmounts
        );
        await tx2.wait();
      }
    }

    // Approve the token for the marketplace contract
    console.log(`Approving Collection ${createCollectionId} for the marketplace contract...`)
    const allTokenIdsCreated = await garmentCollection.getCollection(createCollectionId);
    console.log(allTokenIdsCreated[0]);


    // Create an auction for this exclusiveparent nft
    const auctionTx = await auction.createAuction(
        allTokenIdsCreated[0][0], // garmentTokenId
        0, // reservePrice
        mainnet_startTime, // startTimestamp
        mainnet_endTime, // endTimestamp
        true // Mona payment
    );

    await auctionTx.wait();


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
