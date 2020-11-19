var prompt = require('prompt-sync')();
const web3 = require('web3');
const MaterialsArtifact = require('../artifacts/DigitalaxMaterials.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Deploying materials with address:",
    deployerAddress
  );

  const materialsAddress = prompt('Materials address? ');
  const materials = new ethers.Contract(
    materialsAddress,
    MaterialsArtifact.abi,
    deployer
  );

  // const tx = await materials.createChild('https://gateway.pinata.cloud/ipfs/QmRTt56q6hvxnhPcCfXQjaUTJWG5r7cmngDaX14ProVFN8');
  // await tx.wait();
  const EMPTY_BYTES = web3.utils.encodePacked('');

  await materials.mintChild(
    '1',
    '45',
    deployerAddress,
    EMPTY_BYTES
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
