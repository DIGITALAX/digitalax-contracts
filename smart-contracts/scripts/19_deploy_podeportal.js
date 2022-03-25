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
    require('../../../metadata/11/hash.json').uri,
    require('../../../metadata/12/hash.json').uri, 
    require('../../../metadata/13/hash.json').uri,
]

async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log('Deploying DigitalaxPodePortal with the account:', deployerAddress);

  const {
    ACCESS_CONTROLS_ADDRESS,
    PODE_NFT_ADDRESS,
  } = process.env;

  console.log(`Deploying PodePortal`, {
    ACCESS_CONTROLS_ADDRESS,
    PODE_NFT_ADDRESS,
  });

  const DigitalaxPodePortal = await ethers.getContractFactory('DigitalaxPodePortal');
  const pcpContract = await DigitalaxPodePortal.deploy(
    ACCESS_CONTROLS_ADDRESS,
    PODE_NFT_ADDRESS,
  );

  await pcpContract.deployed();

  console.log('DigitalaxPodePortal deployed to:', pcpContract.address);
  
  for (tokenUri of metadataList) {
    const tx = await pcpContract.addTokenURI(tokenUri);
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
