const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuctionV2.json');
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTV2.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');

async function main() {
    const ROUND_15_DESIGNERS = {
        adam: '0x817ae7c66661801FD260d3b9f3A7610ffA208A90',
        aisha: '0x9c8381D02A1c38932C2aCDc33953BD6f1dd0e1db',
        alexander: '0x5c4FEcDB7788190dDdA685dB29940569eC28CA6D',
        alyona: '0x6C3859f7E64227164c8b93CE68f0473f32802d3A',
        annguyen: '0xB8eE29bb3c72c50A1fD189d526B5394B85cAC34d',
        ava3d: '0xf8187F711aEAc7f47074bd856ce922D1a082E68D',
        blade: '0x36B0FFAdE40B6F31e0F8f97543b08cBd581FeA3b',
        catherine: '0xD4a066D39Dbb9502C410D08B62342f5fCC84cc6D', //131181
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
   // const scr =  await accessControls.addSmartContractRole(AUCTION_ADDRESS);
   // await scr.wait();
   //
   //  const acr = await accessControls.addMinterRole(factory.address);
   //  await acr.wait();
   //
   //  const acr2 = await accessControls.addMinterRole(deployerAddress);
   //  await acr2.wait();
   //
   // // OPTIONAL TODO use if needed
     const updateFee = await auction.updatePlatformFee('650'); // 60% goes to us, 40% to designer direct
     await updateFee.wait();
     console.log('updated platform fee');

  //// SETTINGS

  const reservePrice = '0';

   const mainnet_startTime = '1629738000';
   const mainnet_endTime = '1630087200';

    // // Approve for all
    // const approveToken = await garment.setApprovalForAll(AUCTION_ADDRESS, true);
    // await approveToken.wait();

    // Run 1 at a time in production, in case something drops
  const uris = [

         {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Adam/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.adam
          },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Aisha/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.aisha
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Alexander/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.alexander
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Alyona/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.alyona
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/AnNguyen/Design1/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.annguyen
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/AnNguyen/Design2/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.annguyen
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Ava3D/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.ava3d
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/blade/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.blade
           },
           {
                uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/catherine/hash.json').uri,
                tokendIds: [],
                tokenAmounts: [],
                price: reservePrice,
                auctionStartTime: mainnet_startTime,
                auctionEndTime: mainnet_endTime,
                designer: ROUND_15_DESIGNERS.catherine
           },
           {
                uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/cryptodeevo/hash.json').uri,
                tokendIds: [],
                tokenAmounts: [],
                price: reservePrice,
                auctionStartTime: mainnet_startTime,
                auctionEndTime: mainnet_endTime,
                designer: ROUND_15_DESIGNERS.cryptodeevo
           },
           {
                uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/cryptsie/hash.json').uri,
                tokendIds: [],
                tokenAmounts: [],
                price: reservePrice,
                auctionStartTime: mainnet_startTime,
                auctionEndTime: mainnet_endTime,
                designer: ROUND_15_DESIGNERS.cryptsie
           },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/domingo/Design1/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.domingo
          },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/domingo/Design2/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.domingo
           },
           {
                uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Edward/hash.json').uri,
                tokendIds: [],
                tokenAmounts: [],
                price: reservePrice,
                auctionStartTime: mainnet_startTime,
                auctionEndTime: mainnet_endTime,
                designer: ROUND_15_DESIGNERS.edward
             },
             {
                  uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/enki/hash.json').uri,
                  tokendIds: [],
                  tokenAmounts: [],
                  price: reservePrice,
                  auctionStartTime: mainnet_startTime,
                  auctionEndTime: mainnet_endTime,
                  designer: ROUND_15_DESIGNERS.enki
               },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Katriane/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.katriane
          },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/kimajak/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.kimajak
          },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Ksenia/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.ksenia
          },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Kerkinitida/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.kerkinitida
          },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/LUCII/Design1/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.lucii
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/LUCII/Design2/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.lucii
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Maria/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.maria
           },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Myse/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.myse
          },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Majestic/Design1/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.majestic
          },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Majestic/Design2/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.majestic
          },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Majestic/Design3/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.majestic
          },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Paola/hash.json').uri,
              tokendIds: [],
              tokenAmounts: [],
              price: reservePrice,
              auctionStartTime: mainnet_startTime,
              auctionEndTime: mainnet_endTime,
              designer: ROUND_15_DESIGNERS.paola
           },
          //  {
          //     uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Ros3D/hash.json').uri,
          //     tokendIds: [],
          //     tokenAmounts: [],
          //     price: reservePrice,
          //     auctionStartTime: mainnet_startTime,
          //     auctionEndTime: mainnet_endTime,
          //     designer: ROUND_15_DESIGNERS.ros3d
          //  },
          // {
          //     uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Stella/Design1/hash.json').uri,
          //     tokendIds: [],
          //     tokenAmounts: [],
          //     price: reservePrice,
          //     auctionStartTime: mainnet_startTime,
          //     auctionEndTime: mainnet_endTime,
          //     designer: ROUND_15_DESIGNERS.stella
          // },
          // {
          //     uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Stella/Design2/hash.json').uri,
          //     tokendIds: [],
          //     tokenAmounts: [],
          //     price: reservePrice,
          //     auctionStartTime: mainnet_startTime,
          //     auctionEndTime: mainnet_endTime,
          //     designer: ROUND_15_DESIGNERS.stella
          // },
          // {
          //     uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Tania/hash.json').uri,
          //     tokendIds: [],
          //     tokenAmounts: [],
          //     price: reservePrice,
          //     auctionStartTime: mainnet_startTime,
          //     auctionEndTime: mainnet_endTime,
          //     designer: ROUND_15_DESIGNERS.tania
          // },
          // {
          //     uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/oneoone/Design1/hash.json').uri,
          //     tokendIds: [],
          //     tokenAmounts: [],
          //     price: reservePrice,
          //     auctionStartTime: mainnet_startTime,
          //     auctionEndTime: mainnet_endTime,
          //     designer: ROUND_15_DESIGNERS.oneoone
          // },
          // {
          //     uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/oneoone/Design2/hash.json').uri,
          //     tokendIds: [],
          //     tokenAmounts: [],
          //     price: reservePrice,
          //     auctionStartTime: mainnet_startTime,
          //     auctionEndTime: mainnet_endTime,
          //     designer: ROUND_15_DESIGNERS.oneoone
          // },
          // {
          //     uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/porka/hash.json').uri,
          //     tokendIds: [],
          //     tokenAmounts: [],
          //     price: reservePrice,
          //     auctionStartTime: mainnet_startTime,
          //     auctionEndTime: mainnet_endTime,
          //     designer: ROUND_15_DESIGNERS.porka
          // },
          //  {
          //     uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Xenotech/hash.json').uri,
          //     tokendIds: [],
          //     tokenAmounts: [],
          //     price: reservePrice,
          //     auctionStartTime: mainnet_startTime,
          //     auctionEndTime: mainnet_endTime,
          //     designer: ROUND_15_DESIGNERS.xenotech
          //  },
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
