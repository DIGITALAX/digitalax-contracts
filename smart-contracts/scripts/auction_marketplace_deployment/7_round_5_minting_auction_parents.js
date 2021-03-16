const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuction.json');
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');
const {ROUND_5_DESIGNERS} = require('../constants'); // This address you must be in control of so you can do token approvals

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
  const RTFK1_child =  ['87']; // --> mainnet 87 TODO double check
  const RTFK2_child =  ['86']; // --> mainnet 86 TODO double check
  const RTFK3_child =  ['85']; // --> mainnet 85 TODO double check
  const RTFK4_child =  ['84']; // --> mainnet 84 TODO double check

  const tokenIdAmounts = ['1'];

  const reservePrice = '0';

 // const testStartTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th only test
   const mainnet_startTime = '1613678400';   // Feb 18, 5pm utc TODO confirm
   const mainnet_endTime = '1614272400'; // Feb 25, 5pm utc TODO confirm

    // Run 1 at a time in production, in case something drops
  const uris = [
      {
          // Auction 1 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/RTFKT1/hash.json').uri,
          tokendIds: RTFK1_child,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_5_DESIGNERS.rtfkt
      },
      {
          // Auction 2 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/RTFKT2/hash.json').uri,
          tokendIds: RTFK2_child,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_5_DESIGNERS.rtfkt
      },
      {
          // Auction 3 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/RTFKT3/hash.json').uri,
          tokendIds: RTFK3_child,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_5_DESIGNERS.rtfkt
      },
      {
          // Auction 4 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/RTFKT4/hash.json').uri,
          tokendIds: RTFK4_child,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_5_DESIGNERS.rtfkt
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
      const auctionTx = await auction.createAuction(
          createParentId, // garmentTokenId
          auctionGarmentInfo.price, // reservePrice
          auctionGarmentInfo.auctionStartTime, // startTimestamp
          auctionGarmentInfo.auctionEndTime // endTimestamp
      );

      await auctionTx.wait();

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
