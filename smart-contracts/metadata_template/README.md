## Garment Parent and Child NFT Metadata

This directory contains the metadata structure and examples for the DIGITALAX Parent and Child NFTS

Metadata on IPFS is stored in JSON format and allows to define the characteristics of a given NFT, this can be consumed by the DIGITALAX website and others to build up the content value of a token.

>The Parent NFT conforms with the ERC721 Protocol

>The Child NFT conforms with the ER1155 Protocol

This metadata is stored on IPFS and it's IPFS link is stored as the URI identifier of the NFTs.

### Parent ERC721 NFT Structure
```
{
    "name": "",
    "description": "",
    "external_url": "https://www.digitalax.xyz",
    "image": "https://gateway.pinata.cloud/ipfs/<IPFS Hash>",
    "attributes": [
        {
            "trait_type": "Designer",
            "value": ""
        },
        {
            "trait_type": "Collection",
            "value": ""
        },
        {
            "trait_type": "Auction",
            "value": ""
        },
        {
            "trait_type": "Outfit",
            "value": ""
        },
        {
            "trait_type": "Rarity",
            "value": ""
        }
    ]
}
```

### Child ERC1155 NFT Structure
```
{
  "Artist Name": " ",
  "Description": ",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": " "
    },
    {
      "trait_type": "Type",
      "value": " "
    },
    {
      "trait_type": "Issue No.",
      "value": " "
    }
  ],
  "files": {
    "graphic": " "
  }
}
```