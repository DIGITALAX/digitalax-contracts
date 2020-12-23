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
DigitalaxMaterials: 0xe6822e8b4d91b85f9ca00cca79bf92bab14bc221
DigitalaxGarmentNFT: 0x0b509f4b044f713a91bb50535914f7ad160532fe
DigitalaxGarmentFactory: 0xe4d5d731f71cCAFe4e571961A825Ba7bE2E7405a
DigitalaxAuction: 0xd84E216a4804A5e6BAa4f936838E4a3d1A0D3C53
```

### Rinkeby Deployments
```
DigitalaxAccessControls - 0xe2324f98F0fF1DaC348f633829Ed426462E813E3
DigitalaxGenesisNFT - 0x064A6151F99ba2610f2D6600Dcb2b2Ed3a276356
DigitalaxMaterials - 0x80E71735A8234Fb761B9Db16519D319B8628d6F4
DigitalaxGarment - 0xbA1b4438Eb1Ff572d467b820330AabeE9A241947
DigitalaxGarmentFactory - 0x13F6dac9C6b216AB43418680f5000e6D875b908D
DigitalaxAuction - 0x70D097AbFFC8f78a837242a1f0ACF9Ef703fd899
```

### Running tests

```
yarn test
```

### Coverage

```
yarn run coverage
```

### Deployment scripts

```
npx buidler run --network rinkeby scripts/1_deploy_access_controls.js
```
