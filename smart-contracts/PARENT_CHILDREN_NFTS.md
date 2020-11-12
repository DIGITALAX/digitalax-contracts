## Primary and Children NFT Top Down Relationship

```
Garment (ERC-721) a.k.a parent
  |
  ▼
Strand / Swatches  (ERC-1155) a.k.a. children
```

## DigitalaxGarmentFactory (Orchestrator for making child and parent tokens)

* Responsible for facilitating the minting of both children and parent tokens and linking those together if needed.
* The caller must have the `minter` role to do this
* Creating garments and then wrapping would otherwise be a two stage process and this is done in 1 TX through the factory
* However, in order to create and wrap a garment, the strands / children have to exist in the 1155 contract. Therefore, if the children that you want to wrap within a garment do not exist, creating a garment is a 2 step process as defined below.
* If children exist for a garment, you can skip step 1 below. 

#### Step 1 - setting up the children

* The methods below define new ERC1155 semi-fungible tokens - these tokens can then have a supply
* There is no check to ensure the same token URI is not used across unique ERC-1155 tokens. Therefore, you could in theory make 2 1155s using the same `_uri` parameter.

```solidity
function createNewChild(string calldata _uri) external returns (uint256 childTokenId)
function createNewChildren(string[] calldata _uris) external returns (uint256[] memory childTokenIds)
```

#### Step 2 - minting garments 

* `mintParentWithChildren` will increase the supply of the given children token IDs via minting
* It is the responsibility of the caller to provide the correct amounts and IDs which are aligned via array index 
* If 1155 tokenIds are provided which do not yet exist, the method will revert
* The above does not apply if minting a garment with no children

```solidity
function mintParentWithChildren(string calldata garmentTokenUri, address designer, uint256[] calldata childTokenIds, uint256[] calldata childTokenAmounts, address beneficiary)
function mintParentWithoutChildren(string calldata garmentTokenUri, address designer, address beneficiary)
```

## DigitalaxMaterials (Child tokens - ERC-1155)

#### Creating new children

* Can only be called by an account which has the `SMART_CONTRACT` role
* The methods will create a new token ID for the given URI(s)
    * Tokens can have duplicate URIs
* When creating new tokens - they have a total supply of zero

```solidity
function createChild(string calldata _uri) external returns (uint256 id)
function batchCreateChildren(string[] calldata _uris) external returns (uint256[] memory tokenIds)
```

#### Minting tokens from existing children 

* Increases the supply of the provided child token(s) for the given amount(s)
* Can only be called by an account which has the `SMART_CONTRACT` role

```solidity
function mintChild(uint256 _childTokenId, uint256 _amount, address _beneficiary, bytes calldata _data)
function batchMintChildren(uint256[] calldata _childTokenIds, uint256[] calldata _amounts, address _beneficiary, bytes calldata _data)
```

#### Burning children

* An owner of 1155 children or an approved operator of someone else's children has the ability to burn those children as they wish
* This would reduce the supply of any children burnt

```solidity
function burn(address account, uint256 id, uint256 amount)
function burnBatch(address account, uint256[] memory ids, uint256[] memory amounts)
``` 

### Wrapping children in parent (Garment) nfts

* There are currently 2 ways of wrapping 1155 children in parent NFTs. Either through:
    * Minting
    * Transferring

Whichever method is used, there are business rules that govern when this is allowed. A wrapping of children 1155 tokens in a parent 721 garment is allowed when:
* A 1155 birthing event has occured i.e. new 1155 children have been minted either directly or through the garment factory
* The owner of both children and a garment is either:
    * Topping up the balance of a child or,
    * Adding a new child to the garment
    
One final stipulation is that when an owner of a garment wants to add a new child (not top up a child's balance), they can do so provided they have (and will not) not exceeded the maximum amount of children that a garment can wrap. This is controlled by the `maxChildrenPerToken` variable and is needed to prevent certain loops running out of GAS. 

#### Wrapping through minting

* It is possible to use either mint methods above to atomically wrap children in Garment ERC721 parent NFTs (which is what the Garment NFT factory does)
    * The `_beneficiary` would need to be the address of the ERC721 parent contract
    * The `_data` parameter would have to be `abi.encodePacked(${PARENT_TOKEN_ID})`

#### Wrapping through transferring

* If atomically wrapping children in a single garment as part of a transfer, the parameter requirements are:
    * `to` is the address of the garment parent NFT contract
    * `data` would have to be `abi.encodePacked(${PARENT_TOKEN_ID})`

```
function safeTransferFrom(
         address from,
         address to,
         uint256 id,
         uint256 amount,
         bytes memory data
     )

function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
```

But remember the business rules stipulated above; Only the owner of both 1155 children and the target parent token ID can perform this operation if they do not exceed the max children rule.

## DigitalaxGarmentNFT (Parent tokens - ERC-721)

#### Burning garments 

* In order for a garment owner to get access to the embedded 1155 child tokens, a user must burn it🔥 
* Burning a token is a one way process with the output being 1155 child tokens if and only if the token owned any children
* Only the token owner or an approved operator of someone else's token can burn their own token

```solidity
function burn(uint256 _tokenId)
```
