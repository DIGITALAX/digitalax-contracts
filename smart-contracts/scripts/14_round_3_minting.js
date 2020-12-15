const FactoryArtifact = require('../artifacts/DigitalaxGarmentFactory.json');
const {FUND_MULTISIG_ADDRESS} = require('./constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying auction with signer address:',
    deployerAddress
  );

  const {GARMENT_FACTORY_ADDRESS} = process.env;
  console.log(`GARMENT_FACTORY_ADDRESS found [${GARMENT_FACTORY_ADDRESS}]`);

  const factory = new ethers.Contract(
    GARMENT_FACTORY_ADDRESS,
    FactoryArtifact.abi,
    deployer
  );

  const WHALE_RECIPIENT_ADDRESS = '0x5c543FFECC4F9c1695fB7C854A8403cF797750D1';

  // Create children
  let tx = await factory.createNewChildren([
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/DF003/hash.json`).uri, // Rushcorps01 & Rushcorps02 & Rushcorps07, Rushcorps08 - 50
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/DF002/hash.json`).uri, // Rushcorps03 & Rushcorps06 & Rushcorps09 - 51
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/DF006/hash.json`).uri, // Rushcorps03 - 52
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/DF001/hash.json`).uri, // Rushcorps04 & Rushcorps05 - 53
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/DF004/hash.json`).uri, // Rushcorps04 - 54
  ]);
  await tx.wait();

  // rushcorp01 - DF003 - 20
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/rushcorp01/hash.json').uri,
    FUND_MULTISIG_ADDRESS,
    ['50'], // childTokenIds
    ['1'], // childTokenAmounts
    FUND_MULTISIG_ADDRESS // beneficiary
  );

  // rushcorp02 - DF003 - 21
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/rushcorp02/hash.json').uri,
    FUND_MULTISIG_ADDRESS,
    ['50'], // childTokenIds
    ['1'], // childTokenAmounts
    FUND_MULTISIG_ADDRESS // beneficiary
  );

  // rushcorp03 - DF002, DF006 - 22
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/rushcorp03/hash.json').uri,
    FUND_MULTISIG_ADDRESS,
    ['51', '52'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    FUND_MULTISIG_ADDRESS // beneficiary
  );

  // rushcorp04 - DF001, DF004 - 23
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/rushcorp04/hash.json').uri,
    FUND_MULTISIG_ADDRESS,
    ['53', '54'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    FUND_MULTISIG_ADDRESS // beneficiary
  );

  // rushcorp05 - DF001 - 24
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/rushcorp05/hash.json').uri,
    FUND_MULTISIG_ADDRESS,
    ['53'], // childTokenIds
    ['1'], // childTokenAmounts
    FUND_MULTISIG_ADDRESS // beneficiary
  );

  // rushcorp06 - DF002 - 25
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/rushcorp06/hash.json').uri,
    FUND_MULTISIG_ADDRESS,
    ['51'], // childTokenIds
    ['1'], // childTokenAmounts
    FUND_MULTISIG_ADDRESS // beneficiary
  );

  // rushcorp07 - DF003 - 26
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/rushcorp07/hash.json').uri,
    FUND_MULTISIG_ADDRESS,
    ['50'], // childTokenIds
    ['1'], // childTokenAmounts
    FUND_MULTISIG_ADDRESS // beneficiary
  );

  // rushcorp08 - DF003 - 27
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/rushcorp08/hash.json').uri,
    FUND_MULTISIG_ADDRESS,
    ['50'], // childTokenIds
    ['1'], // childTokenAmounts
    FUND_MULTISIG_ADDRESS // beneficiary
  );

  // rushcorp09 - DF002 - 28
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/rushcorp09/hash.json').uri,
    FUND_MULTISIG_ADDRESS,
    ['51'], // childTokenIds
    ['1'], // childTokenAmounts
    FUND_MULTISIG_ADDRESS // beneficiary
  );

  // Lorenawhale - 29 (no children)
  await factory.mintParentWithoutChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/lorenawhale/hash.json').uri,
    WHALE_RECIPIENT_ADDRESS,
    WHALE_RECIPIENT_ADDRESS // beneficiary
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
