require('dotenv').config();
const fs = require('fs');
const pinataProvider = require('./providers/pinata');
const PinataIpfsService = require('./services/PinataIpfsService');
const {syncHashToSubgraph} = require('./services/theGraphSyncService');

(async function runScript() {
  console.log('Generating metadata...');
  const ipfsService = new PinataIpfsService(pinataProvider);

  console.log('Uploading image to Pinata');
  const readableStreamForFile = fs.createReadStream('./digitalax.jpg');
  const imageResult = await ipfsService.pushFileToPinata(readableStreamForFile);

  console.log('Image uploaded! Uploading ERC721 JSON now...');
  const metadata = {
    name: 'Digitalax Garment (Test)',
    description: 'The parent of up to 10 1155 children',
    image: imageResult.pinataIpfsUrl,
    attributes: [
      {
        "trait_type": "Designer",
        "value": "Digitalax"
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
