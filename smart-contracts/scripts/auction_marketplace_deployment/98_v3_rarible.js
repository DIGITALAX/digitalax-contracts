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
const HDWalletProvider = require('@truffle/hdwallet-provider');
// @ts-ignore
const RpcSubprovider = require( "web3-provider-engine/subproviders/rpc");

const raribleTypes = require ("@rarible/types");
const LogsLevel = require('@rarible/sdk/build/domain').LogsLevel;

const sdkwallet = require( "@rarible/sdk-wallet")
const EthersEthereum = require("@rarible/ethers-ethereum").EthersEthereum;
const Web3 = require("web3");
const Web3Ethereum = require("@rarible/web3-ethereum").Web3Ethereum;



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
	//const provider = new Web3ProviderEngine({ pollingInterval: 100 })
	const privateKey = pk.startsWith("0x") ? pk.substring(2) : pk

   // const wallet = new ethjswallet(Buffer.from(privateKey, "hex"));
	const provider = new HDWalletProvider(privateKey, config.rpcUrl)


	// provider.addProvider(new RpcSubprovider({ rpcUrl: config.rpcUrl }));
	//provider.start()
	return provider;
}
function initWallet(privateKey) {

	const provider = initNodeProvider(privateKey, {
		// rpcUrl: "https://polygon-rpc.com",
		// rpcUrl: "https://matic-mainnet.chainstacklabs.com",
		rpcUrl: "https://node-mainnet-polygon.rarible.com",
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

async function initWalletWeb3(privateKey) {
  const provider = new HDWalletProvider(privateKey, "https://polygon-rpc.com")
  const web3 = new Web3(provider)

  const account = await web3.eth.accounts.privateKeyToAccount(privateKey);
  await web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address
  console.log(await web3.eth.getAccounts())
  const web3Ethereum = new Web3Ethereum({
    web3,
    gas: 500000
  })
  return new sdkwallet.EthereumWallet(web3Ethereum)
}


async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Deploying and setting up collections on marketplace with the following address:',
      deployerAddress
  );
  const ERC721_GARMENT_ADDRESS = "0x7b2a989c4d1ad1b79a84ce2eb79da5d8d9c2b7a7";
  const { PRIVATE_KEY} = process.env;
  console.log(`ERC721_GARMENT_ADDRESS found [${ERC721_GARMENT_ADDRESS}]`);

  const GARMENT_COLLECTION_ADDRESS = '0x721f7c76e447174141a761ce3e80ad88e5e07047';
  const MARKETPLACE_ADDRESS = '0x8F235A04cC541efF19Fd42EFBfF0FCACAdd09DBC'; // Currently migrating from v2 marketplace MONA values
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

   const raribleSdkWallet = await initWallet(PRIVATE_KEY)

  const raribleSdk = RaribleSDK.createRaribleSdk(raribleSdkWallet, "prod",  {logs: LogsLevel.DISABLED});

   //const raribleSdk = RaribleSDK.createRaribleSdk(raribleSdkWallet, "prod", { fetchApi: fetchy })

  // TODO *************************** change the collection number here below - it is garment collection v2 collection
  const FIRST_COLLECTION = 16;
  const LAST_COLLECTION = 20;
  for (let i = FIRST_COLLECTION; i <= LAST_COLLECTION; i++) {

    const collection = await garmentCollection.getCollection(i);

    const offer = await marketplace.getOffer(i);
    console.log('------------');
    console.log('Collection number');
    console.log(i);

    const price = (new BN(offer[0].toString())).toString();
    let priceNum = parseFloat(price) / 1000000000000000000;

    console.log(priceNum);
    if(price === '0'){
      console.log('no price, no offer');
    }
    if (collection[0].length > 0 && price !== '0') {

        console.log('creating the offer');
        // Create a marketplace offer for this exclusive parent nft

      //index = supply - max amount
      console.log("price");
      console.log(offer[0]);

      let fee = parseFloat(offer[4].toString()) * 10;
      let designerCut = 10000 - fee;

    for(let j=0; j <collection[0].length; j++) {
      try {
        let tokenId = collection[0][j];

        const priceValue = priceNum.toString()
        console.log('Collection id');
        console.log(i);
        console.log('tokenId');
        console.log(tokenId.toString());

        const nftDesigner = await nft.garmentDesigners(tokenId);
        console.log('nftDesigner');
        console.log(nftDesigner);

        console.log("platform fee %");
        console.log(fee / 100);
        console.log("designer fee %");
        console.log(designerCut / 100);

        const owner = await nft.ownerOf(tokenId);
        if(owner == deployerAddress){
           const address = await getMonaContractAddress();
          const tokenMultichainAddress = getTokenAddress(ERC721_GARMENT_ADDRESS + ":" + tokenId);
          console.log(tokenMultichainAddress);
          const currency = getCurrency(address);
          const amount = 1;
          console.log('creating order, price in MONA is:');
          console.log(priceNum);

          const orderRequest = {
              itemId: raribleTypes.toItemId(tokenMultichainAddress),
            };


            const orderResponse = await raribleSdk.order.sell(orderRequest);

            const response = await orderResponse.submit({
              amount,
              price: priceValue,
              currency,
              //2 years expiry
              expirationDate: new Date(Date.now() + 60 * 60 * 1000 * 8760 * 2),
              payouts: [{
                account: raribleTypes.toUnionAddress("ETHEREUM:0xaa3e5ee4fdc831e5274fe7836c95d670dc2502e6"), // Emma receiving address
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

        } else{
          console.log("not owner, moving on...");
        }

        console.log("----------------------");
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
