const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const MaterialsArtifact = require('../../artifacts/DigitalaxMaterialsV2.json');
const {FUND_MULTISIG_ADDRESS} = require('../constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying auction with signer address:',
    deployerAddress
  );

  const {GARMENT_FACTORY_ADDRESS, ERC1155_MATERIALS_ADDRESS} = process.env;
  console.log(`GARMENT_FACTORY_ADDRESS found [${GARMENT_FACTORY_ADDRESS}]`);
  console.log(`ERC1155_MATERIALS_ADDRESS found [${ERC1155_MATERIALS_ADDRESS}]`);

  const factory = new ethers.Contract(
    GARMENT_FACTORY_ADDRESS,
    FactoryArtifact.abi,
    deployer
  );

  const materials = new ethers.Contract(
    ERC1155_MATERIALS_ADDRESS,
      MaterialsArtifact.abi,
     deployer
  );


  // // Create children

    // MUMBAI OUTPUT WAS [100026,100027,100028,100029,100030,100031,100032,100033]
  let tx = await factory.createNewChildren([
      // Bancor
      "https://digitalax.mypinata.cloud/ipfs/QmXzxzu282VDURLnhpdj9dHL8Tb1WWKuW9Q8eiJ7GhqPHe", // 100041
      "https://digitalax.mypinata.cloud/ipfs/QmdCFd6fb9gJ5LaMtMuZZ7RSy13oaCzKytXjro9KQ87BnK", // 100016
      "https://digitalax.mypinata.cloud/ipfs/QmfL8j18Lyd5xVMmJbefwovBfvX4aBWUb4QBT9MZKeNGdx", // 100117
      "https://digitalax.mypinata.cloud/ipfs/Qmd5ZJhrmKnBiPi11Ti6dkqMjCCKnNMXm7Hk2T44oYnV1a", // 100184
      "https://digitalax.mypinata.cloud/ipfs/QmQJrUu3c793rpnVNgui6AzsMYRJKQdF6hSxSMNZTnhqXj", // 100114

      // Aave
      "https://digitalax.mypinata.cloud/ipfs/QmZHHBEnWCY5jaqaWkkaF9MJGZgoBdH8ZBNbvgNanFEVie", // 100075
      "https://digitalax.mypinata.cloud/ipfs/QmcxMyWWHaBFsiv41yWJPTfNq2jNAS3wWmz3J4EEEMCvvY", // 100100
      "https://digitalax.mypinata.cloud/ipfs/QmWTv1JMaSBw4VJQJ1eTafSTvCVzE3ZfGwoFFc6qCUeGUk", // 100065
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
