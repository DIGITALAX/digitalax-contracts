### Genesis NFT Metadata scripts

* Install dependencies `yarn`
* Create `.env` file with properties from `.env.example` 

### Config changes for mainnet

```
ACCESS_CONTROLS_ADDRESS=0x165Eec91620b7Bb96d02890d8a3F8Cb79a29195c
GENESIS_START=1604358000
GENESIS_END=1605481200
```

### Mainnet Deployment

* Phase 1 (Genesis NFT sale)
```
DigitalaxAccessControls: 0x165Eec91620b7Bb96d02890d8a3F8Cb79a29195c - Reviewed
DigitalaxGenesisNFT: 0x89505d2a27b7e8AC56252081d721ECd525E4241e - Reviewed
```

* Phase 2 (Master and Strand Garments with Primary Auctions)
```
DigitalaxMaterials: TODO
DigitalaxGarmentNFT: TODO
DigitalaxGarmentFactory: TODO
DigitalaxAuction: TODO
```

### Rinkeby Deployment
```
DigitalaxAccessControls - 0x386c30961E47c38f3aa899464FF4bBc9dF9949f5
DigitalaxGenesisNFT - 0x064A6151F99ba2610f2D6600Dcb2b2Ed3a276356
DigitalaxMaterials - 0xBDC713fe557B1872DDad51cB5Fa55f9Fd2D887Aa
DigitalaxGarment - 0x31f6b2c80f5278B9E0Cb60618470797B5C9757bA
DigitalaxGarmentFactory - 0xF7020EB4F75Bc562d26632f95e278E4aB93a1161
DigitalaxAuction - 0x0A2833042d13A64b4b48cF11B05fEEFA3c5daA21
```

### Coverage

```
yarn run coverage
```
