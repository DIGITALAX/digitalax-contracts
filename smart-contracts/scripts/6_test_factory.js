const prompt = require('prompt-sync')();
const FactoryArtifact = require('../artifacts/DigitalaxGarmentFactory.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Creating a garment and wrapping using factory with address:",
    deployerAddress
  );

  const factory = new ethers.Contract(
    factoryAddress,
    FactoryArtifact.abi,
    deployer
  );

  //await factory.createNewStrands(['randStrand1', 'randStrand2']);

  await factory.createGarmentAndMintStrands(
    'randGarmenUri',
    '0x12D062B19a2DF1920eb9FC28Bd6E9A7E936de4c2',
    ['1','2'],
    ['4', '6'],
    deployerAddress
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
