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

  const tx = await factory.createNewChildren(['randStrandUri3', 'randStrandUri4']);

  await tx.wait();

  await factory.mintParentWithChildren(
    'newGarmentWhat',
    '0x12D062B19a2DF1920eb9FC28Bd6E9A7E936de4c2',
    ['3','4'],
    ['2', '9'],
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
