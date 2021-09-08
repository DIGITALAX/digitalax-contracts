// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../DigitalaxAccessControls.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IGuildNFTRewards.sol";
import "./interfaces/IGuildNFTRewardsWhitelisted.sol";
import "./interfaces/IGuildNFTStakingWeightWhitelisted.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "./interfaces/IGuildNFTStakingWeight.sol";

import "hardhat/console.sol";
/**
 * @title Digitalax whitelisted Staking
 * @dev Stake whitelisted nfts and stake membership guild tokens upon them
 * @author DLTA Team
 */

contract GuildWhitelistedNFTStaking is BaseRelayRecipient {
    using SafeMath for uint256;
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    IERC20 public rewardsToken;

    mapping(address => uint256) whitelistedTokensIndex;
    address[] whitelistedTokens;

    DigitalaxAccessControls public accessControls;
    IGuildNFTRewards public rewardsContract;
    IGuildNFTStakingWeight public weightContract;

    uint256 public whitelistedNFTStakedTotal;
    mapping (address => uint256) public whitelistedNFTContractStakedTotal;

    uint256 public lastUpdateTime;

    uint256 public totalRoundRewards;
    uint256 public totalRewards;

    uint256 constant pointMultiplier = 10e18;

    /**
    @notice Struct to track what user is staking which tokens
    @dev tokenIds are all the tokens staked by the staker
    @dev balance is the current ether balance of the staker
    @dev rewardsEarned is the total reward for the staker till now
    @dev rewardsReleased is how much reward has been paid to the staker
    */
    struct Staker {
        mapping (address => uint256[]) tokenIds;
        mapping (address => mapping(uint256 => uint256)) tokenIndex;
        uint256 numberNFTStaked;
        mapping (address => uint256) numberNFTStakedPerToken; //continue here
        uint256 rewardsEarned;
        uint256 rewardsReleased;
    }

    struct StakeRecord {
        uint256 nftStakeTime;
        uint256 nftUnstakeTime;
    }

    // Address of nft -> maps to token id of nft -> matches to characteristic
    mapping (address => mapping(uint256 => bool)) public nftIsStaked;
    mapping (address => mapping(uint256 => uint256)) public numberOfTimesNFTWasStaked;
    mapping (address => mapping(uint256 => mapping(uint256 => StakeRecord))) public nftStakeRecords; // Last stake time derived from here
    mapping (address => mapping(uint256 => uint256)) public amountOfTimeSpecificNFTHasBeenStakedTotal;

    // Contract Specific
    mapping (address => uint256) public amountOfTimeContractNFTsHaveBeenStakedTotal;
    mapping (address => uint256) public lastTimeContractNFTStakedPeriodRecorded;

    // For all nfts
    uint256 public amountOfStakingTimeAllNFTsHaveBeenStaked;
    uint256 public lastTimeAllNFTStakingPeriodRecorded;

    uint256 startTime;

    // Mapping from address, token ID to owner address
    mapping (address => mapping(uint256 => address)) public tokenOwner;

    mapping (address => mapping(uint256 => address)) public approvedParty;

    uint256 public accumulatedRewards;

    /// @notice mapping of a staker to its current properties
    mapping (address => Staker) public stakers;

    /// @notice sets the token to be claimable or not, cannot claim if it set to false
    bool public tokensClaimable;
    bool initialised;

    // Events
    event AddWhitelistedTokens(
        address[] whitelistedTokens
    );

    event RemoveWhitelistedTokens(
        address[] whitelistedTokens
    );

    event UpdateAccessControls(
        address indexed accessControls
    );

    /// @notice event emitted when a user has staked a token
    event Staked(address owner, address whitelistedNFT, uint256 tokenId);

    /// @notice event emitted when a user has unstaked a token
    event Unstaked(address owner, address whitelistedNFT, uint256 tokenId);

    /// @notice event emitted when a user claims reward
    event RewardPaid(address indexed user, uint256 reward);

    /// @notice Allows reward tokens to be claimed
    event ClaimableStatusUpdated(bool status);

    /// @notice Emergency unstake tokens without rewards
    event EmergencyUnstake(address indexed user, address whitelistedNFT, uint256 tokenId);

    /// @notice Admin update of rewards contract
    event RewardsContractUpdated(address indexed oldRewardsToken, address newRewardsToken );

    /// @notice Admin update of weighting contract
    event WeightingContractUpdated(address indexed oldWeightingContract, address newWeightingContract );
    
     /**
     * @dev Single gateway to initialize the staking contract after deploying
     * @dev Sets the contract with the DECO NFT and DECO reward token
     */
    function initStaking(
        IERC20 _rewardsToken,
        DigitalaxAccessControls _accessControls,
        IGuildNFTStakingWeight _weightContract,
        address _trustedForwarder
    )
        external
    {
        require(!initialised, "Already initialised");
        rewardsToken = _rewardsToken;
        accessControls = _accessControls;
        weightContract = _weightContract;
        lastUpdateTime = _getNow();
        trustedForwarder = _trustedForwarder;
        initialised = true;
    }

    function addWhitelistedTokens(address[] memory _whitelistedTokens) public {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildWhitelistedNFTStaking.addWhitelistedTokens: Sender must be admin"
        );
        require((_whitelistedTokens.length) > 0, "GuildWhitelistedNFTStaking.addWhitelistedTokens: Empty array not supported");
        for (uint i = 0; i < _whitelistedTokens.length; i++) {
            if(!checkInWhitelistedTokens(_whitelistedTokens[i])) {
                uint256 index = whitelistedTokens.length;
                whitelistedTokens.push(_whitelistedTokens[i]);
                whitelistedTokensIndex[_whitelistedTokens[i]] = index;
            }
        }
        emit AddWhitelistedTokens(_whitelistedTokens);
    }

    function removeWhitelistedTokens(address[] memory _whitelistedTokens) public {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildWhitelistedNFTStaking.removeWhitelistedTokens: Sender must be admin"
        );

        require((whitelistedTokens.length) > 0, "GuildWhitelistedNFTStaking.removeWhitelistedTokens: No whitelisted tokens instantiated");
        require((_whitelistedTokens.length) > 0, "GuildWhitelistedNFTStaking.removeWhitelistedTokens: Empty array not supported");

        for (uint i = 0; i < _whitelistedTokens.length; i++) {
            if(checkInWhitelistedTokens(_whitelistedTokens[i])) {
                uint256 rowToDelete = whitelistedTokensIndex[_whitelistedTokens[i]];
                address keyToMove = whitelistedTokens[whitelistedTokens.length-1];
                whitelistedTokens[rowToDelete] = keyToMove;
                whitelistedTokensIndex[keyToMove] = rowToDelete;
                whitelistedTokens.pop();
                delete(whitelistedTokensIndex[_whitelistedTokens[i]]);
            }
        }

        emit RemoveWhitelistedTokens(_whitelistedTokens);
    }

    function checkInWhitelistedTokens(address _whitelistedToken) public view returns (bool isAddress) {
        if(whitelistedTokens.length == 0) return false;
        return (whitelistedTokens[whitelistedTokensIndex[_whitelistedToken]] == _whitelistedToken);
    }

    function getWhitelistedTokens() public view returns (address[] memory returnWhitelistedTokens){
        address[] memory a = new address[](whitelistedTokens.length);
        for (uint i=0; i< whitelistedTokens.length; i++) {
            a[i] = whitelistedTokens[i];
        }
        return a;
    }

    function setTrustedForwarder(address _trustedForwarder) external  {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildWhitelistedNFTStaking.setTrustedForwarder: Sender must be admin"
        );
        trustedForwarder = _trustedForwarder;
    }

    // This is to support Native meta transactions
    // never use msg.sender directly, use _msgSender() instead
    function _msgSender() internal view returns (address payable sender) {
        return BaseRelayRecipient.msgSender();
    }
    /**
       * Override this function.
       * This version is to keep track of BaseRelayRecipient you are using
       * in your contract.
       */
    function versionRecipient() external view override returns (string memory) {
        return "1";
    }

    /**
     @notice Method for updating the access controls contract used by the NFT
     @dev Only admin
     @param _accessControls Address of the new access controls contract (Cannot be zero address)
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildWhitelistedNFTStaking.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "GuildNFTStaking.updateAccessControls: Zero Address");
        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }

    /// @notice Lets admin set the Rewards Token
    function setRewardsContract(address _addr) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildWhitelistedNFTStaking.setRewardsContract: Sender must be admin"
        );
        require(_addr != address(0));
        address oldAddr = address(rewardsContract);
        rewardsContract = IGuildNFTRewards(_addr);
        emit RewardsContractUpdated(oldAddr, _addr);
    }

    /// @notice Lets admin set the Weighting Contract
    function setWeightingContract(address _addr) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildWhitelistedNFTStaking.setWeightingContract: Sender must be admin"
        );
        require(_addr != address(0));
        address oldAddr = address(weightContract);
        weightContract = IGuildNFTStakingWeight(_addr);
        emit WeightingContractUpdated(oldAddr, _addr);
    }

    /// @notice Lets admin set the Rewards to be claimable
    function setTokensClaimable(bool _enabled) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildWhitelistedNFTStaking.setTokensClaimable: Sender must be admin"
        );
        tokensClaimable = _enabled;
        emit ClaimableStatusUpdated(_enabled);
    }

    /// @dev Getter functions for Staking contract
    /// @dev Get the tokens staked by a user
    function getStakedTokens(address _user, address _whitelistedNFTToken) external view returns (uint256[] memory tokenIds) {
        return stakers[_user].tokenIds[_whitelistedNFTToken];
    }

    /// @notice Stake NFT and earn reward tokens.
    function stake(address _whitelistedNFT, uint256 _tokenId) external {
        // require();
        _stake(_msgSender(), _whitelistedNFT, _tokenId);
    }

    /// @notice Stake multiple NFTs and earn reward tokens.
    function stakeBatch(address[] memory _whitelistedNFTs,uint256[] memory _tokenIds) external {
        require(_whitelistedNFTs.length == _tokenIds.length, "GuildWhitelisedNFTStaking.stakeBatch: Arrays must be equivalent lengths");
        for (uint i = 0; i < _tokenIds.length; i++) {
            _stake(_msgSender(), _whitelistedNFTs[i], _tokenIds[i]);
        }
    }

    /**
     * @dev All the staking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they stake the nfts based on ether price
    */
    function _stake(address _user, address _whitelistedNFT, uint256 _tokenId) internal {
        require(checkInWhitelistedTokens(_whitelistedNFT), "GuildWhitelistedNFTStaking._stake: This token is not whitelisted");
        Staker storage staker = stakers[_user];

        updateReward(_user);

        staker.numberNFTStaked = staker.numberNFTStaked.add(1);
        staker.numberNFTStakedPerToken[_whitelistedNFT] = staker.numberNFTStakedPerToken[_whitelistedNFT].add(1);
        whitelistedNFTStakedTotal = whitelistedNFTStakedTotal.add(1);
        whitelistedNFTContractStakedTotal[_whitelistedNFT] = whitelistedNFTContractStakedTotal[_whitelistedNFT].add(1);

        staker.tokenIds[_whitelistedNFT].push(_tokenId);
        staker.tokenIndex[_whitelistedNFT][_tokenId] = staker.tokenIds[_whitelistedNFT].length.sub(1);
        tokenOwner[_whitelistedNFT][_tokenId] = _user;

        IERC721(_whitelistedNFT).safeTransferFrom(
            _user,
            address(this),
            _tokenId
        );

        nftIsStaked[_whitelistedNFT][_tokenId] = true;
        nftStakeRecords[_whitelistedNFT][_tokenId][numberOfTimesNFTWasStaked[_whitelistedNFT][_tokenId]].nftStakeTime = _getNow();
        numberOfTimesNFTWasStaked[_whitelistedNFT][_tokenId] = numberOfTimesNFTWasStaked[_whitelistedNFT][_tokenId].add(1);

        IGuildNFTStakingWeightWhitelisted(address(weightContract)).stakeWhitelistedNFT(_whitelistedNFT, _tokenId, _msgSender());

        emit Staked(_user, _whitelistedNFT, _tokenId);
    }

    /// @notice This is to set an external approved party who can unstake the nft in case the original address is broken.
    /// @notice To unset, set again with own address or 0x000...000
    function setApprovedParty(address _whitelistedNFT, uint256 _tokenId, address _approvedParty) external {
        require(
            tokenOwner[_whitelistedNFT][_tokenId] == _msgSender(),
            "GuildWhitelistedNFTStaking.setApprovedParty: Sender must have staked tokenID"
        );

        approvedParty[_whitelistedNFT][_tokenId] = _approvedParty;
    }

    /// @notice Unstake NFTs.
    function unstake(address _whitelistedNFT, uint256 _tokenId) external {
        bool isApprovedParty = approvedParty[_whitelistedNFT][_tokenId] == _msgSender();
        require(
            (tokenOwner[_whitelistedNFT][_tokenId] == _msgSender()) || isApprovedParty,
            "GuildWhitelistedNFTStaking._unstake: Sender must have staked tokenID or be approved party"
        );
        claimReward(_msgSender());
        _unstake(_msgSender(), _whitelistedNFT, _tokenId, isApprovedParty);
    }

    /// @notice Stake multiple DECO NFTs and claim reward tokens.
    function unstakeBatch(address[] memory _whitelistedNFTs, uint256[] memory _tokenIds) external {
        require(_whitelistedNFTs.length == _tokenIds.length, "GuildWhitelistedNFTStaking.unstakeBatch: Please pass equal length arrays");
        claimReward(_msgSender());
        for (uint i = 0; i < _tokenIds.length; i++) {
            bool isApprovedParty = approvedParty[_whitelistedNFTs[i]][_tokenIds[i]] == _msgSender();
            if (
                (tokenOwner[_whitelistedNFTs[i]][_tokenIds[i]] == _msgSender())
                || isApprovedParty) {
                _unstake(_msgSender(), _whitelistedNFTs[i], _tokenIds[i], isApprovedParty);
            }
        }
    }

     /**
     * @dev All the unstaking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they unstake the nfts based on ether price
    */

    function _unstake(address _user, address _whitelistedNFT, uint256 _tokenId, bool _isApprovedParty) internal {
        Staker storage staker = stakers[_user];

        nftStakeRecords[_whitelistedNFT][_tokenId][numberOfTimesNFTWasStaked[_whitelistedNFT][_tokenId].sub(1)].nftUnstakeTime = _getNow();

        uint256 timeWasStaked = _getNow().sub(currentlyStakedWhitelistedNFTStakeTime(_whitelistedNFT, _tokenId));
        amountOfTimeSpecificNFTHasBeenStakedTotal[_whitelistedNFT][_tokenId] = amountOfTimeSpecificNFTHasBeenStakedTotal[_whitelistedNFT][_tokenId].add(timeWasStaked);

        uint256 timeContractNftWasStaked = (_getNow().sub(lastTimeContractNFTStakedPeriodRecorded[_whitelistedNFT])).mul(whitelistedNFTContractStakedTotal[_whitelistedNFT]);
        amountOfTimeContractNFTsHaveBeenStakedTotal[_whitelistedNFT] = amountOfTimeContractNFTsHaveBeenStakedTotal[_whitelistedNFT].add(timeContractNftWasStaked);
        lastTimeContractNFTStakedPeriodRecorded[_whitelistedNFT] = _getNow();

        uint256 timeAllNFTWereStaked = (_getNow().sub(lastTimeAllNFTStakingPeriodRecorded)).mul(whitelistedNFTStakedTotal);
        amountOfStakingTimeAllNFTsHaveBeenStaked = amountOfStakingTimeAllNFTsHaveBeenStaked.add(timeAllNFTWereStaked);
        lastTimeAllNFTStakingPeriodRecorded = _getNow();

        whitelistedNFTStakedTotal = whitelistedNFTStakedTotal.sub(1);
        whitelistedNFTContractStakedTotal[_whitelistedNFT] = whitelistedNFTContractStakedTotal[_whitelistedNFT].sub(1);

        nftIsStaked[_whitelistedNFT][_tokenId] = false;

        uint256 lastIndex = staker.tokenIds[_whitelistedNFT].length - 1;
        uint256 lastIndexKey = staker.tokenIds[_whitelistedNFT][lastIndex];
        uint256 tokenIdIndex = staker.tokenIndex[_whitelistedNFT][_tokenId];

        staker.tokenIds[_whitelistedNFT][tokenIdIndex] = lastIndexKey;
        staker.tokenIndex[_whitelistedNFT][lastIndexKey] = tokenIdIndex;
        if (staker.tokenIds[_whitelistedNFT].length > 0) {
            staker.tokenIds[_whitelistedNFT].pop();
            delete staker.tokenIndex[_whitelistedNFT][_tokenId];
        }

        staker.numberNFTStakedPerToken[_whitelistedNFT] = staker.numberNFTStakedPerToken[_whitelistedNFT].sub(1);

        if (staker.numberNFTStaked == 0) {
            delete stakers[_user];
        }

        delete tokenOwner[_whitelistedNFT][_tokenId];

        if (whitelistedNFTStakedTotal == 0) {
            totalRoundRewards = 0;
        }

        IGuildNFTStakingWeightWhitelisted(address(weightContract)).unstakeWhitelistedNFT(_whitelistedNFT, _tokenId, _msgSender());

        if(_isApprovedParty){
            IERC721(_whitelistedNFT).safeTransferFrom(address(this), approvedParty[_whitelistedNFT][_tokenId], _tokenId);
        } else {
            IERC721(_whitelistedNFT).safeTransferFrom(address(this), _user, _tokenId);
        }

        emit Unstaked(_user, _whitelistedNFT, _tokenId);
    }

    // Only makes sense for nfts currently staked
    function currentlyStakedWhitelistedNFTStakeTime(address _whitelistedNFT, uint256 _tokenId) public view returns (uint256){
        if(nftIsStaked[_whitelistedNFT][_tokenId]){
            return nftStakeRecords[_whitelistedNFT][_tokenId][numberOfTimesNFTWasStaked[_whitelistedNFT][_tokenId].sub(1)].nftStakeTime;
        } else {
            return 0;
        }
    }

    function calcSpecificWhitelistedNFTOverallStakeTime(address _whitelistedNFT, uint256 _tokenId) external view returns (uint256){
        if(nftIsStaked[_whitelistedNFT][_tokenId]){
            uint256 timeWasStaked = _getNow().sub(currentlyStakedWhitelistedNFTStakeTime(_whitelistedNFT, _tokenId));
            return amountOfTimeSpecificNFTHasBeenStakedTotal[_whitelistedNFT][_tokenId].add(timeWasStaked);
        } else {
            return amountOfTimeSpecificNFTHasBeenStakedTotal[_whitelistedNFT][_tokenId];
        }
    }

    function calcWhitelistedNFTContractOverallStakeTime(address _whitelistedNFT) external view returns (uint256){
        if(whitelistedNFTContractStakedTotal[_whitelistedNFT] > 0){
            uint256 timeContractNftWasStaked = (_getNow().sub(lastTimeContractNFTStakedPeriodRecorded[_whitelistedNFT])).mul(whitelistedNFTContractStakedTotal[_whitelistedNFT]);
            return amountOfTimeContractNFTsHaveBeenStakedTotal[_whitelistedNFT].add(timeContractNftWasStaked);

        } else {
            return amountOfTimeContractNFTsHaveBeenStakedTotal[_whitelistedNFT];
        }
    }

    function calcAllWhitelistedNFTsOverallStakeTime(address _whitelistedNFT) external view returns (uint256){
        if(whitelistedNFTStakedTotal > 0){
            uint256 timeAllNFTWereStaked = (_getNow().sub(lastTimeAllNFTStakingPeriodRecorded)).mul(whitelistedNFTStakedTotal);
            return amountOfStakingTimeAllNFTsHaveBeenStaked.add(timeAllNFTWereStaked);
        } else {
            return amountOfStakingTimeAllNFTsHaveBeenStaked;
        }
    }

    // Unstake without caring about rewards. EMERGENCY ONLY.
    function emergencyUnstake(address _whitelistedNFT, uint256 _tokenId) public {
        bool isApprovedParty = approvedParty[_whitelistedNFT][_tokenId] == _msgSender();
        require(
            (tokenOwner[_whitelistedNFT][_tokenId] == _msgSender()) || isApprovedParty,
            "GuildWhitelistedNFTStaking.emergencyUnstake: Sender must have staked tokenID or be approved party"
        );
        _unstake(_msgSender(),_whitelistedNFT, _tokenId, isApprovedParty);
        emit EmergencyUnstake(_msgSender(), _whitelistedNFT, _tokenId);
    }

    // Only to be used in the maximum emergency case where a extremely high value NFT is completely stuck, this could break the rest of the contract.
    // If this is used, should likely just refund every user their NFT as rewards will not be accurate.
    function adminEmergencySafeUnstake(address _whitelistedNFT, uint256 _tokenId) public {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildWhitelistedNFTStaking.adminEmergencyUnstake: Sender must be admin"
        );
        IERC721(_whitelistedNFT).safeTransferFrom(address(this), tokenOwner[_whitelistedNFT][_tokenId], _tokenId);
    }

    // Only to be used in the maximum emergency case where an NFT is completely stuck, this could break the rest of the contract.
    // If this is used, should likely just refund every user their NFT as rewards will not be accurate.
    function adminEmergencyUnstake(address _whitelistedNFT, uint256 _tokenId) public {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildWhitelistedNFTStaking.adminEmergencyUnstake: Sender must be admin"
        );
        IERC721(_whitelistedNFT).transferFrom(address(this), tokenOwner[_whitelistedNFT][_tokenId], _tokenId);
    }


    /// @dev Updates the amount of rewards owed for each user before any tokens are moved
    function updateReward(address _user) public {
        rewardsContract.updateRewards();
        uint256 newRewards = IGuildNFTRewardsWhitelisted(address(rewardsContract)).WhitelistedNFTRewards(lastUpdateTime, _getNow());
        console.log("thenew rewards are %s", newRewards);
        if (whitelistedNFTStakedTotal == 0) {
            accumulatedRewards = accumulatedRewards.add(newRewards);
            lastUpdateTime = _getNow();
            return;
        }

        totalRewards = totalRewards.add(newRewards);
        totalRoundRewards = totalRoundRewards.add(newRewards);

        console.log("The Total round rewards are %s", totalRoundRewards);
        console.log("The Total rewards are %s", totalRewards);

        IGuildNFTStakingWeightWhitelisted(address(weightContract)).updateWhitelistedNFTOwnerWeight(_user);
        // weightContract.updateOwnerWeight(_user); // TODO figure out if I need to do something here
        uint256 totalWeight = IGuildNFTStakingWeightWhitelisted(address(weightContract)).getTotalWhitelistedNFTTokenWeight();

        console.log("the total weight is %s", totalWeight);
        if (totalWeight == 0) {
            return;
        }

        uint256 ownerWeight = IGuildNFTStakingWeightWhitelisted(address(weightContract)).getWhitelistedNFTOwnerWeight(_user);

        console.log("the owner weight is %s", ownerWeight);
        lastUpdateTime = _getNow();

        Staker storage staker = stakers[_user];
        uint256 _stakerRewards = totalRoundRewards.mul(ownerWeight)
                                    .div(totalWeight);

        console.log("the rewards are %s", _stakerRewards);

        if (staker.rewardsReleased >= _stakerRewards) {
            staker.rewardsEarned = staker.rewardsReleased;
        } else {
            staker.rewardsEarned = _stakerRewards;
        }
    }

    /// @notice Returns the about of rewards yet to be claimed
    function unclaimedRewards(address _user) external view returns(uint256) {

        uint256 newRewards = IGuildNFTRewardsWhitelisted(address(rewardsContract)).WhitelistedNFTRewards(lastUpdateTime, _getNow());
        uint256 _totalRoundRewards = totalRoundRewards.add(newRewards);

        uint256 _totalWeight = weightContract.calcNewWeight();

        if (_totalWeight == 0) {
            return 0;
        }

        uint256 _ownerWeight = weightContract.calcNewOwnerWeight(_user);
        uint256 _ownerTotalRewards = _totalRoundRewards.mul(_ownerWeight)
                        .div(_totalWeight);

        uint256 _payableAmount = 0;

        if (_ownerTotalRewards > stakers[_user].rewardsReleased) {
            _payableAmount = _ownerTotalRewards.sub(stakers[_user].rewardsReleased);
        } else {
            return 0;
        }

        /// @dev accounts for dust
        uint256 rewardBal = rewardsToken.balanceOf(address(this));
        if (_payableAmount > rewardBal) {
            _payableAmount = rewardBal;
        }

        return _payableAmount;
    }

    function claimReward(address _user) public {
        require(
            tokensClaimable == true,
            "Tokens cannnot be claimed yet"
        );
        updateReward(_user);

        Staker storage staker = stakers[_user];

        if (staker.rewardsEarned <= staker.rewardsReleased) {
            return;
        }

        uint256 _payableAmount = staker.rewardsEarned.sub(staker.rewardsReleased);
        staker.rewardsReleased = staker.rewardsReleased.add(_payableAmount);

        console.log("_payableAmount bal %s", _payableAmount);
        /// @dev accounts for dust
        uint256 rewardBal = rewardsToken.balanceOf(address(this));
        if (_payableAmount > rewardBal) {
            _payableAmount = rewardBal;
        }

        console.log("******************************* %s", staker.rewardsEarned);
        console.log("rewards earned %s", staker.rewardsEarned);
        console.log("reward bal %s", rewardBal);
        console.log("_user %s", _user);
        rewardsToken.transfer(_user, _payableAmount);
        emit RewardPaid(_user, _payableAmount);
    }

    function onERC721Received(address, address, uint256, bytes calldata data) public returns(bytes4) {
        return _ERC721_RECEIVED;
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    function getStakerStakedTokens(address _staker, address _whitelistedNFT) external view returns (uint256[] memory){
        return stakers[_staker].tokenIds[_whitelistedNFT];
    }

    function getStakerNumberStakedTokens(address _staker) external view returns (uint256){
        return stakers[_staker].numberNFTStaked;
    }

    function getStakerNumberStakedTokensForWhitelistedNFT(address _staker, address _whitelistedNFT) external view returns (uint256){
        return stakers[_staker].numberNFTStakedPerToken[_whitelistedNFT];
    }

    function getStakerRewardsEarned(address _staker) external view returns (uint256){
        return stakers[_staker].rewardsEarned;
    }

    function getStakerRewardsReleased(address _staker) external view returns (uint256){
        return stakers[_staker].rewardsReleased;
    }

    function getTokenOwner(address _whitelistedNFT, uint256 _tokenId) external view returns (address){
        return tokenOwner[_whitelistedNFT][_tokenId];
    }

    function getIsNFTStaked(address _whitelistedNFT, uint256 _tokenId) external view returns (bool){
        return nftIsStaked[_whitelistedNFT][_tokenId];
    }

    function getNumberTimesNFTStaked(address _whitelistedNFT, uint256 _tokenId) external view returns (uint256){
        return numberOfTimesNFTWasStaked[_whitelistedNFT][_tokenId];
    }

    function getNFTStakedRecord(address _whitelistedNFT, uint256 _tokenId, uint256 _recordIndex) external view returns (uint256, uint256){
        return (nftStakeRecords[_whitelistedNFT][_tokenId][_recordIndex].nftStakeTime, nftStakeRecords[_whitelistedNFT][_tokenId][_recordIndex].nftUnstakeTime);
    }
}
