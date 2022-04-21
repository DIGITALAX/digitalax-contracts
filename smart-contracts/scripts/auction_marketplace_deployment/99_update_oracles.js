const OracleArtifact = require('../../artifacts/contracts/oracle/DigitalaxMonaOracle.sol/DigitalaxMonaOracle.json');
const DripOracleArtifact = require('../../artifacts/contracts/oracle/DripOracle.sol/DripOracle.json');
const CoinGeckoClient = require('coingecko-api-v3').CoinGeckoClient;

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
      'Burning with following address',
      deployerAddress
  );

  const ORACLE_ADDRESS = "0xee0b5f24d4b2cf80e3e54e9e5ff8acb9aff1f8a4";
  const DRIP_ORACLE_ADDRESS = "0x850068534c72317a762f0340500dee727ea85e29";

  const oracle = new ethers.Contract(
      ORACLE_ADDRESS,
      OracleArtifact.abi,
      deployer
  );
  const dripOracle = new ethers.Contract(
      DRIP_ORACLE_ADDRESS,
      DripOracleArtifact.abi,
      deployer
  );

    const client = new CoinGeckoClient({
      timeout: 10000,
      autoRetry: true,
    });

    const price = await client.simplePrice({ids: 'monavale', vs_currencies:'eth'});
    console.log(price);
    monaEthPrice = parseFloat(price.monavale.eth);
    const ethWei = 1000000000000000000;
    monaEthPrice = (monaEthPrice * ethWei).toString();
    console.log(monaEthPrice);

    console.log('Pushing Report to mona eth oracle');
    const tx = await oracle.pushReport(monaEthPrice);
    await tx.wait();

    const tx2 = await oracle.pushReport(monaEthPrice);
    await tx2.wait();

    const currencies =
        [
            {
                'currency': 'monavale',
                'contract': '0x6968105460f67c3BF751bE7C15f92F5286Fd0CE5'
            },
            {
                'currency': 'ethereum',
                'contract': '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'
            },

            {
                'currency': 'matic-network',
                'contract': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
            },

            {
                'currency': 'dai',
                'contract': '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'
            },

            {
                'currency': 'aave',
                'contract': '0xd6df932a45c0f255f85145f286ea0b292b21c90b'
            },

            {
                'currency': 'instadapp',
                'contract': '0xf50d05a1402d0adafa880d36050736f9f6ee7dee'
            }
        ]

    const names = [];
    const prices = [];
    const contractAddresses = [];
    for (let i = 0; i < currencies.length; i++) {
        const tokenName = currencies[i].currency;
        const contractAddress = currencies[i].contract;
        const price2 = await client.simplePrice({ids: tokenName, vs_currencies: 'usd'});
        let tokenPrice = 1 / parseFloat(price2[tokenName].usd);
        tokenPrice = tokenPrice * ethWei;
        tokenPrice = tokenPrice.toFixed(0);
        names.push(tokenName);
        prices.push(tokenPrice.toString());
        contractAddresses.push(contractAddress);
    }

    console.log(names);
    console.log(contractAddresses);
    console.log(prices);
    
    console.log('Pushing Report to drip oracle');
    const tx3 = await oracle.pushReports(contractAddresses, prices);
    await tx3.wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
