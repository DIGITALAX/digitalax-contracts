### Primary Auction flow

The contract `DigitalaxAuction` is responsible for handling the primary sale of parent NFTs. The auction itself only deals 
with ERC-721 tokens, also known as `Parent` tokens.

Parent tokens can however hold other ERC-1155 tokens, also known as `Child` tokens. 
The owner of the 721 token is also implicitly the owner of any embedded 1155 tokens held against that token ID.

Setting up an auction can be done by triggering following method:

```solidity
function createAuction(uint256 _garmentTokenId, uint256 _reservePrice, uint256 _startTime, uint256 _endTime)
```

#### Auction flow

1. Setup auction - defining the rules for the auction
2. Users can then make bids between the start/end date
    - Rules are also enforced on a per bid basis (see below)
3. `ETH` is escrowed into the auction contract
4. If the bidder outbids someone else, the previous bidders' money is then returned to them in the same transaction
5. (a) After the `endtime` if the reserve is reached - Digitalax will need to "Result" the auction
5. (b) After the `endtime` if the reserve is NOT reached - Digitalax will need to "Cancel" the auction

#### Resulting Auction

* Successful - `function resultAuction(uint256 _garmentTokenId)`
* Unsuccessful - `function cancelAuction(uint256 _garmentTokenId)`

#### Auction Rules

##### Global configurations (for all auctions)

* `minBidIncrement` - the amount by which the bid has to increase by as a minimum each time
* `bidWithdrawalLockTime` - after making a successful bid, the amount of time in seconds that a bidder has to wait before withdrawing their bid
* `platformFeeRecipient` - where any platform fees are sent when resulting an auction
* `platformFee` - when resulting an auction, this is the % taken above the reserve which is sent to `platformFeeRecipient`
    * This is assumed to be defined to 1 decimal place i.e. `12.5%` is possible but not smaller denomination is 

* These options can be modified by a user with `admin` rights and changes would take effect immediately

##### Per token config

* `garmentTokenId` - the ERC721 token ID being auctioned
* `startTime` - when the auction is open for bids
* `endTime` - when the auction closes for new bids - no further bids can happen after this time, an auction can only be resulted
* `reservePrice` - the token price reserve - if this is not reached, the auction must be resulted unsuccessfully

* These options can be modified by a user with `admin` rights and changes would take effect immediately

##### The rules

* Users can only place bids between `start` and `end` time
* A bidder must increase the previous bid by `minBidIncrement`
* If a bidder is outbid, their open bid is returned to them by the user who outbids them
* Once a bid is made successfully, the user cannot withdraw that bid until `bidWithdrawalLockTime` has passed
* Once `bidWithdrawalLockTime` has passed, the top bidder can withdraw their open bid
* At any point in time between start and end date, a user can be outbid
* In order to increase your bid you need to make a new bid, essentially out bidding yourself
* Once `endTime` has passed - an `admin` or `smart contract` account can result the auction
    * Only able to result an auction if the reserve is reached
    * Sending the majority of the funds to the original designer, taking a platform fee above the reserve
    * Sending the highest bidder the token - `approval` is needed to move the token and will fail if this is not the case
    * Once a token is auction successfully - it cannot be sold again via this contract
    * When resulted we also record the "primary sale" value internally to the parent 721 token as well.
    * If no bids are made - it cannot be resulted successfully even if the reserve is zero.
    * Once successfully resulted, an auction cannot be resulted again - either successfully or to be cancelled
* An any time, an `admin` or `smart contract` user can cancel the auction unless it is already `resulted`
    * If any top bidder is present at this time, their funds are returned to them
    * Once cancelled the token can be listed once again with the same above rules in place
