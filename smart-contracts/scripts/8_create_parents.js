const FactoryArtifact = require('../artifacts/DigitalaxGarmentFactory.json');
const {DESIGNERS} = require('./constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying auction with signer address:',
    deployerAddress
  );

  const {
    GARMENT_FACTORY_ADDRESS,
  } = process.env;

  const factory = new ethers.Contract(
    GARMENT_FACTORY_ADDRESS,
    FactoryArtifact.abi,
    deployer
  );

  // Msistema / Crypto Bitch
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/crypto_bitch/hash.json').uri, // garmentTokenUri
    DESIGNERS.msistema, // designer
    ['1', '2'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Lorena / The Puurse
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/the_puurse/hash.json').uri, // garmentTokenUri
    DESIGNERS.lorena, // designer
    ['3', '4'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Eddy / Decentralised Dress
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/eddy/hash.json').uri, // garmentTokenUri
    DESIGNERS.eddy, // designer
    ['5', '6'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Vitaly / To The Moon
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/vitaly/hash.json').uri, // garmentTokenUri
    DESIGNERS.vitaly, // designer
    ['7', '8', '9', '10', '11', '12', '13', '14'], // childTokenIds
    ['1', '1', '1', '1', '1', '1', '1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Xander / Lightning Network
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/xander/hash.json').uri, // garmentTokenUri
    DESIGNERS.xander, // designer
    ['15', '16'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // HonoreHL / DAI DAI DAI
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/honore_hl/hash.json').uri, // garmentTokenUri
    DESIGNERS.honore, // designer
    ['17', '18'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
