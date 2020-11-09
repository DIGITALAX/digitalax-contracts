## Primary and Children NFTs

## DigitalaxMaterials (Child tokens - ERC-1155)

#### Creating new children

```solidity
function createChild(string calldata _uri) external returns (uint256 id)
function batchCreateChildren(string[] calldata _uris) external returns (uint256[] memory tokenIds)
```

#### Minting tokens from existing children 

```solidity
function mintChild(uint256 _childTokenId, uint256 _amount, address _beneficiary, bytes calldata _data)
function batchMintChildren(uint256[] calldata _childTokenIds, uint256[] calldata _amounts, address _beneficiary, bytes calldata _data)
```

#### Burning children 

```solidity
TODO
```

## DigitalaxGarmentNFT (Parent tokens - ERC-721)

```solidity
TODO
```

### DigitalaxGarmentFactory (Orchestrator for making child and parent tokens)

```solidity
function createNewChild(string calldata _uri) external returns (uint256 childTokenId)
function createNewChildren(string[] calldata _uris) external returns (uint256[] memory childTokenIds)
function mintParentWithChildren(string calldata garmentTokenUri, address designer, uint256[] calldata childTokenIds, uint256[] calldata childTokenAmounts, address beneficiary)
function mintParent(string calldata garmentTokenUri, address designer, address beneficiary)
```
