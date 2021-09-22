const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuctionV2.json');
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFTV2.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');
const DigitalaxIndexArtifact = require('../../artifacts/DigitalaxIndex.json');

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
        cryptsie: '0x89c96a9d9b43238db1f35D2297483d6964a56DFE',
        domingo: '0x6A98ca44a35aDBdc0d4cD91E06453cB67a2DD63A',
        edward: '0xd6eB4a00373db9B0DC6E8f6684713cFE121C3B3c',
        enki: '0xa46E5042Eb08d95B80DD593B4D4718F51B01b9C8',
        katriane:'0x69e04CF8C047008B3B4EfD277da04FD3E49db0cb',
        kerkinitida: '0x2c47d28faBE975c01bA781Bf543Ba461cFd155a5',
        kimajak: '0x1d66A93d412B7E24d938Bd7E5bb0693B8178818A',
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
        joanna: '0x7bA3190b373f214ED46dEe3c731c635c06f968a1',
        james: '0x638E8F73212CE6b5DFD379cBa2Ed8b187A52D6E3',
        mike: '0xf1C40E8C7c7770e5BD8d8638feEBc80F9D3BA40D',
        mo:'0xF9EFe16A7F953e2aEE6Ea57B53c319aD33C233FD',
        deevo: '0x08BAdc9cA8faa6C145a1ac395c40DC340665e3f6',
        arez: '0x33f87555afb3517CfdE9713c83C9c64A2D7E6C6f',
        clogged: '0x4d34A6D650e6671cAB190b77F31CB32CfAe7Db42',
        takaii: '0x76e274bd6CB7ca0930772A436a1E3f8ee0656ef4',
        mia: '0x39fA5a1B6f721b99C612caBE5fB110F0e5E1B979',
        digitalax: '0xEa41Cd3F972dB6237FfA2918dF9199B547172420',
        nina: '0x5c067cD91f0a37b26b7d66DFA3856E8f877cbd56',
        kalau: '0x53Ad2b5b4fF8C12Dfa2044c0Ab2a74fE12C2F8FB',
        mar: '0xC242c6B7FcA8011F42E23F460820B62F327c4681',
        daria: '0x6e7E67af78B44ba67eEeD29E6Ccfd98d0B2e18BE',
        hippie: '0xFc3105dE326DD5e0FBD7F00D11fF02b1B7447927',
        fountane: '0xD3a7F97655b5AaC24e31589fca47BC87d100f689',
        ksenia: '0x2dBb5c3a47191dC0218524ef9301dB346f5424c5',
        unhueman: '0x531CE1F287964b27A9d8b8597D81b816Ec8f5838',
      }

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying parents and setting up auction with the following address:',
    deployerAddress
  );

  const {DIGITALAX_INDEX_ADDRESS} = process.env;


    const digitalaxIndex = new ethers.Contract(
        DIGITALAX_INDEX_ADDRESS,
        DigitalaxIndexArtifact.abi,
        deployer
    );


  const uris = [
         {      // TODO pointer to the uri
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Adam/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
             // TODO Alternative way is doing like:
             // uri: 'https://gateway.pinata.cloud/ipfs/QmUqYtF8dKR6vZnmSfDsF8BeupJFVFE417DBcbjE4JRz1j',
              auctionIds: [133056],
              collectionIds: [425,426],
              designer: ROUND_15_DESIGNERS.adam
          },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Aisha/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133057],
              collectionIds: [263,433,434],
              designer: ROUND_15_DESIGNERS.aisha
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Alexander/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133058],
              collectionIds: [468, 469],
              designer: ROUND_15_DESIGNERS.alexander
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Alyona/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133059],
              collectionIds: [262,477],
              designer: ROUND_15_DESIGNERS.alyona
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/AnNguyen/Design1/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133060,133061],
              collectionIds: [430,431,432],
              designer: ROUND_15_DESIGNERS.annguyen
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/arez/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133062],
              collectionIds: [450,451,452,453,454],
              designer: ROUND_15_DESIGNERS.arez
           },
           {
            uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Ava3d/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
               auctionIds: [133063],
               collectionIds: [264,276,460],
            designer: ROUND_15_DESIGNERS.ava3d
           },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/blade/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133064],
              collectionIds: [373,474],
              designer: ROUND_15_DESIGNERS.blade
           },
           {
                uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/catherine/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
                auctionIds: [133065],
              collectionIds: [], // had 0 originally, I think can leave empty
                designer: ROUND_15_DESIGNERS.catherine
           },
           {
                uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/cryptodeevo/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
                auctionIds: [133066],
              collectionIds: [314,315,316,317],
                designer: ROUND_15_DESIGNERS.deevo
           },
           {
                uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/cryptsie/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
                auctionIds: [133067],
              collectionIds: [292,293,294,295,368,369,467],
                designer: ROUND_15_DESIGNERS.cryptsie
           },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/domingo/Design1/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133068,133069],
              collectionIds: [309,310,311,313,472],
              designer: ROUND_15_DESIGNERS.domingo
          },
           {
                uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Edward/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
                auctionIds: [133070],
              collectionIds: [463,491,492,493],
                designer: ROUND_15_DESIGNERS.edward
             },
             {
                  uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/enki/Design1/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
                  auctionIds: [133071,133072],
              collectionIds: [410,473],
                  designer: ROUND_15_DESIGNERS.enki
               },
             {
                uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/fountane/Design1/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
                auctionIds: [133073,133074,133075,133076],
              collectionIds: [404,407,408,409],
                designer: ROUND_15_DESIGNERS.fountane
             },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Katriane/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133077],
              collectionIds: [423],
              designer: ROUND_15_DESIGNERS.katriane
          },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/kimajak/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133078],
              collectionIds: [424],
              designer: ROUND_15_DESIGNERS.kimajak
          },
          {
            uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Kerkinitida/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133079],
              collectionIds: [], // should be able to leave empty
            designer: ROUND_15_DESIGNERS.kerkinitida
         },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Ksenia/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133080],
              collectionIds: [435,436,437,438,439,440],
              designer: ROUND_15_DESIGNERS.ksenia
          },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/LUCII/Design1/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133081,133082],
              collectionIds: [418,428,429],
              designer: ROUND_15_DESIGNERS.lucii
          },
           {
            uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Majestic/Design1/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
               auctionIds: [133083,133084,133085],
               collectionIds: [], //empty
            designer: ROUND_15_DESIGNERS.majestic
         },
         {
            uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/mar/Design2/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
             auctionIds: [133086,133087],
             collectionIds: [370,371],
            designer: ROUND_15_DESIGNERS.mar
         },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Maria/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133088],
              collectionIds: [280,342,359],
              designer: ROUND_15_DESIGNERS.maria
           },
           {
            uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/mo/Design1/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
               auctionIds: [133089, 133090],
               collectionIds: [282,283,284,285,286,287,288,296,297,298,299,300,301,302,405,406],
            designer: ROUND_15_DESIGNERS.mo
         },
          {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Myse/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133091],
              collectionIds: [],
              designer: ROUND_15_DESIGNERS.myse
          },
           {
              uri: require('../../../../nft-minting-scripts/auction-metadata/token-data/parents/DAOAuction/Paola/hash.json').uri,// TODO REPLACE WITH RIGHT PATH, or just with uri: 'link'
              auctionIds: [133092],
              collectionIds: [457],
              designer: ROUND_15_DESIGNERS.paola
           },
  ]

  for (let [index, auctionGarmentInfo] of uris.entries()) {
     const tx = await digitalaxIndex.addDesignerGroup(
          auctionGarmentInfo.designer,
          auctionGarmentInfo.uri,
          auctionGarmentInfo.collectionIds,
          auctionGarmentInfo.auctionIds
        );

      await tx.wait();

      console.log('The designer was added:');

      console.log(auctionGarmentInfo);

      console.log(`----------------------`);
  }

  console.log('Script is complete.');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
