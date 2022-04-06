const {
  BN
} = require('@openzeppelin/test-helpers');
const GarmentCollectionArtifact = require('../../artifacts/contracts/garment/DigitalaxGarmentCollectionV2.sol/DigitalaxGarmentCollectionV2.json');
const DigitalaxMarketplaceV2Artifact = require('../../artifacts/contracts/DigitalaxMarketplaceV2.sol/DigitalaxMarketplaceV2.json');
const DigitalaxMarketplaceV3Artifact = require('../../artifacts/contracts/DigitalaxMarketplaceV3.sol/DigitalaxMarketplaceV3.json');
const DigitalaxGarmentV2Artifact = require('../../artifacts/contracts/garment/DigitalaxGarmentNFTv2.sol/DigitalaxGarmentNFTv2.json');
const RaribleSDK = require("@rarible/sdk");
const fetchy = require ("node-fetch").default;
const FormData = require ("form-data");
const Web3ProviderEngine = require("web3-provider-engine");

const ethjswallet = require( "ethereumjs-wallet").default;
const TestSubprovider = require( "@rarible/test-provider").TestSubprovider;
// @ts-ignore
const RpcSubprovider = require( "web3-provider-engine/subproviders/rpc");

const raribleTypes = require ("@rarible/types");

const sdkwallet = require( "@rarible/sdk-wallet")
const EthersEthereum = require("@rarible/ethers-ethereum").EthersEthereum;


const getCurrency = (address) => ({
  "@type": "ERC20",
  contract: raribleTypes.toContractAddress(
    // WETH address on Rinkeby/Ropsten testnets
    `POLYGON:${address}`
  ),
});

function updateNodeGlobalVars() {
	(global).FormData = FormData;
	(global).window = {
		fetch: fetchy,
		dispatchEvent: () => {},
	};
	(global).CustomEvent = function CustomEvent() {
		return
	}
}

const getTokenAddress = (id) => `POLYGON:${id}`;
function initNodeProvider(pk, config) {
	const provider = new Web3ProviderEngine({ pollingInterval: 100 })
	const privateKey = pk.startsWith("0x") ? pk.substring(2) : pk

    const wallet = new ethjswallet(Buffer.from(privateKey, "hex"));
	provider.addProvider(new TestSubprovider(wallet, { networkId: config.networkId, chainId: config.networkId }))
	provider.addProvider(new RpcSubprovider({ rpcUrl: config.rpcUrl }))
	provider.start()
	return provider
}
function initWallet(privateKey) {

	const provider = initNodeProvider(privateKey, {
		rpcUrl: "https://polygon-rpc.com",
		networkId: 137,
	})
	//@ts-ignore
	const raribleEthers = new ethers.providers.Web3Provider(provider)

	//@ts-ignore
	const raribleProvider = new EthersEthereum(new ethers.Wallet(privateKey, raribleEthers))
	return new sdkwallet.EthereumWallet(raribleProvider)
}

const getMonaContractAddress= () => {
  return "0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5";
};


async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );

  const {ERC721_GARMENT_ADDRESS, PRIVATE_KEY} = process.env;
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);

  const GARMENT_COLLECTION_ADDRESS = '0x721f7c76e447174141a761ce3e80ad88e5e07047';
  const MARKETPLACE_ADDRESS = '0x8F235A04cC541efF19Fd42EFBfF0FCACAdd09DBC';
  const V3_ADDRESS = '0x498bbac12E88C95ef97c95d9F75fC4860c7BE1cc';

  const nft = new ethers.Contract(
      ERC721_GARMENT_ADDRESS,
      DigitalaxGarmentV2Artifact.abi,
      deployer
  );
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

  updateNodeGlobalVars();


  for (let i = 16; i <= 20; i++) {

    const collection = await garmentCollection.getCollection(i);

    const offer = await marketplace.getOffer(i);
    console.log('offer');
    console.log(offer);

    const price = (new BN(offer[0].toString()).mul(new BN('1'))).toString();
    console.log(price);
    console.log('here we go');
    if(price === '0'){
      console.log('no price, no offer');
    }
    if (collection[0].length > 0 && price !== '0') {

        console.log('creating the offer');
        // Create a marketplace offer for this exclusive parent nft

        console.log(`created offer ${i}`);

      //index = supply - max amount
      console.log("price");
      console.log(offer[0]);
      console.log("platform fee");
      const fee = parseFloat(offer[4].toString()) * 10;
      const designerCut = 10000 - fee;

      console.log(offer[4]);
      console.log(fee);
      console.log(offer[4].toString());
      // const availableIndex = collection[0].length - Number.parseInt(offer[4].toString());
      const availableIndex = await marketplace.offers(i);
      console.log('availableIndex');
      console.log(availableIndex[3]);

    for(let j=0; j <collection[0].length; j++) {
      try {
        const tokenId = 101480; // This
        const nftDesigner = await nft.garmentDesigners(tokenId);
        console.log('nftDesigner');
        console.log(nftDesigner);

      const raribleSdkWallet = initWallet(PRIVATE_KEY)

		const raribleSdk = RaribleSDK.createRaribleSdk(raribleSdkWallet, "prod", { fetchApi: fetchy })

      const address = await getMonaContractAddress();
      const tokenMultichainAddress = getTokenAddress(ERC721_GARMENT_ADDRESS + ":" + tokenId);
      const currency = getCurrency(address);
      const amount = 1;
      console.log('creating order');
      console.log(price);
      console.log(currency);
      console.log(currency);

      const orderRequest = {
          itemId: raribleTypes.toItemId(tokenMultichainAddress),
        };

      console.log('orderRequest');
      console.log(orderRequest);

        const orderResponse = await raribleSdk.order.sell(orderRequest);


        console.log('got order response');
        const response = await orderResponse.submit({
          amount,
          price,
          currency,
          //2 years expiry
          expirationDate: new Date(Date.now() + 60 * 60 * 1000 * 8760 * 2),
          payouts: [{
            account: raribleTypes.toUnionAddress("ETHEREUM:0xaa3e5ee4fdc831e5274fe7836c95d670dc2502e6"), // Emma receiving address
            //85%
            value: fee,
        },
              {
            account: raribleTypes.toUnionAddress("ETHEREUM:" + nftDesigner),
            //15%
            value: designerCut,
        }
        ],
        });
        console.log("order submitted");

      } catch (e) {
        console.log("error submitting order"
        );
        console.log(j);
        console.log(e);
      }
    }



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
