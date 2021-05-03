
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTv2.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');
const {FUND_MULTISIG_ADDRESS} = require('../constants'); // This address you must be in control of so you can do token approvals

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying parents and setting up auction with the following address:',
    deployerAddress
  );


  MAX_NFT_SINGLE_TX = 20;

  const {ERC721_GARMENT_ADDRESS} = process.env;

    console.log('garment address is');
    console.log(ERC721_GARMENT_ADDRESS);
  const garment = new ethers.Contract(
        ERC721_GARMENT_ADDRESS,
        GarmentArtifact.abi,
        deployer
  );

  // const auction = new ethers.Contract(
  //       AUCTION_ADDRESS,
  //       AuctionArtifact.abi,
  //       deployer
  //  );

    const metadata = require('./res.json');
    //  console.log(metadata.data);
    console.log(metadata.data.length)
    const datas = metadata.data;

    let amountToSetInitially = metadata.data.length;
    let numberOfLoops = 0;
    if(amountToSetInitially > MAX_NFT_SINGLE_TX){
        amountToSetInitially =  metadata.data.length % MAX_NFT_SINGLE_TX;
        numberOfLoops = Math.floor(metadata.data.length / MAX_NFT_SINGLE_TX);
    }

    console.log('amountToSetInitially');
    console.log(amountToSetInitially);
    console.log('numberOfLoops');
    console.log(numberOfLoops);

    const startUpdatingFromTokenId = 1;

    console.log('First set');
    const tokenIds = [startUpdatingFromTokenId];
    const primarySalePrices = [datas[0].primarySalePrice];
    const garmentDesigners = [datas[0].garmentDesigner];
    const tokenUris = [datas[0].tokenUri];
    for(let i=1; i < amountToSetInitially; i++){
      tokenIds.push(startUpdatingFromTokenId + i);
      primarySalePrices.push(datas[i].primarySalePrice);
      garmentDesigners.push(datas[i].garmentDesigner);
      tokenUris.push(datas[i].tokenUri);
  }

    console.log(tokenIds);
    console.log(primarySalePrices);
    console.log(garmentDesigners);
    console.log(tokenUris);

  console.log(' setting prices');
