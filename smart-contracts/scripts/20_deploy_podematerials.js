const metadataList = [
    require('../../../metadata/01/hash.json').uri,
    require('../../../metadata/02/hash.json').uri,
    require('../../../metadata/03/hash.json').uri,
    require('../../../metadata/04/hash.json').uri,
    require('../../../metadata/05/hash.json').uri,
    require('../../../metadata/06/hash.json').uri,
    require('../../../metadata/07/hash.json').uri,
    require('../../../metadata/08/hash.json').uri,
    require('../../../metadata/09/hash.json').uri,
    require('../../../metadata/10/hash.json').uri,
]

async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log('Deploying DigitalaxPodeMaterials with the account:', deployerAddress);

  const {
    ACCESS_CONTROLS_ADDRESS,
    PODE_NFT_ADDRESS,
  } = process.env;

  console.log(`Deploying DigitalaxPodeMaterials`, {
    ACCESS_CONTROLS_ADDRESS,
    PODE_NFT_ADDRESS,
  });

  const DigitalaxPodeMaterials = await ethers.getContractFactory('DigitalaxPodeMaterials');
  const contract = await DigitalaxPodeMaterials.deploy(
    'DigitalaxPodeMaterials',
    'PODEM',
    ACCESS_CONTROLS_ADDRESS,
    PODE_NFT_ADDRESS,
  );

  await contract.deployed();

  console.log('DigitalaxPodeMaterials deployed to:', contract.address);
  
  for (tokenUri of metadataList) {
    const tx = await contract.addTokenUri(tokenUri);
    await tx.wait();
    console.log('---Metadata Added---');
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
