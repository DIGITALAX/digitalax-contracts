const prompt = require('prompt-sync')();
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Burning a garment with signer address:',
    deployerAddress
  );

  const garmentAddress = prompt('Garment address? ');
  const garment = new ethers.Contract(
    garmentAddress,
    GarmentArtifact.abi,
    deployer
  );

  await garment.burn('2');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
