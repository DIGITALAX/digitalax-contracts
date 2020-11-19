const prompt = require('prompt-sync')();
const FactoryArtifact = require('../artifacts/DigitalaxGarmentFactory.json');

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

  // Crypto Bitch
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/crypto_bitch/hash.json').uri, // garmentTokenUri
    '', // designer
    ['1','2'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // The Puurse
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/the_puurse/hash.json').uri, // garmentTokenUri
    '', // designer
    ['3','4'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // DeFi Summer (Male)
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/defi_summer_male/hash.json').uri, // garmentTokenUri
    '', // designer
    ['5','6', '7'], // childTokenIds
    ['1', '1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // To the moon
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/vitaly/hash.json').uri, // garmentTokenUri
    '', // designer
    ['8','9', '10', '11', '12', '13', '14', '15'], // childTokenIds
    ['1', '1', '1', '1', '1', '1', '1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Lightning Network
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/xander/hash.json').uri, // garmentTokenUri
    '', // designer
    ['16','17'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // DAI DAI DAI
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/honore_hl/hash.json').uri, // garmentTokenUri
    '', // designer
    ['18','19'], // childTokenIds
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
