const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuctionV2.json');
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTV2.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');
const {FUND_MULTISIG_ADDRESS} = require('../constants'); // This address you must be in control of so you can do token approvals

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
   const scr =  await accessControls.addSmartContractRole(AUCTION_ADDRESS);
   await scr.wait();

    const acr = await accessControls.addMinterRole(factory.address);
    await acr.wait();

    const acr2 = await accessControls.addMinterRole(deployerAddress);
    await acr2.wait();

   // OPTIONAL TODO use if needed
    const updateFee = await auction.updatePlatformFee('0');
    await updateFee.wait();

  //// SETTINGS

  const reservePrice = '0';

 // const testStartTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th only test
   const mainnet_startTime = '1623358800';   //  TODO update
   const mainnet_endTime = '1623187000'; //  TODO update

    // Approve for all
    const approveToken = await garment.setApprovalForAll(AUCTION_ADDRESS, true);
    await approveToken.wait();

    // Run 1 at a time in production, in case something drops
  const uris = [
      {
          // Auction 1 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Exclusive/INMC09/hash.json').uri,
          tokendIds: [],
          tokenAmounts: [],
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: FUND_MULTISIG_ADDRESS
      },
      {
          // Auction 2 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Exclusive/INMC10/hash.json').uri,
          tokendIds: [],
          tokenAmounts: [],
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: FUND_MULTISIG_ADDRESS
      },
      {
          // Auction 3 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Exclusive/INMC11/hash.json').uri,
          tokendIds: [],
          tokenAmounts: [],
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: FUND_MULTISIG_ADDRESS
      },
      {
          // Auction 4 Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/Minecraft/Exclusive/INMC12/hash.json').uri,
          tokendIds: [],
          tokenAmounts: [],
          price: reservePrice,
          auctionStartTime: mainnet_startTime,
          auctionEndTime: mainnet_endTime,
          designer: FUND_MULTISIG_ADDRESS
      }
  ]

  var arrayOfParents = [];
  for (let [index, auctionGarmentInfo] of uris.entries()) {
      console.log(`----------------------`);
      console.log(`Creating exclusive parent nft For uri: ${auctionGarmentInfo.uri} with child token ids of ${auctionGarmentInfo.tokendIds} and amounts: ${auctionGarmentInfo.tokenAmounts}`);
      const tx = await factory.mintParentWithoutChildren(
          auctionGarmentInfo.uri,
          auctionGarmentInfo.designer,
          // auctionGarmentInfo.tokendIds, // childTokenIds
          // auctionGarmentInfo.tokenAmounts, // childTokenAmounts
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

      // // Approve the token for the auction contract
      // console.log(`Approving ${createParentId} for the auction contract...`)
      //
      // const tx10 = await garment.approve(AUCTION_ADDRESS, createParentId);
      // await tx10.wait();
      //
      // // Start an auction with that garment
      // console.log(`ApprovalConfirmed. Creating the auction for.. [${createParentId}]`)

      // Create an auction for this exclusiveparent nft
      const auctionTx = await auction.createAuction(
          createParentId, // garmentTokenId
          auctionGarmentInfo.price, // reservePrice
          auctionGarmentInfo.auctionStartTime, // startTimestamp
          auctionGarmentInfo.auctionEndTime, // endTimestamp
          true // Mona payment
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
