const prompt = require('prompt-sync')();
const MaterialsArtifact = require('../../artifacts/DigitalaxMaterials.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Query address:',
    deployerAddress
  );

  const materialsAddress = prompt('Materials address? ');
  const materials = new ethers.Contract(
    materialsAddress,
    MaterialsArtifact.abi,
    deployer
  );

  for (let i = 1; i <= 6; i++) {
    console.log(
      `Balance of strand [${i}]`,
      (await materials.balanceOf('0xd677aed0965ac9b54e709f01a99ceca205aebc4b', i)).toString()
    );
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
