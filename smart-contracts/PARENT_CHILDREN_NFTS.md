## Primary and Children NFTs

```
Parent (ERC-721) a.k.a parent
  |
  ▼
Child  (ERC-1155) a.k.a. children
```

### DigitalaxGarmentFactory (Orchestrator for making child and parent tokens)

* Responsible for facilitating the minting of both children and parent tokens and linking those together if needed.
* The caller must have the `minter` role to do this
* Creating garments is a two stage process

#### Stage 1 - setting up the token

* These methods define new ERC1155 semi-fungible tokens - these tokens can then have a supply
* There is no check to ensure the same token URI is not used to make multiple sets of ERC-1155 tokens. If these methods
are called twice with the same `_uri`, two tokens with different IDs are created but with the same `metadata` `uri`.

```solidity
function createNewChild(string calldata _uri) external returns (uint256 childTokenId)
function createNewChildren(string[] calldata _uris) external returns (uint256[] memory childTokenIds)
```

#### Stage 2 - minting these created tokens 

* These methods will increase the supply of the given children token IDs
* It is the responsibility of the caller to provide the correct amounts and IDs which are aligned via array index 
* If tokenIds are provided which do not yet exist, the method will revert

```solidity
function mintParentWithChildren(string calldata garmentTokenUri, address designer, uint256[] calldata childTokenIds, uint256[] calldata childTokenAmounts, address beneficiary)
function mintParentWithoutChildren(string calldata garmentTokenUri, address designer, address beneficiary)
```

## DigitalaxMaterials (Child tokens - ERC-1155)

#### Creating new children

* Can only be called by an account who has the `SMART_CONTRACT` role
* Create a new token ID for the given URI
    * Tokens can have duplicate URIs
* When creating new tokens - they have a balance of zero

```solidity
function createChild(string calldata _uri) external returns (uint256 id)
function batchCreateChildren(string[] calldata _uris) external returns (uint256[] memory tokenIds)
```

#### Minting tokens from existing children 

* Increases the supply of the provided child tokens for the given amounts
* Can only be called by an account who has the `SMART_CONTRACT` role
* If creating tokens to embedded within another 721 token, `msg.data` must be an encoded `tokenId`

```solidity
function mintChild(uint256 _childTokenId, uint256 _amount, address _beneficiary, bytes calldata _data)
function batchMintChildren(uint256[] calldata _childTokenIds, uint256[] calldata _amounts, address _beneficiary, bytes calldata _data)
```

#### Burning children 

* In order for a token owner to get access to the embedded 1155 child tokens, a user must burn it. 
* Burning a token is a one way process
* Only the token owner can burn their own token

```solidity
TODO
```

## DigitalaxGarmentNFT (Parent tokens - ERC-721)

```solidity
TODO
```
