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

  const childrenMetadataDirectory = "../../../nft-minting-scripts/auction-metadata/token-data/children";

  // Create children
  const tx = await factory.createNewChildren([
    require(`${childrenMetadataDirectory}/MB1111/hash.json`).uri, // Msistema / Crypto Bitch / 1
    require(`${childrenMetadataDirectory}/BL1011/hash.json`).uri, // Msistema / Crypto Bitch / 2
    require(`${childrenMetadataDirectory}/BL1555/hash.json`).uri, // Lorena / The Puurse / 3
    require(`${childrenMetadataDirectory}/LB2011/hash.json`).uri, // Lorena / The Puurse / 4
    require(`${childrenMetadataDirectory}/NY1344/hash.json`).uri, // Rendoo / DeFi Summer (Male) / 5
    require(`${childrenMetadataDirectory}/NP1344/hash.json`).uri, // Rendoo / DeFi Summer (Male) / 6
    require(`${childrenMetadataDirectory}/RL1314/hash.json`).uri, // Rendoo / DeFi Summer (Male) / 7
    require(`${childrenMetadataDirectory}/AL1345/hash.json`).uri, // Vitaly / To The Moon / 8
    require(`${childrenMetadataDirectory}/CP2222/hash.json`).uri, // Vitaly / To The Moon / 9
    require(`${childrenMetadataDirectory}/DS3676/hash.json`).uri, // Vitaly / To The Moon / 10
  ]);

  await tx.wait();

  await factory.createNewChildren([
    require(`${childrenMetadataDirectory}/RP1414/hash.json`).uri, // Vitaly / To The Moon / 11
    require(`${childrenMetadataDirectory}/VS9843/hash.json`).uri, // Vitaly / To The Moon / 12
    require(`${childrenMetadataDirectory}/YN7657/hash.json`).uri, // Vitaly / To The Moon / 13
    require(`${childrenMetadataDirectory}/YP5555/hash.json`).uri, // Vitaly / To The Moon / 14
    require(`${childrenMetadataDirectory}/YR2343/hash.json`).uri, // Vitaly / To The Moon / 15
    require(`${childrenMetadataDirectory}/DL9090/hash.json`).uri, // Xander / Lightning Network / 16
    require(`${childrenMetadataDirectory}/GN2011/hash.json`).uri, // Xander / Lightning Network / 17
    require(`${childrenMetadataDirectory}/HG1515/hash.json`).uri, // HonoreHL / DAI DAI DAI / 18
    require(`${childrenMetadataDirectory}/TM3334/hash.json`).uri, // HonoreHL / DAI DAI DAI / 19
  ]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
