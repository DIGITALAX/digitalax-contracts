const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTV2.json');
const GarmentCollectionArtifact = require('../../artifacts/DigitalaxGarmentCollectionV2.json');
const DripMarketplaceArtifact = require('../../artifacts/DripMarketplace.json');
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

  const {ERC721_GARMENT_ADDRESS, GARMENT_COLLECTION_ADDRESS, DRIP_MARKETPLACE_ADDRESS, ACCESS_CONTROLS_ADDRESS} = process.env;
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
      DRIP_MARKETPLACE_ADDRESS,
      DripMarketplaceArtifact.abi,
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

  const reservePrice_cap = '50000000000000000000';
  const reservePrice_hoodie = '120000000000000000000';

 // const test_startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th

  const mainnet_startTime = '1624315636'; //  TODO confirm
  const mainnet_endTime = '1655866036'; //  TODO confirm

  // Use the single auction id processed in the last script to build auction id specific collections in this script


  // Next step is mint collections and open buy offers, run 1 at a time in production in case something drops
  const collectionUris = [
    // {
    //   // Aave ****
    //   // Cap 1 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Aave/Cap1/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //       100183,
    //     100100,
    //     100023,
    //     100034,
    //     100149,
    //     100160,
    //     100064
    //   ],
    // },
    //  {
    //   // Cap 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Aave/Cap2/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //       100140,
    //     100162,
    //     100178,
    //     100192,
    //     100185,
    //     100170
    //   ],
    // },
    //  {
    //   // Cap 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Aave/Cap3/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //       100059,
    //     100101,
    //     100117,
    //     100121,
    //     100137,
    //     100041
    //   ],
    // },
    // {
    //   // Hoodie 1 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Aave/Hoodie1/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //       100100,
    //     100065,
    //     100075
    //   ],
    // },
    // {
    //   // Hoodie 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Aave/Hoodie2/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //       100122,
    //     100132,
    //     100071
    //   ],
    // },
    // {
    //   // Hoodie 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Aave/Hoodie3/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //       100030,
    //     100150,
    //     100170
    //   ],
    // },
    // {
    //   // Bancor ****
    //   // Cap 1 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Bancor/Cap1/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100167,
    //     100023,
    //     100024,
    //     100067,
    //     100049,
    //     100119,
    //     100018,
    //     100094,
    //     100159
    //   ],
    // },
    // {
    //   // Cap 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Bancor/Cap2/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100135,
    //     100034,
    //     100025,
    //   ],
    // },
    // {
    //   // Cap 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Bancor/Cap3/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100166,
    //     100060,
    //     100133,
    //     100177,
    //     100187,
    //     100168,
    //     100049,
    //     100033,
    //     100015,
    //   ],
    // },
    // {
    //   // Hoodie 1 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Bancor/Hoodie1/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100184,
    //     100117,
    //     100113,
    //     100058,
    //     100041
    //   ],
    // },
    // {
    //   // Hoodie 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Bancor/Hoodie2/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100016,
    //     100040,
    //     100113,
    //     100184
    //   ],
    // },
    // {
    //   // Hoodie 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Bancor/Hoodie3/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100195,
    //     100152,
    //     100189,
    //   ],
    // },
    // {
    //   // POAP ****
    //   // Cap 1 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/POAP/Cap1/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100140,
    //     100175,
    //     100030,
    //     100031,
    //     100032,
    //     100033,
    //   ],
    // },
    // {
    //   // Cap 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/POAP/Cap2/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100066,
    //     100183,
    //     100026,
    //     100155,
    //   ],
    // },
    // {
    //   // Cap 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/POAP/Cap3/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100168,
    //     100059,
    //     100129,
    //     100071,
    //     100065,
    //   ],
    // },
    // {
    //   // Hoodie 1 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/POAP/Hoodie1/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100062,
    //     100061,
    //     100056,
    //   ],
    // },
    // {
    //   // Hoodie 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/POAP/Hoodie2/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100162,
    //     100048,
    //   ],
    // },
    // {
    //   // Hoodie 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/POAP/Hoodie3/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100183,
    //     100137,
    //     100018,
    //   ],
    // },
    // {
    //   // RARI ****
    //   // Cap 1 Common
    // uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Rari/Cap1/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100167,
    //     100073,
    //     100042,
    //     100166,
    //     100122,
    //     100122,
    //     100052,
    //   ],
    // },
    // {
    //   // Cap 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Rari/Cap2/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100067,
    //     100062,
    //     100053,
    //     100130,
    //   ],
    // },
    // {
    //   // Cap 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Rari/Cap3/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100042,
    //     100120,
    //     100118,
    //     100169,
    //   ],
    // },
    // {
    //   // Hoodie 1 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Rari/Hoodie1/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100193,
    //     100183,
    //     100146,
    //   ],
    // },
    // {
    //   // Hoodie 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Rari/Hoodie2/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100032,
    //     100185,
    //     100116,
    //     100133,
    //   ],
    // },
    // {
    //   // Hoodie 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Rari/Hoodie3/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100023,
    //     100027,
    //     100123
    //   ],
    // },
    // {
    //   // Ruler ****
    //   // Cap 1 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Ruler/Cap1/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100026,
    //     100041,
    //     100195,
    //     100135,
    //     100194,
    //     100055
    //
    //   ],
    // },
    // {
    //   // Cap 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Ruler/Cap2/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100044,
    //     100118,
    //     100074,
    //     100050,
    //     100049
    //   ],
    // },
    // {
    //   // Cap 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Ruler/Cap3/hash.json').uri,
    //   price: reservePrice_cap,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100017,
    //     100018,
    //     100030,
    //     100024,
    //     100182,
    //     100172
    //   ],
    // },
    // {
    //   // Hoodie 1 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Ruler/Hoodie1/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100095,
    //     100057
    //   ],
    // },
    // {
    //   // Hoodie 2 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Ruler/Hoodie2/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100191,
    //     100135,
    //     100072
    //   ],
    // },
    // {
    //   // Hoodie 3 Common
    //   uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Ruler/Hoodie3/hash.json').uri,
    //   price: reservePrice_hoodie,
    //   collectionDesigner: FUND_MULTISIG_ADDRESS,
    //   amountToMintInCollection: 200,
    //   auctionIdToLink: 1,
    //   rarity: 'Common',
    //   tokendIds: [
    //     100158,
    //     100017,
    //     100067,
    //   ],
    // },
    {
      // Pickle ****
      // Cap 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Pickle/Cap1/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100069,
        100136,
        100186,
        100087
      ],
    },
    {
      // Cap 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Pickle/Cap2/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100182,
        100111,
        100107
      ],
    },
    {
      // Cap 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Pickle/Cap3/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100031,
        100099,
        100017,
        100100,
        100105,
        100077,
        100094
      ],
    },
    {
      // Hoodie 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Pickle/Hoodie1/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100156,
        100142,
        100164
      ],
    },
    {
      // Hoodie 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Pickle/Hoodie2/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100166,
        100031
      ],
    },
    {
      // Hoodie 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Pickle/Hoodie3/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100095,
        100108,
        100089,
        100068
      ],
    },
    {
      // Instadapp ****
      // Cap 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Instadapp/Cap1/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100050,
        100091,
        100060
      ],
    },
    {
      // Cap 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Instadapp/Cap2/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100022,
        100105
      ],
    },
    {
      // Cap 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Instadapp/Cap3/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100075,
        100146,
        100176
      ],
    },
    {
      // Hoodie 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Instadapp/Hoodie1/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100090,
        100105,
        100175
      ],
    },
    {
      // Hoodie 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Instadapp/Hoodie2/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100147,
        100114,
        100149
      ],
    },
    {
      // Hoodie 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Instadapp/Hoodie3/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100099,
        100124,
        100113
      ],
    },
    {
      // Fei ****
      // Cap 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/FeiProtocol/Cap1/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100128,
        100014,
        100070
      ],
    },
    {
      // Cap 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/FeiProtocol/Cap2/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100181,
        100071,
        100016
      ],
    },
    {
      // Cap 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/FeiProtocol/Cap3/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100130,
        100152
      ],
    },
    {
      // Hoodie 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/FeiProtocol/Hoodie1/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100029,
        100097,
        100077
      ],
    },
    {
      // Hoodie 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/FeiProtocol/Hoodie2/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100061,
        100058,
        100088
      ],
    },
    {
      // Hoodie 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/FeiProtocol/Hoodie3/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100040,
        100084,
        100066
      ],
    },
    {
      // Polygon ****
      // Cap 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Polygon/Cap1/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100124,
        100108
      ],
    },
    {
      // Cap 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Polygon/Cap2/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100094,
        100052,
        100040,
        100122
      ],
    },
    {
      // Cap 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Polygon/Cap3/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100110,
        100163,
        100193,
        100127,
        100059
      ],
    },
    {
      // Hoodie 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Polygon/Hoodie1/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100028,
        100086,
        100103
      ],
    },
    {
      // Hoodie 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Polygon/Hoodie2/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100122,
        100087,
        100077
      ],
    },
    {
      // Hoodie 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Polygon/Hoodie3/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100140,
        100071,
        100124
      ],
    },
    {
      // Opyn ****
      // Cap 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Opyn/Cap1/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100121,
        100034
      ],
    },
    {
      // Cap 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Opyn/Cap2/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100121
      ],
    },
    {
      // Cap 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Opyn/Cap3/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100128
      ],
    },
    {
      // Hoodie 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Opyn/Hoodie1/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100161,
        100169,
        100073
      ],
    },
    {
      // Hoodie 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Opyn/Hoodie2/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100086,
        100162,
        100146
      ],
    },
    {
      // Hoodie 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Opyn/Hoodie3/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100041,
        100026,
      ],
    },
    {
      // Maker ****
      // Cap 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/MakerDAO/Cap1/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100128,
        100193,
        100194,
        100166,
        100059
      ],
    },
    {
      // Cap 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/MakerDAO/Cap2/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100053,
        100060,
        100052,
        100044
      ],
    },
    {
      // Cap 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/MakerDAO/Cap3/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100151,
        100123,
        100118,
        100168
      ],
    },
    {
      // Hoodie 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/MakerDAO/Hoodie1/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100119,
        100181,
        100086
      ],
    },
    {
      // Hoodie 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/MakerDAO/Hoodie2/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100162,
        100168,
        100163,
        100167
      ],
    },
    {
      // Hoodie 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/MakerDAO/Hoodie3/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100151,
        100194,
        100171
      ],
    },
    {
      // ForceDAO ****
      // Cap 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/ForceDAO/Cap1/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100160,
        100165,
        100119,
        100051,
        100054
      ],
    },
    {
      // Cap 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/ForceDAO/Cap2/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100025,
        100144
      ],
    },
    {
      // Cap 3 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/ForceDAO/Cap3/hash.json').uri,
      price: reservePrice_cap,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100030,
        100068,
        100018
      ],
    },
    {
      // Hoodie 1 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/ForceDAO/Hoodie1/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
        100186,
        100136,
        100170,
        100170,
        100148
      ],
    },
    {
      // Hoodie 2 Common
      uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/ForceDAO/Hoodie2/hash.json').uri,
      price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
          100166,
        100185,
        100052]
    },
  {
    // Hoodie 3 Common
    uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/ForceDAO/Hoodie3/hash.json').uri,
        price: reservePrice_hoodie,
      collectionDesigner: FUND_MULTISIG_ADDRESS,
      amountToMintInCollection: 200,
      auctionIdToLink: 1,
      rarity: 'Common',
      tokendIds: [
    100090,
    100109,
    100162
  ]
  }

  ];

    // Approve for all
    const approveToken = await garment.setApprovalForAll(DRIP_MARKETPLACE_ADDRESS, true);
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
        collectionForMarketplace.price, // reservePrice for all collection items
        mainnet_startTime, // Marketplace buy offer available after start time
        mainnet_endTime, // Marketplace buy offer available after start time
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
