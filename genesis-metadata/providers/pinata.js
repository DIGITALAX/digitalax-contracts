const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK(process.env.PINATA_API, process.env.PINATA_SECRET);

pinata
  .testAuthentication()
  .then((result) => console.log(`Successfully connected to pinata`, result));

module.exports = pinata;
