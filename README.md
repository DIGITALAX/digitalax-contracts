# Digitalax Monorepo

## Smart Contracts

* Built using [buidler/hardhat](https://buidler.dev/) 
* Contracts based on [OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts)

### Setup

* Move to repo folder `cd smart-contracts`
* Install dependencies `yarn`
* Run tests `yarn test`

#### Running GAS reports
* in its own terminal tab run: `npx buidler node`
* Run test with `GAS` profiling `yarn test-with-gas`

## Metadata

*  See project [nft-minting-scripts](https://github.com/DIGITALAX/nft-minting-scripts)

### Subgraph

* Responsible for indexing events/data from the Digitalax contracts
* Hosted subgraph details can be found [here](https://hackmd.io/RzmT0y91ReyRmrh084ShNA)
