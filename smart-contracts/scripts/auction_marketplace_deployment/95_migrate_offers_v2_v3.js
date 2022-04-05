const {
  BN
} = require('@openzeppelin/test-helpers');
const GarmentCollectionArtifact = require('../../artifacts/contracts/garment/DigitalaxGarmentCollectionV2.sol/DigitalaxGarmentCollectionV2.json');
const DigitalaxMarketplaceV2Artifact = require('../../artifacts/contracts/DigitalaxMarketplaceV2.sol/DigitalaxMarketplaceV2.json');
const DigitalaxMarketplaceV3Artifact = require('../../artifacts/contracts/DigitalaxMarketplaceV3.sol/DigitalaxMarketplaceV3.json');


async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  const {ERC721_GARMENT_ADDRESS} = process.env;
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);

  const GARMENT_COLLECTION_ADDRESS = '0x721f7c76e447174141a761ce3e80ad88e5e07047';
  const MARKETPLACE_ADDRESS = '0x8F235A04cC541efF19Fd42EFBfF0FCACAdd09DBC';
  const V3_ADDRESS = '0x498bbac12E88C95ef97c95d9F75fC4860c7BE1cc';

  const garmentCollection = new ethers.Contract(
      GARMENT_COLLECTION_ADDRESS,
      GarmentCollectionArtifact.abi,
      deployer
  );

  const marketplace = new ethers.Contract(
      MARKETPLACE_ADDRESS,
      DigitalaxMarketplaceV2Artifact.abi,
      deployer
  );
  const v3 = new ethers.Contract(
      V3_ADDRESS,
      DigitalaxMarketplaceV3Artifact.abi,
      deployer
  );


  //// SETTINGS

  const reservePrice_conversion = 1886792452830188; // $1 of mona // TODO

 // const test_startTime = '1606347000'; // 11/25/2020 @ 11:30pm (UTC) | 3:30pm pst November 25th

  const mainnet_startTime = '1648652451';
  const mainnet_endTime = '1711825251';

  for (let i = 625; i <= 900; i++) {

    const collection = await garmentCollection.getCollection(i);
    console.log("---------"); // TODO start here
    console.log(i); // TODO start here
    console.log('collection length'); // TODO start here
    console.log(collection[0].length); // TODO start here

    const offer = await marketplace.getOffer(i);
    console.log('offer');
    console.log(offer);
    //    offer.primarySalePrice,
    //             offer.startTime,
    //             offer.endTime,
    //             availableAmount,
    //             offer.platformFee,
    //             offer.discountToPayERC20
    const price = (new BN(offer[0].toString()).mul(new BN('367'))).toString();
    console.log(price);
    console.log('here we go');
    if(price === '0'){
      console.log('no price, no offer');
    }
    if (collection[0].length > 0 && price !== '0') {
      try {
        console.log('creating the offer');
        // Create a marketplace offer for this exclusive parent nft
        const createOfferTx = await v3.createOffer(
            i, // Collection id
            price, // reservePrice for all collection items
            mainnet_startTime, // Marketplace buy offer available after start time
            mainnet_endTime, // Marketplace buy offer available after start time
            offer[4].toString(),
            collection[0].length,
            [], []
        );


        await createOfferTx.wait();
        console.log(`created offer ${i}`);

      //index = supply - max amount
      console.log(offer[4]);
      console.log(offer[4].toString());
      // const availableIndex = collection[0].length - Number.parseInt(offer[4].toString());
      const availableIndex = await marketplace.offers(i);
      console.log('availableIndex');
      console.log(availableIndex[3]);

      const updateAvailableIndexTx = await v3.updateOfferAvailableIndex(i, availableIndex[3]);
      await updateAvailableIndexTx.wait();
      } catch(e){
        console.log(i);
        console.log(e);
      }
      console.log('available index updated');

      console.log(`--Marketplace created for collection--`);
      console.log(`----------------------`);
    }
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
