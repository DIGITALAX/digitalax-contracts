# Digitalax Monorepo

## Smart Contracts

* Built using [buidler/hardhat](https://buidler.dev/) 
* Contracts based on [OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts)

### Setup

* Move to repo folder `cd smart-contracts`
* Install dependencies `yarn`
* Run tests `yarn test`
* Run test with `GAS` profiling `yarn test-with-gas`

### Ropsten Deployments
```
DigitalaxAccessControls: 0x5c9526E67d2C7b2658d0A510f4cFcc28edc4cC96
DigitalaxGenesisNFT: 0x42321F5443480cbAA0FE76187f73Bd06Db125111
```

## Genesis Metadata

* Located in `./genesis-metadata/`
* Scripts folder for generating and storing the metadata required for the genesis auction
* IPFS provider used [pinata.cloud](https://pinata.cloud/)

### Subgraph

* Responsible for indexing events/data from the Digitalax contracts
* Hosted subgraph details can be found [here](https://hackmd.io/RzmT0y91ReyRmrh084ShNA)
