const FactoryArtifact = require('../../artifacts/DigitalaxSubscriptionFactory.json');
const MaterialsArtifact = require('../../artifacts/DFBundle.json');
const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  const {SUBSCRIPTION_FACTORY_ADDRESS, DFBUNDLE_ADDRESS} = process.env;
  console.log(`SUBSCRIPTION_FACTORY_ADDRESS found [${SUBSCRIPTION_FACTORY_ADDRESS}]`);
  console.log(`DFBUNDLE_ADDRESS found [${DFBUNDLE_ADDRESS}]`);

  const factory = new ethers.Contract(
      SUBSCRIPTION_FACTORY_ADDRESS,
    FactoryArtifact.abi,
    deployer
  );

  const materials = new ethers.Contract(
      DFBUNDLE_ADDRESS,
      MaterialsArtifact.abi,
     deployer
  );

  let tx = await factory.createNewChildren([

      require(`../../../../nft-minting-scripts/auction-metadata/token-data/children/test_digifizzy/hash.json`).uri, // 184
  ]);


  const createChildIds = await new Promise((resolve, reject) => {
      materials.on('ChildrenCreated',
        async (tokenIds, event) => {
          const block = await event.getBlock();
          console.log(`Children created at time ${block.timestamp}`);
          resolve(tokenIds);
        });
  });

  await tx.wait();

  console.log(`Children created for token ids:`);
  console.log(`[${createChildIds}]`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
