## Digitalax Smart Contracts

### Genesis NFT Metadata scripts

* Install dependencies `yarn`
* Create `.env` file with properties from `.env.example` 

### Config changes for mainnet

```
ACCESS_CONTROLS_ADDRESS=0x165Eec91620b7Bb96d02890d8a3F8Cb79a29195c
GENESIS_START=1604358000
GENESIS_END=1605481200
```

### Mainnet Deployments

* Phase 1 (Genesis NFT sale)
```
DigitalaxAccessControls: 0x165Eec91620b7Bb96d02890d8a3F8Cb79a29195c - Reviewed
DigitalaxGenesisNFT: 0x89505d2a27b7e8AC56252081d721ECd525E4241e - Reviewed
```

* Phase 2 (Parent and Child NFT tokens with Primary Auctions)
```
DigitalaxMaterials: TODO
DigitalaxGarmentNFT: TODO
DigitalaxGarmentFactory: TODO
DigitalaxAuction: TODO
```

### Rinkeby Deployments
```
DigitalaxAccessControls - 0xe2324f98F0fF1DaC348f633829Ed426462E813E3
DigitalaxGenesisNFT - 0x064A6151F99ba2610f2D6600Dcb2b2Ed3a276356
DigitalaxMaterials - 0x0963895b10b1311EF6fb84cAc5268904e34EdE38
DigitalaxGarment - 0x600Afa65bD9b3467F39F321c18C3E8c2FbdE990c
DigitalaxGarmentFactory - 0x1CC5e7699bF48CC3D41b7FE0998816ef892921C8
DigitalaxAuction - 0xC62F5508d4721EbdD3EB1C0cAC49FCD391672c6a
```

### Running tests

```
yarn test
```

### Coverage

```
yarn run coverage
```
