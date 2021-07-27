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

  const reservePrice_cap = '80000000000000000000';
  const reservePrice_hoodie = '170000000000000000000';
  const reservePrice_shirt = '80000000000000000000';
  const reservePrice_hoodie2 = '12000000000000000000';

  const reserve_cap_ids = [
    21, 22, 61, 65, 66, 161, 71, 72, 73, 77, 78, 79, 87, 88, 89, 97, 98, 99, 103, 104, 108,
    112, 113, 114, 118, 119, 120, 125, 126, 127, 131, 132, 133, 137, 138, 139
  ];
  const reserve_hoodie_ids = [
    175, 63, 64, 68, 156, 157, 74, 75, 76, 80, 81, 82, 93, 94, 95, 158, 159, 102, 109, 110, 111,
    115, 116, 117, 121, 122, 123, 128, 129, 130, 134, 135, 136, 140, 141, 142
  ];
  const reserve_shirt_ids = [
    165, 166, 168
  ];
  const reserve_hoodie2_ids = [
    162, 163, 164
  ];

  const mainnet_startTime = '1624315636'; //  TODO confirm
  const mainnet_endTime = '1655866036'; //  TODO confirm


  // Approve for all
  const approveToken = await garment.setApprovalForAll(DRIP_MARKETPLACE_ADDRESS, true);
  await approveToken.wait();

  // Start a marketplace with that collection
  console.log(`Approvals Confirmed. Creating the marketplace offers`)

  var arrayOfCollectionIdsDeployedForExclusiveNFT = [];
  for (let i = 0; i < reserve_cap_ids.length; i += 1) {
    const createOfferTx = await marketplace.createOffer(
        reserve_cap_ids[i], // Collection id
        reservePrice_cap, // reservePrice for all collection items
        mainnet_startTime, // Marketplace buy offer available after start time
        mainnet_endTime, // Marketplace buy offer available after start time
        0,
        100
    );
  
    await createOfferTx.wait();
    console.log(`--Marketplace created for collection--`);
    console.log(`----------------------`);
  }

  for (let i = 0; i < reserve_hoodie_ids.length; i += 1) {
    const createOfferTx = await marketplace.createOffer(
        reserve_hoodie_ids[i], // Collection id
        reservePrice_hoodie, // reservePrice for all collection items
        mainnet_startTime, // Marketplace buy offer available after start time
        mainnet_endTime, // Marketplace buy offer available after start time
        0,
        100
    );
  
    await createOfferTx.wait();
    console.log(`--Marketplace created for collection--`);
    console.log(`----------------------`);
  }

  for (let i = 0; i < reserve_shirt_ids.length; i += 1) {
    const createOfferTx = await marketplace.createOffer(
        reserve_shirt_ids[i], // Collection id
        reservePrice_shirt, // reservePrice for all collection items
        mainnet_startTime, // Marketplace buy offer available after start time
        mainnet_endTime, // Marketplace buy offer available after start time
        0,
        100
    );
  
    await createOfferTx.wait();
    console.log(`--Marketplace created for collection--`);
    console.log(`----------------------`);
  }

  for (let i = 0; i < reserve_hoodie2_ids.length; i += 1) {
    const createOfferTx = await marketplace.createOffer(
        reserve_hoodie2_ids[i], // Collection id
        reservePrice_hoodie2, // reservePrice for all collection items
        mainnet_startTime, // Marketplace buy offer available after start time
        mainnet_endTime, // Marketplace buy offer available after start time
        0,
        100
    );
  
    await createOfferTx.wait();
    console.log(`--Marketplace created for collection--`);
    console.log(`----------------------`);
  }
    // Create a marketplace offer for this exclusive parent nft
  // }

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
