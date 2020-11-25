const FactoryArtifact = require('../artifacts/DigitalaxGarmentFactory.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying auction with signer address:',
    deployerAddress
  );

  const {GARMENT_FACTORY_ADDRESS} = process.env;
  console.log(`GARMENT_FACTORY_ADDRESS found [${GARMENT_FACTORY_ADDRESS}]`);

  const factory = new ethers.Contract(
    GARMENT_FACTORY_ADDRESS,
    FactoryArtifact.abi,
    deployer
  );

  /*
  rendooo - defi summer male - NY1344 & NP1344 & RL1314
  rendooo - defi summer female - NY1344 & NP1344 & RL1314
  Nian - shitcoin jacket - JN1222 & BL2011
  McAfee.Design - when lambo - SC1456 & SC1556 & SC1666
  stanislav - incognito - SJ2011
  Album Corvum - ico suit - AC1888 & CI2011
  Album Corvum - defi shoe - SL7654 & BV1000
  Msistema - The whale hunter - SM2011 & SC2011 & SL2011 & GG1888
  Mar Guixa Studio - dao out - MG2011 & SM1259
  Lorena Bello - the puurse v2 - PF1345 & LB2366 & OL5555
   */

  // Create children
  let tx = await factory.createNewChildren([
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/NY1344/hash.json`).uri, // defi summer male/female - 28
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/NP1344/hash.json`).uri, // defi summer male/female - 29
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/RL1314/hash.json`).uri, // defi summer male/female - 30

    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/JN1222/hash.json`).uri, // Nina - shitcoin jacket - 31
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/BL2011/hash.json`).uri, // Nina - shitcoin jacket - 32

    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SC1456/hash.json`).uri, // McAfee.Design - when lambo - 33
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SC1556/hash.json`).uri, // McAfee.Design - when lambo - 34
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SC1666/hash.json`).uri, // McAfee.Design - when lambo - 35

    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SJ2011/hash.json`).uri, // stanislav - incognito - 36
  ]);
  await tx.wait();

  // Create children
  tx = await factory.createNewChildren([
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/AC1888/hash.json`).uri, // Album Corvum - ico suit - 37
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/CI2011/hash.json`).uri, // Album Corvum - ico suit - 38

    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SL7654/hash.json`).uri, // Album Corvum - defi shoe - 39
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/BV1000/hash.json`).uri, // Album Corvum - defi shoe - 40

    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SM2011/hash.json`).uri, // Msistema - The whale hunter - 41
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SC2011/hash.json`).uri, // Msistema - The whale hunter - 42
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SL2011/hash.json`).uri, // Msistema - The whale hunter - 43
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/GG1888/hash.json`).uri, // Msistema - The whale hunter - 44

    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/MG2011/hash.json`).uri, // Mar Guixa Studio - dao out - 45
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SM1259/hash.json`).uri, // Mar Guixa Studio - dao out - 46

    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/PF1345/hash.json`).uri, // Lorena Bello - the puurse v2 - 47
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/LB2366/hash.json`).uri, // Lorena Bello - the puurse v2 - 48
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/OL5555/hash.json`).uri  // Lorena Bello - the puurse v2 - 49
  ]);
  await tx.wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
