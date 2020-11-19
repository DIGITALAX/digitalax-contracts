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

  // christina
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/christina/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // crypto_bitch
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/crypto_bitch/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // crypto_winter
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/crypto_winter/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // defi_shoes
  await factory.mintParentWithChildren(
    '', // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // eddy
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/eddy/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // honore_hl
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/honore_hl/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // ico_suit
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/ico_suit/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // mar
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/mar/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // mcafee
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/mcafee/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // the_puurse
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/the_puurse/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // the_puurse_v2
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/the_puurse_v2/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // vitaly
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/vitaly/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  // xander
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/xander/hash').hash, // garmentTokenUri
    '', // designer
    [], // childTokenIds
    [], // childTokenAmounts
    '' // beneficiary
  );

  await tx.wait();

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
