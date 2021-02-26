const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuction.json');
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');
const {ROUND_4_DESIGNERS} = require('../constants'); // This address you must be in control of so you can do token approvals

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
  const villain_garden = ['96']; // villain garden --> mainnet 96 TODO double check
  const axon_cells = ['82']; // axon cells --> mainnet 82 TODO double check
  const redemption_prima_flora = ['93']; // redemption prima flora --> mainnet 93 TODO double check
  const vector_half_floors = ['99']; // vector half floors --> mainnet 99 TODO double check
  const opnano_saturn = ['90']; // opnano saturn --> mainnet 90 TODO double check
  const big_shot_vnkr =  ['72']; // big shot vnkr --> mainnet 72 TODO double check
  const golden_spiral_peaches =  ['73']; // golden spiral peaches --> mainnet 73 TODO double check
  const elimination_walk_in_chaos =  ['83']; // elimination walk in chaos --> mainnet 83 TODO double check
  const butterfly_rainbow_wiggle =  ['61']; // butterfly rainbow wiggle --> mainnet 61 TODO double check
  const dress_child = ['102'];

  const tokenIdAmounts = ['1'];

  const reservePrice = '0';

 // const testStartTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th only test
   const mainnet_startTime = '1614135600';   // Feb 24, 0am utc TODO confirm
   const mainnet_endTime = '1614369600'; // Feb 26, 5pm utc TODO confirm

    // Run 1 at a time in production, in case something drops
  const uris = [
      {
          // Auction 1 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Villain/hash.json').uri,
          tokendIds: villain_garden,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.burak_dahan
      },
      {
          // Auction 2 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Axon/hash.json').uri,
          tokendIds: axon_cells,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.edward_harber
      },
      {
          // Auction 3 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Redemption/hash.json').uri,
          tokendIds: redemption_prima_flora,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.honorehl
      },
      {
          // Auction 4 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Vector/hash.json').uri,
          tokendIds: vector_half_floors,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.maria_ruano
      },
      {
          // Auction 5 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Opnano/hash.json').uri,
          tokendIds: opnano_saturn,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.ava_designers
      },
      {
          // Auction 6 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Big Shot/hash.json').uri,
          tokendIds: big_shot_vnkr,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.msistema,
      },
      {
          // Auction 7 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Golden Spiral/hash.json').uri,
          tokendIds: golden_spiral_peaches,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.mar_guixa
      },
      {
          // Auction 8 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Elimination/hash.json').uri,
          tokendIds: elimination_walk_in_chaos,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.vitaly,
      },
      {
          // Auction 9 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Butterfly/hash.json').uri,
          tokendIds: butterfly_rainbow_wiggle,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.alyona
      },
      {
          // Auction 10 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Dress/hash.json').uri,
          tokendIds: dress_child,
          tokenAmounts: tokenIdAmounts,
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: ROUND_4_DESIGNERS.dressX
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
