const prompt = require('prompt-sync')();
const FactoryArtifact = require('../artifacts/DigitalaxGarmentFactory.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Creating a garment and wrapping using factory with address:",
    deployerAddress
  );

  const factoryAddress = prompt('Factory address? ');
  const factory = new ethers.Contract(
    factoryAddress,
    FactoryArtifact.abi,
    deployer
  );

  // const tx = await factory.createNewChildren(['randStrandUri5', 'randStrandUri6']);
  //
  // await tx.wait();

  await factory.mintParentWithChildren(
    'garment3Uri',
    '0xA9d8b169783100639Bb137eC09f7277DC7948760',
    ['1','2'],
    ['2', '2'],
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
