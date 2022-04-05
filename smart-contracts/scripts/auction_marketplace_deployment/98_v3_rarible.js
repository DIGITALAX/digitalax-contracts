const {
  BN
} = require('@openzeppelin/test-helpers');
const GarmentCollectionArtifact = require('../../artifacts/contracts/garment/DigitalaxGarmentCollectionV2.sol/DigitalaxGarmentCollectionV2.json');
const DigitalaxMarketplaceV2Artifact = require('../../artifacts/contracts/DigitalaxMarketplaceV2.sol/DigitalaxMarketplaceV2.json');
const DigitalaxMarketplaceV3Artifact = require('../../artifacts/contracts/DigitalaxMarketplaceV3.sol/DigitalaxMarketplaceV3.json');
import { createRaribleSdk } from "@rarible/sdk";
import FormData from "form-data"
import fetch from "node-fetch"

import { toContractAddress, toItemId, toOrderId } from "@rarible/types";
import Web3ProviderEngine from "web3-provider-engine"
import Wallet from "ethereumjs-wallet"
import { TestSubprovider } from "@rarible/test-provider"
// @ts-ignore
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import { EthereumWallet } from "@rarible/sdk-wallet"
import { ethers } from "ethers"
import { EthersEthereum } from "@rarible/ethers-ethereum"

export const getCurrency = (address) => ({
  "@type": "ERC20",
  contract: toContractAddress(
    // WETH address on Rinkeby/Ropsten testnets
    `POLYGON:${address}`
  ),
});

export const getTokenAddress = (id) => `POLYGON:${id}`;

export function initWallet(privateKey) {
	if (
		process.env["ETHEREUM_RPC_URL"] === undefined ||
    process.env["ETHEREUM_NETWORK_ID"] === undefined
	) {
		throw new Error("Provide ETHEREUM_RPC_URL, ETHEREUM_NETWORK_ID as environment variables!")
	}
	const provider = initNodeProvider(privateKey, {
		rpcUrl: process.env["ETHEREUM_RPC_URL"],
		networkId: +process.env["ETHEREUM_NETWORK_ID"],
	})
	//@ts-ignore
	const raribleEthers = new ethers.providers.Web3Provider(provider)

	//@ts-ignore
	const raribleProvider = new EthersEthereum(new ethers.Wallet(privateKey, raribleEthers))
	return new EthereumWallet(raribleProvider)
}



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

        console.log(`created offer ${i}`);

      //index = supply - max amount
      console.log(offer[4]);
      console.log(offer[4].toString());
      // const availableIndex = collection[0].length - Number.parseInt(offer[4].toString());
      const availableIndex = await marketplace.offers(i);
      console.log('availableIndex');
      console.log(availableIndex[3]);


      } catch(e){
        console.log(i);
        console.log(e);
      }


      const raribleSdkWallet = initWallet(PRIVATE_KEY)
		//@ts-ignore
		const raribleSdk = createRaribleSdk(raribleSdkWallet, "prod", { fetchApi: fetch })

      const address = await getMonaContractAddressByChainId(chainId);
      const tokenMultichainAddress = getTokenAddress(tokenId);
      const currency = getCurrency(address);
      const amount = 1;

      const orderRequest = {
          itemId: toItemId(tokenMultichainAddress),
        };

        const orderResponse = await raribleSdk.order.sell(orderRequest);
        const response = await orderResponse.submit({
          amount,
          price,
          currency,
          //2 years expiry
          expirationDate: new Date(Date.now() + 60 * 60 * 1000 * 8760 * 2),
          payouts: [{
            account: toUnionAddress("<PAYOUT_ADDRESS>"),
            //85%
            value: 8500,
        },
              {
            account: toUnionAddress("<PAYOUT_ADDRESS>"),
            //15%
            value: 1500,
        }
        ],
        });

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
