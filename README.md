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


### Mappings
MONA

Goerli 0x0f04bD6A5987FaCD756431976c1D74743e3dcac7
Mumbai 0xa80d3d77Aece6ff14E6f2d7789581f5820374A13

MATERIALS

Goerli 0x6c9a3dd0aff75e91b99e2789c715eb6fceef15bd
Mumbai 0xaDd47B92Be97CaaF33517DC411E58e93C34fa238

GARMENT
Goerli 0x9f9738995ce161257fea1c130257944621013b4b
Mumbai 0x0f04bD6A5987FaCD756431976c1D74743e3dcac7

Root tunnel  on goerli 0xadd47b92be97caaf33517dc411e58e93c34fa238
Child tunnel on mumbai 0x0f04bD6A5987FaCD756431976c1D74743e3dcac7
