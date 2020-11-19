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
    ACCESS_CONTROLS_ADDRESS,
    ERC1155_MATERIALS_ADDRESS,
    ERC721_GARMENT_ADDRESS,
    AUCTION_ADDRESS,
    GARMENT_FACTORY_ADDRESS,
  } = process.env;

  const factory = new ethers.Contract(
    GARMENT_FACTORY_ADDRESS,
    FactoryArtifact.abi,
    deployer
  );

  // Create children
  const tx = await factory.createNewChildren([
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/AC1888/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/BF4433/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/BL1011/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/BL1555/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/BL2011/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/BV1000/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/CI2011/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/CP2222/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/DL9090/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/DS3676/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/EC1116/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/EH1442/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/EH1444/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/GG1888/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/GN2011/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/HG1515/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/JN1222/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/LB2011/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/LB2366/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/LN4545/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/MB1111/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/MG2011/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/NP1344/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/NY1344/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/OL5555/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/PF1345/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/PF4422/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/PP3248/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/RL1314/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/RP1414/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/SC1456/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/SC1556/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/SC1666/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/SC2011/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/SL2011/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/SL7655/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/SM1259/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/SM2011/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/TM3334/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/VS9843/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/YN7657/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/YP5555/hash.json').hash,
    require('../../../nft-minting-scripts/auction-metadata/token-data/children/YR2343/hash.json').hash,
  ]);
  
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
