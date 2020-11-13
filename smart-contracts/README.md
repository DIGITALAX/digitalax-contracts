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
DigitalaxAccessControls - 0x386c30961E47c38f3aa899464FF4bBc9dF9949f5
DigitalaxGenesisNFT - 0x064A6151F99ba2610f2D6600Dcb2b2Ed3a276356
DigitalaxMaterials - 0x5988db41A39F4AB0d6DeB9cf99C74F691bbD236a
DigitalaxGarment - 0xBf379898e6C392Fe2A131046B8f3daE9A8748454
DigitalaxGarmentFactory - 0x4B613A9b2a9122bDa2240011da48f9C6a6964b20
DigitalaxAuction - 0x18ff4ECCf9397C4CEF2A8611a33CbD5052f3679E
```

### Running tests

```
yarn test
```

### Coverage

```
yarn run coverage
```
