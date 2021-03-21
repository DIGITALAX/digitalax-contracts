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


### Mapping redeploy

AccessControls

Goerli 0x1dd28Ce255080092327915E13dD61979AbD220de
Mumbai 0xf7580d46080E1ce832aC44cF7224b906D44110B4

MONA

Goerli 0x8472ACaFc4C5c10a1762C7d6E74f13ED7B994f3d
Mumbai 0xeFd3D060dDcFed7903806503440db1089031AF3A

MATERIALS

Goerli 0xC3187267882115CC161Ca6B0aF69B22fCE569A6F
Mumbai 0xACe5A62D509aA947ffFfF55043b317bFc8316bc2

GARMENT

Goerli 0x4A4888101cdc49EBf936C2e078d6d3f12FD3a9EB
Mumbai 0x4CB61C672ff26c187394a9aA59360FbB6F23e83f

TUNNELS

Goerli 0xf9401A3A8e6EAB261D1f7384bd5204517eab3728
Mumbai 0x4CB61C672ff26c187394a9aA59360FbB6F23e83f


###WIP mumbai deployments

ACCESS_CONTROLS_ADDRESS=0xf7580d46080E1ce832aC44cF7224b906D44110B4
ERC1155_MATERIALS_ADDRESS=0xACe5A62D509aA947ffFfF55043b317bFc8316bc2
ERC721_GARMENT_ADDRESS=0x4CB61C672ff26c187394a9aA59360FbB6F23e83f
MONA_ORACLE_ADDRESS=0x79Af5034F575eAA57DF52E00BAE80543e5Dca6B7
AUCTION_ADDRESS=0x5890F309265870D508556E654FDf5903e51c3f37
GARMENT_FACTORY_ADDRESS=0x9cbDBAD2931D480513141AC8F970c2d27664F2E1
GARMENT_COLLECTION_ADDRESS=0xB2c7EBf9EB73978332Da95C528bd840811EC8858
MARKETPLACE_ADDRESS= 0x5561dE832d7Bb7Ffd38f190c44f847862960Aa3e (verified deployed with non uniswap oracle)
UNISWAP_FACTORY_ADDRESS= (unknown for quickswap still)
WETH_TOKEN_ADDRESS=0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa (?)
MONA_TOKEN_ADDRESS=0xeFd3D060dDcFed7903806503440db1089031AF3A


Mainnet 0x0b509f4b044f713a91bb50535914f7ad160532fe
Matic 0x728Af879c3212cEf7a51D7fC296b5e9b7c14dbf6