/*
  const salePricetx = await garment.batchSetPrimarySalePrice(
      tokenIds,
      primarySalePrices);

  await salePricetx.wait();

  console.log('setting garment')

  const garmenttx = await garment.batchSetGarmentDesigner(
      tokenIds,
      garmentDesigners);

  await garmenttx.wait();

  console.log('setting uri');
  const uritx = await garment.batchSetTokenURI(
      tokenIds,
      tokenUris);

  await uritx.wait();

*/

    amountToSetInitially = amountToSetInitially + 1;

    // do txs


  // Mint more
  let counter = 0;
  if(numberOfLoops > 0){
    while(numberOfLoops--){
      console.log('the counter is at loop');
      console.log(counter);

      const currentIndex = amountToSetInitially + (counter*MAX_NFT_SINGLE_TX);
      console.log('the first token id in this set is')
      console.log(currentIndex);

      console.log('First set');
      let tokenIdsSalePrices = []
      let primarySalePricesInternal = []
      if(datas[currentIndex - 1].primarySalePrice !== '0'){
        tokenIdsSalePrices = [currentIndex];
        primarySalePricesInternal = [datas[currentIndex - 1].primarySalePrice];
      }
      const tokenIdsInternal = [currentIndex];
      const garmentDesignersInternal = [datas[currentIndex - 1].garmentDesigner];
      const tokenUrisInternal = [datas[currentIndex -1].tokenUri];
      for(let i=1; i < MAX_NFT_SINGLE_TX; i++){
        if(datas[currentIndex - 1+ i].primarySalePrice !== '0'){
          tokenIdsSalePrices.push((currentIndex ) + i);
          primarySalePricesInternal.push(datas[currentIndex -1 + i].primarySalePrice);
        }
        tokenIdsInternal.push((currentIndex ) + i);
        garmentDesignersInternal.push(datas[currentIndex -1 + i].garmentDesigner);
        tokenUrisInternal.push(datas[currentIndex -1 + i].tokenUri);
      }

      console.log(tokenIdsInternal);
      console.log(tokenIdsSalePrices);
      console.log(primarySalePricesInternal);
      console.log(garmentDesignersInternal);
      console.log(tokenUrisInternal);

      const salePricetxInternal = await garment.batchSetPrimarySalePrice(
          tokenIdsSalePrices,
          primarySalePricesInternal);

      await salePricetxInternal.wait();

      console.log('setting garment')

      const garmenttxInternal = await garment.batchSetGarmentDesigner(
          tokenIdsInternal,
          garmentDesignersInternal);

      await garmenttxInternal.wait();

      console.log('setting uri');
      const uritxInternal = await garment.batchSetTokenURI(
          tokenIdsInternal,
          tokenUrisInternal);

      await uritxInternal.wait();

      counter = counter + 1;

    }
  }

  // Mint collection
  // const tx = await garmentCollection.mintCollection(
  //     collectionForMarketplace.uri,
  //     collectionForMarketplace.collectionDesigner,
  //     amountToMintInitially,
  //     collectionForMarketplace.auctionIdToLink,
  //     collectionForMarketplace.rarity,
  //     collectionForMarketplace.tokendIds, // childTokenIds
  //     collectionForMarketplace.tokenAmounts, // childTokenAmounts
  // );
  //
  // const createCollectionId = await new Promise((resolve, reject) => {
  //   garmentCollection.on('MintGarmentCollection',
  //       async (collectionId, auctionId, rarity, event) => {
  //         const block = await event.getBlock();
  //         console.log(`Collection # ${collectionId} created`);
  //         console.log(`at time ${block.timestamp} for auction id ${auctionId}`);
  //         resolve(collectionId);
  //       });
  // });
  //
  // await tx.wait();
  // arrayOfCollectionIdsDeployedForExclusiveNFT.push(createCollectionId.toString());
  //
  // console.log(`-Collection created-`);
  //
  // // Mint more
  // if(numberOfLoops > 0){
  //   while(numberOfLoops--){
  //     const tx2 = await garmentCollection.mintMoreNftsOnCollection(
  //         createCollectionId,
  //         MAX_NFT_SINGLE_TX,
  //         collectionForMarketplace.tokendIds, // childTokenIds
  //         collectionForMarketplace.tokenAmounts, // childTokenAmounts
  //     );
  //     await tx2.wait();
  //   }
  // }



  /*
    var arrayOfParents = [];
    for (let [index, auctionGarmentInfo] of uris.entries()) {
        console.log(`----------------------`);
        console.log(`Creating exclusive parent nft For uri: ${auctionGarmentInfo.uri} with child token ids of ${auctionGarmentInfo.tokendIds} and amounts: ${auctionGarmentInfo.tokenAmounts}`);
        const tx = await factory.mintParentWithoutChildren(
            auctionGarmentInfo.uri,
            auctionGarmentInfo.designer,
            // auctionGarmentInfo.tokendIds, // childTokenIds
            // auctionGarmentInfo.tokenAmounts, // childTokenAmounts
            '0x0edFe4bEEd72Ae089Cc11f179EB75Dc9eB2278De', // Who receives nft and can approve (beneficiary), should be deployer address
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
        // const auctionTx = await auction.createAuction(
        //     createParentId, // garmentTokenId
        //     auctionGarmentInfo.price, // reservePrice
        //     auctionGarmentInfo.auctionStartTime, // startTimestamp
        //     auctionGarmentInfo.auctionEndTime, // endTimestamp
        //     true // Mona payment
        // );
        //
        // await auctionTx.wait();

        console.log(`----------------------`);
    }

    console.log('The parent nfts with auctions created for them are as follows: ');
    console.log(arrayOfParents);


   */
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
