const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuction.json');
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');
const {ROUND_3_DESIGNERS} = require('../constants'); // This address you must be in control of so you can do token approvals

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying parents and setting up auction with the following address:',
    deployerAddress
  );

  const {GARMENT_FACTORY_ADDRESS, AUCTION_ADDRESS, ERC721_GARMENT_ADDRESS, ACCESS_CONTROLS_ADDRESS} = process.env;
  console.log(`GARMENT_FACTORY_ADDRESS found [${GARMENT_FACTORY_ADDRESS}]`);

  const factory = new ethers.Contract(
    GARMENT_FACTORY_ADDRESS,
    FactoryArtifact.abi,
    deployer
  );

  const garment = new ethers.Contract(
        ERC721_GARMENT_ADDRESS,
        GarmentArtifact.abi,
        deployer
  );

  const auction = new ethers.Contract(
        AUCTION_ADDRESS,
        AuctionArtifact.abi,
        deployer
   );

    const accessControls = new ethers.Contract(
        ACCESS_CONTROLS_ADDRESS,
        AccessControlsArtifact.abi,
        deployer
    );

    // OPTIONAL TODO use if needed
   // await accessControls.addSmartContractRole(AUCTION_ADDRESS);
   // OPTIONAL TODO use if needed
   // const updateFee = await auction.updatePlatformFee('500');
   // await updateFee.wait();

  //// SETTINGS
  // fill in uris for the nfts
  const restingreen_harajuku =  ['80']; // rest in green harajuku --> mainnet 80 TODO confirm
  const apis_mechanicus_transformation =  ['64']; // apis mechanicus --> mainnet 64 TODO confirm
  const stripes_fewcharm =  ['55']; // stripes, few charm --> mainnet 55 TODO confirm
  const turnheartupsidedown_cosmicone =  ['66']; // turn heart updside down, cosmic one --> mainnet 66 TODO confirm
  const tokenIdAmounts = ['1'];

  const reservePrice = '0';
  const reservePrice2 = '0';

//  const testStartTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th only test
   const mainnet_startTime = '1610740800'; // Jan 15, 8pm utc TODO confirm
   const mainnet_endTime = '1611086400';   // Jan 19, 8pm utc TODO confirm

    // Run 1 at a time in production, in case something drops
  const uris = [
      {
          // Auction 1 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Transformation/hash.json').uri,
          tokendIds: apis_mechanicus_transformation,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_3_DESIGNERS._3dBehemoth
      },
      {
          // Auction 2 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Harajuku Essence/hash.json').uri,
          tokendIds: restingreen_harajuku,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice2,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_3_DESIGNERS.yekatarina,
      },
      {
          // Auction 3 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Few Charm/hash.json').uri,
          tokendIds: stripes_fewcharm,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_3_DESIGNERS.lorena
      },
      {
          // Auction 4 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Cosmic One/hash.json').uri,
          tokendIds: turnheartupsidedown_cosmicone,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice2,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_3_DESIGNERS.nina,
      }
  ]

  var arrayOfParents = [];
  for (let [index, auctionGarmentInfo] of uris.entries()) {
      console.log(`----------------------`);
      console.log(`Creating exclusive parent nft For uri: ${auctionGarmentInfo.uri} with child token ids of ${auctionGarmentInfo.tokendIds} and amounts: ${auctionGarmentInfo.tokenAmounts}`);
      const tx = await factory.mintParentWithChildren(
          auctionGarmentInfo.uri,
          auctionGarmentInfo.designer,
          auctionGarmentInfo.tokendIds, // childTokenIds
          auctionGarmentInfo.tokenAmounts, // childTokenAmounts
          deployerAddress, // Who receives nft and can approve (beneficiary), should be deployer address
        );

      const createParentId = await new Promise((resolve, reject) => {
        factory.on('GarmentCreated',
            async (garmentTokenId, event) => {
              const block = await event.getBlock();
              console.log(`at time ${block.timestamp} for token id ${garmentTokenId}`);
              resolve(garmentTokenId);
            });
      });

      await tx.wait();
      arrayOfParents.push(createParentId.toString());

      console.log(`-`);

      // Approve the token for the auction contract
      console.log(`Approving ${createParentId} for the auction contract...`)

      const tx10 = await garment.approve(AUCTION_ADDRESS, createParentId);
      await tx10.wait();

      // Start an auction with that garment
      console.log(`ApprovalConfirmed. Creating the auction for.. [${createParentId}]`)

      // Create an auction for this exclusiveparent nft
      await auction.createAuction(
          createParentId, // garmentTokenId
          auctionGarmentInfo.price, // reservePrice
          auctionGarmentInfo.auctionStartTime, // startTimestamp
          auctionGarmentInfo.auctionEndTime // endTimestamp
      );

      console.log(`----------------------`);
  }

  console.log('The parent nfts with auctions created for them are as follows: ');
  console.log(arrayOfParents);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
