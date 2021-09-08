const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTV2.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxGarmentCollectionV2.json');
const DigitalaxMarketplaceV2Artifact = require('../../artifacts/DigitalaxMarketplaceV2.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');

const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const ROUND_15_DESIGNERS = {
    adam: '0x817ae7c66661801FD260d3b9f3A7610ffA208A90',
    aisha: '0x9c8381D02A1c38932C2aCDc33953BD6f1dd0e1db',
    alexander: '0x5c4FEcDB7788190dDdA685dB29940569eC28CA6D',
    alyona: '0x6C3859f7E64227164c8b93CE68f0473f32802d3A',
    annguyen: '0xB8eE29bb3c72c50A1fD189d526B5394B85cAC34d',
    ava3d: '0xf8187F711aEAc7f47074bd856ce922D1a082E68D',
    blade: '0x36B0FFAdE40B6F31e0F8f97543b08cBd581FeA3b',
    catherine: '0xD4a066D39Dbb9502C410D08B62342f5fCC84cc6D',
    cryptodeevo: '0x08BAdc9cA8faa6C145a1ac395c40DC340665e3f6',
    cryptsie: '0x89c96a9d9b43238db1f35D2297483d6964a56DFE',
    domingo: '0x6A98ca44a35aDBdc0d4cD91E06453cB67a2DD63A',
    edward: '0xd6eB4a00373db9B0DC6E8f6684713cFE121C3B3c',
    enki: '0xa46E5042Eb08d95B80DD593B4D4718F51B01b9C8',
    katriane:'0x69e04CF8C047008B3B4EfD277da04FD3E49db0cb',
    kerkinitida: '0x2c47d28faBE975c01bA781Bf543Ba461cFd155a5',
    kimajak: '0x1d66A93d412B7E24d938Bd7E5bb0693B8178818A',
    ksenia: '0x2dBb5c3a47191dC0218524ef9301dB346f5424c5',
    lucii: '0x0313b00C066Ba9e9791Cb4F7064C0A1e8A230DaD',
    majestic: '0x8b66eEE3347E868e6609cc823c3E9657DF2f75d9',
    maria: '0xCAbDD947c827A593CA6CC3c1f0A3D00Da2dAc8c0',
    myse: '0x341d9DB2F4FD8106F1F4bF22b3DCbF838bc40d8a',
    oneoone:'0x8edd4e17241332B5dad37Af730009E2CF78A558e',
    paola: '0xdaCB9699094abeC66244f193aB6Cb901Ee286cEd',
    porka: '0x6e7E67af78B44ba67eEeD29E6Ccfd98d0B2e18BE',
    ros3d: '0x5f2a0aE12f34b08F070230eB6Bd456A6db08221f',
    stella: '0x83E2B1525becEeE48Bc00ABb192813859dF6b7A6',
    tania: '0x0F6837d61b06EA9f8a901fB54CBc73978dEC456B',
    xenotech: '0xCa47339b4EE5A97e250F64046052132bd8c8544c',
  }

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
      DigitalaxMarketplaceV2Artifact.abi,
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
  // const acr = await accessControls.addSmartContractRole(DRIP_MARKETPLACE_ADDRESS);
  // await acr.wait();

  // const scr =  await accessControls.addSmartContractRole(GARMENT_COLLECTION_ADDRESS);
  // await scr.wait();
  //
  // const acr2 = await accessControls.addMinterRole(GARMENT_COLLECTION_ADDRESS);
  // await acr2.wait();


  //// SETTINGS

  const reservePrice_conversion = '1886792452830188'; // $1 of mona

 // const test_startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th

  const mainnet_startTime = '1629738000';
  const mainnet_endTime = '1655866036';

  // Use the single auction id processed in the last script to build auction id specific collections in this script


  // Next step is mint collections and open buy offers, run 1 at a time in production in case something drops
  const collectionUris = [
    {
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/wildWeb3/Design1/hash.json').uri,
      price: 300, // $300 - fill in usd cost
      collectionDesigner: ROUND_15_DESIGNERS.xenotech, // fill in with right designer
      amountToMintInCollection: 100, // Fill how many
      auctionIdToLink: 1,
      rarity: 'Semi-Rare', // Check the rarity
      tokendIds: [], // If there are known materials token ids, add them here.
      digitalaxFee: 15, // Digitalax fee is 15%
    },
    {
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/wildWeb3/Design2/hash.json').uri,
      price: 300, // $300 - fill in usd cost
      collectionDesigner: ROUND_15_DESIGNERS.xenotech, // fill in with right designer
      amountToMintInCollection: 100, // Fill
      auctionIdToLink: 1,
      rarity: 'Semi-Rare', // Check the rarity
      tokendIds: [], // If there are known materials token ids, add them here.
      digitalaxFee: 15, // Digitalax fee is 15%
    },
    {
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/wildWeb3/Design3/hash.json').uri,
      price: 300, // $300 - fill in usd cost
      collectionDesigner: ROUND_15_DESIGNERS.xenotech, // fill in with right designer
      amountToMintInCollection: 100, // Fill
      auctionIdToLink: 1,
      rarity: 'Semi-Rare', // Check the rarity
      tokendIds: [], // If there are known materials token ids, add them here.
      digitalaxFee: 15, // Digitalax fee is 15%
    },
    {
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/wildWeb3/Design4/hash.json').uri,
      price: 300, // $300 - fill in usd cost
      collectionDesigner: ROUND_15_DESIGNERS.xenotech, // fill in with right designer
      amountToMintInCollection: 100, // Fill
      auctionIdToLink: 1,
      rarity: 'Semi-Rare', // Check the rarity
      tokendIds: [], // If there are known materials token ids, add them here.
      digitalaxFee: 15, // Digitalax fee is 15%
    },

  ];

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
    console.log(`uri: ${collectionForMarketplace.uri}`);

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
    if(numberOfLoops > 0){
      while(numberOfLoops--){
        const tx2 = await garmentCollection.mintMoreNftsOnCollection(
            createCollectionId,
            MAX_NFT_SINGLE_TX,
            collectionForMarketplace.tokendIds, // childTokenIds
            new Array(collectionForMarketplace.tokendIds.length).fill(1), // childTokenAmounts
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
        collectionForMarketplace.price * reservePrice_conversion, // reservePrice for all collection items
        mainnet_startTime, // Marketplace buy offer available after start time
        mainnet_endTime, // Marketplace buy offer available after start time
        collectionForMarketplace.digitalaxFee * 10, // The digitalax fee.
        0,
        collectionForMarketplace.amountToMintInCollection, // max amount
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
