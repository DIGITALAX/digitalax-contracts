const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuction.json');
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying parents and setting up auction with the following address:',
    deployerAddress
  );

  const {GARMENT_FACTORY_ADDRESS, AUCTION_ADDRESS, ERC721_GARMENT_ADDRESS} = process.env;
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

  // await accessControls.addSmartContractRole(AUCTION_ADDRESS);

  //// SETTINGS
  const designer = FUND_MULTISIG_ADDRESS;
  const beneficiary = FUND_MULTISIG_ADDRESS
  // fill in uris for the nfts
  const testTokenIds =  ['128', '129', '130'];
  const testTokenIdAmounts = ['1', '1', '1'];
  const reservePrice = '10000000000000000';
  const startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th
  const endTime = '1614556800';   // march 1

  const uris = [
      {
          // Auction 1 Tester Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/tester_exclusive/hash.json').uri,
          tokendIds: testTokenIds,
          tokenAmounts: testTokenIdAmounts,
          price: reservePrice,
          auctionStartTime: startTime,
          auctionEndTime: endTime,
      },
      {
          // Auction 2 Tester Exclusive
          uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/tester_exclusive/hash.json').uri,
          tokendIds: testTokenIds,
          tokenAmounts: testTokenIdAmounts,
          price: reservePrice,
          auctionStartTime: startTime,
          auctionEndTime: endTime,
      }
  ]

  var arrayOfParents = [];
  for (let [index, auctionGarmentInfo] of uris.entries()) {
      console.log(`----------------------`);
      console.log(`Creating exclusive parent nft For uri: ${auctionGarmentInfo.uri} with child token ids of ${auctionGarmentInfo.tokendIds} and amounts: ${auctionGarmentInfo.tokenAmounts}`);
      const tx = await factory.mintParentWithChildren(
          auctionGarmentInfo.uri,
          designer,
          auctionGarmentInfo.tokendIds, // childTokenIds
          auctionGarmentInfo.tokenAmounts, // childTokenAmounts
          beneficiary,
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
