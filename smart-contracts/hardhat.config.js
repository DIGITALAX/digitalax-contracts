require('dotenv').config();
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-truffle5');
require('hardhat-gas-reporter');
require('solidity-coverage');
require('@nomiclabs/hardhat-solhint');
require('hardhat-contract-sizer');
require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');


const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  gasReporter: {
    currency: 'USD',
    enabled: false,
    gasPrice: 50
  },
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: 120000000000
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/6e9690131f584ee0a8b445ebb4740f8b`,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: 1000000000
    },
    matic: {
     url: `https://polygon-mainnet.infura.io/v3/6e9690131f584ee0a8b445ebb4740f8b`,
     //url: `https://matic-mainnet-full-rpc.bwarelabs.com`,
     // url: `https://rpc-mainnet.matic.network`,
   // url: `https://matic-mainnet.chainstacklabs.com`,
      //url: `https://matic-mainnet.chainstacklabs.com`,
      //url: `https://rpc-mainnet.maticvigil.com/v1/293c0f4455f0a5933014c66d2fb84f7ca257d16b`,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: 10000000000,
      timeout: 3600000
    },
    coverage: {
      url: 'http://localhost:8555',
    }
  },
  mocha: {
    timeout: 2000000
  }
};
