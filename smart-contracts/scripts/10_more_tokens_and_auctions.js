const FactoryArtifact = require('../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../artifacts/DigitalaxAuction.json');
const {DESIGNERS} = require('./constants');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    'Deploying auction with signer address:',
    deployerAddress
  );

  const {
    AUCTION_ADDRESS,
    GARMENT_FACTORY_ADDRESS,
  } = process.env;

  console.log(`AUCTION_ADDRESS found [${AUCTION_ADDRESS}]`);
  console.log(`GARMENT_FACTORY_ADDRESS found [${GARMENT_FACTORY_ADDRESS}]`);

  const factory = new ethers.Contract(
    GARMENT_FACTORY_ADDRESS,
    FactoryArtifact.abi,
    deployer
  );

  /////////////////////
  // Create Children //
  /////////////////////

  // Create children
  let tx = await factory.createNewChildren([
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SD1820/hash.json`).uri, // 3dBehemoth/deigo / HODL King - 19
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/SD1830/hash.json`).uri, // 3dBehemoth/deigo / HODL King - 20
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/BM1111/hash.json`).uri, // 3dBehemoth/deigo / HODL King - 21
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/GB2345/hash.json`).uri, // 3dBehemoth/deigo / HODL King - 22

    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/BF4433/hash.json`).uri, // Stanislav Mclygin / crypto winter - 23
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/PP3248/hash.json`).uri, // Stanislav Mclygin / crypto winter - 24
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/PF4422/hash.json`).uri, // Stanislav Mclygin / crypto winter - 25

    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/LN4545/hash.json`).uri, // Christina Lalch / Bitcoin for pizza - 26
    require(`../../../nft-minting-scripts/auction-metadata/token-data/children/EC1116/hash.json`).uri  // Christina Lalch / Bitcoin for pizza - 27
  ]);
  await tx.wait();

  // 3dBehemoth/deigo / HODL King
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/deigo/hash.json').uri, // garmentTokenUri - 7
    DESIGNERS._3dBehemoth, // designer
    ['19', '20', '21', '22'], // childTokenIds
    ['1', '1', '1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Stanislav Mclygin / crypto winter
  await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/crypto_winter/hash.json').uri, // garmentTokenUri - 8
    DESIGNERS.stanislav, // designer
    ['23', '24', '25'], // childTokenIds
    ['1', '1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );

  // Christina Lalch / Bitcoin for pizza
  tx = await factory.mintParentWithChildren(
    require('../../../nft-minting-scripts/auction-metadata/token-data/parents/christina/hash.json').uri, // garmentTokenUri - 9
    DESIGNERS.christina, // designer
    ['26', '27'], // childTokenIds
    ['1', '1'], // childTokenAmounts
    deployerAddress // beneficiary
  );
  await tx.wait();

  ////////////////////
  // Create Auction //
  ////////////////////

  const auction = new ethers.Contract(
    AUCTION_ADDRESS,
    AuctionArtifact.abi,
    deployer
  );

  const reservePrice = '100000000000000000';
  const startTime = '1606260600'; // 11/24/2020 @ 11:30pm (UTC) | 3:30pm pst November 24th
  const endTime = '1606865400';   // 12/01/2020 @ 11:30pm (UTC) | 3:30pm pst December 1st

  // 3dBehemoth/deigo / HODL King
  await auction.createAuction(
    7,
    reservePrice,
    startTime,
    endTime
  );

  // 3dBehemoth/deigo / HODL King
  await auction.createAuction(
    8,
    reservePrice,
    startTime,
    endTime
  );

  // 3dBehemoth/deigo / HODL King
  await auction.createAuction(
    9,
    reservePrice,
    startTime,
    endTime
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
