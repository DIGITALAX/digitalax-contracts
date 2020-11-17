require('dotenv').config();
const fs = require('fs');
const pinataProvider = require('./providers/pinata');
const PinataIpfsService = require('./services/PinataIpfsService');
const {syncHashToSubgraph} = require('./services/theGraphSyncService');

(async function runScript() {
  console.log('Generating metadata for Genesis NFT...');
  const ipfsService = new PinataIpfsService(pinataProvider);

  console.log('Uploading image to Pinata');
  const readableStreamForFile = fs.createReadStream('./emma-render-02.png');
  const imageResult = await ipfsService.pushFileToPinata(readableStreamForFile);

  console.log('Image uploaded! Uploading ERC721 JSON now...');
  const metadata = {
    name: 'MEET MONA',
    description: 'Mona Vir is crypto\'s first digital. She isn\'t real like you or me— she exists within the digital economy and is native to the Ethereum blockchain. Mona is our mirror into digital-only self expression. She has her own personality, her own likes and dislikes, her own aspirations and goals. Follow her journey.',
    image: imageResult.pinataIpfsUrl,
    attributes: [
      {
        'trait_type': 'Class',
        'value': 'GENESIS'
      },
      {
        'trait_type': 'Set',
        'value': 'Mona 1.0'
      },
      {
        'trait_type': 'Location',
        'value': 'Future alley'
      },
      {
        'trait_type': 'Fashion1',
        'value': 'Black Leather Jacket'
      },
      {
        'trait_type': 'Fashion2',
        'value': 'Emerald Green Lycra Top'
      }
    ]
  };

  const result = await ipfsService.pushJsonToPinata(metadata);
  console.log(`You can find the metadata at: ${result.pinataIpfsUrl}`);

  console.log('\nPinning to subgraphs node');
  await syncHashToSubgraph({
    fileList: [result.result.IpfsHash]
  });

  console.log('Done!');
})();
