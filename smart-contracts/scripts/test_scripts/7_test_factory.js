const prompt = require('prompt-sync')();
const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Creating a garment and wrapping using factory with address:',
    deployerAddress
  );

  const factoryAddress = prompt('Factory address? ');
  const factory = new ethers.Contract(
    factoryAddress,
    FactoryArtifact.abi,
    deployer
  );

  const tx = await factory.createNewChildren([
    'https://gateway.pinata.cloud/ipfs/Qmb3ZYpR2VeHR4s3CAUvnAGY1oZFfciLricN8JhCb68uQB',
    'https://gateway.pinata.cloud/ipfs/QmRTt56q6hvxnhPcCfXQjaUTJWG5r7cmngDaX14ProVFN8'
  ]);

  await tx.wait();

  await factory.mintParentWithChildren(
    'https://gateway.pinata.cloud/ipfs/QmeF4uEJaW5JTcRCL58w5vKq4cbqMJ9VFDfhch8Zz1qypN',
    '0xA9d8b169783100639Bb137eC09f7277DC7948760',
    ['7', '8'],
    ['9', '4'],
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
