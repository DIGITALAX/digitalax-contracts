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

  /*
    rendooo - defi summer male - NY1344 & NP1344 & RL1314
    rendooo - defi summer female - NY1344 & NP1344 & RL1314
    Nian - shitcoin jacket - JN1222 & BL2011
    McAfee.Design - when lambo - SC1456 & SC1556 & SC1666
    stanislav - incognito - SJ2011
    Album Corvum - ico suit - AC1888 & CI2011
    Album Corvum - defi shoe - SL7655 & BV1000
    Msistema - The whale hunter - SM2011 & SC2011 & SL2011 & GG1888
    Mar Guixa Studio - dao out - MG2011 & SM1259
    Lorena Bello - the puurse v2 - PF1345 & LB2366 & OL5555
 */

  // rendooo - defi summer male - 10
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/defi_summer_male/hash.json').uri, // garmentTokenUri
    DESIGNERS.rendooo, // designer
    ['28', '29', '30'], // childTokenIds
    ['1', '1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // rendooo - defi summer female - 11
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/defi_summer_female/hash.json').uri, // garmentTokenUri
    DESIGNERS.rendooo, // designer
    ['28', '29', '30'], // childTokenIds
    ['1', '1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Nina - shitcoin jacket  - 12
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/the_shitcoin_jacket/hash.json').uri, // garmentTokenUri
    DESIGNERS.nina, // designer
    ['31', '32'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // McAfee.Design - when lambo  - 13
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/mcafee/hash.json').uri, // garmentTokenUri
    DESIGNERS.mcAfee, // designer
    ['33', '34', '35'], // childTokenIds
    ['1', '1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // stanislav - incognito  - 14
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/Incognito/hash.json').uri, // garmentTokenUri
    DESIGNERS.stanislav, // designer
    ['36'], // childTokenIds
    ['1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Album Corvum - ico suit  - 15
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/ico_suit/hash.json').uri, // garmentTokenUri
    DESIGNERS.album_corvum, // designer
    ['37', '38'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Album Corvum - defi shoe  - 16
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/defi_shoes/hash.json').uri, // garmentTokenUri
    DESIGNERS.album_corvum, // designer
    ['39', '40'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Msistema - The whale hunter  - 17
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/the_whale_hunter/hash.json').uri, // garmentTokenUri
    DESIGNERS.msistema, // designer
    ['41', '42', '43', '44'], // childTokenIds
    ['1', '1', '1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Mar Guixa Studio - dao out - 18
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/mar/hash.json').uri, // garmentTokenUri
    DESIGNERS.mar, // designer
    ['45', '46'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Lorena Bello - the puurse v2  - 19
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/the_puurse_v2/hash.json').uri, // garmentTokenUri
    DESIGNERS.lorena, // designer
    ['47', '48', '49'], // childTokenIds
    ['1', '1', '1'], // childTokenAmounts
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
