// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../DigitalaxAccessControls.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IGuildNFTRewards.sol";
import "./interfaces/IGuildNFTStakingWeightAppraisal.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "./interfaces/IGuildNFTStakingWeight.sol";

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

    event AddWhitelistedTokens(
        address[] whitelistedTokens
    );

    event RemoveWhitelistedTokens(
        address[] whitelistedTokens
    );

    event UpdateAccessControls(
        address indexed accessControls
    );

    DigitalaxAccessControls public accessControls;
    IGuildNFTRewards public rewardsContract;
    IGuildNFTStakingWeight public weightContract;

    uint256 public whitelistedNFTStakedTotal;
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
        uint256 numberNftStaked;
        mapping (address => uint256[]) numberNftStakedPerToken;
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
    mapping (address => mapping(uint256 => mapping(uint256 => StakeRecord))) public nftStakeRecords;

    // Mapping from address, token ID to owner address
    mapping (address => mapping(uint256 => address)) public tokenOwner;

    uint256 public accumulatedRewards;

    /// @notice mapping of a staker to its current properties
    mapping (address => Staker) public stakers;

    /// @notice sets the token to be claimable or not, cannot claim if it set to false
    bool public tokensClaimable;
    bool initialised;

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

    constructor() public {
    }
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

    function addWhitelistedTokens(address[] memory _whitelistedTokens) public onlyWhitelisted{
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

    function removeWhitelistedTokens(address[] memory _whitelistedTokens) public onlyWhitelisted{
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
                delete(tokenReports[_whitelistedTokens[i]]);
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
            "DigitalaxRewardsV2.setTrustedForwarder: Sender must be admin"
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
            "GuildNFTStaking.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "GuildNFTStaking.updateAccessControls: Zero Address");
        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }

    /// @notice Lets admin set the Rewards Token
    function setRewardsContract(address _addr) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStaking.setRewardsContract: Sender must be admin"
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
            "GuildNFTStaking.setWeightingContract: Sender must be admin"
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
            "GuildNFTStaking.setTokensClaimable: Sender must be admin"
        );
        tokensClaimable = _enabled;
        emit ClaimableStatusUpdated(_enabled);
    }

    /// @dev Getter functions for Staking contract
    /// @dev Get the tokens staked by a user
    function getStakedTokens(address _user, address _whitelistedNFTToken) external view returns (uint256[] memory tokenIds) {
        return stakers[_user].tokenIds[_whitelistedNFTToken];
    }


    /// @notice Appraise NFT.
    function appraise(address _whitelistedNFT, uint256 _tokenId, string memory _reaction) external {
        uint256 _appraisalLimit = getAppraisalLimit(_msgSender());

        IGuildNFTStakingWeightAppraisal(address(weightContract)).appraiseNFT(_whitelistedNFT, _tokenId, _msgSender(), _reaction);
    }

    /// @notice Appraise multiple NFTs.
    function appraiseBatch(address _whitelistedNFTs, uint256[] calldata _tokenIds, string[] calldata _reactions) external {
        uint256 _appraisalLimit = getAppraisalLimit(_msgSender());

        for (uint i = 0; i < _tokenIds.length; i++) {
            IGuildNFTStakingWeightAppraisal(address(weightContract)).appraiseNFT(_whitelistedNFTs[i], _tokenIds[i], _msgSender(), _reactions[i]);
        }
    }

    /// @notice Stake NFT and earn reward tokens.
    function stake(address _whitelistedNFT, uint256 _tokenId) external {
        // require();
        _stake(_msgSender(), _whitelistedNFT, _tokenId);
    }

    /// @notice Stake multiple NFTs and earn reward tokens.
    function stakeBatch(address[] memory _whitelistedNFTs,uint256[] memory _tokenIds) external {
        for (uint i = 0; i < tokenIds.length; i++) {
            _stake(_msgSender(), _whitelistedNFTs[i], tokenIds[i]);
        }
    }

    /**
     * @dev All the staking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they stake the nfts based on ether price
    */
    // TODO start from here
    function _stake(address _user, address _whitelistedNFT, uint256 _tokenId) internal {

        Staker storage staker = stakers[_user];

        updateReward(_user);

        staker.numberNftStaked = staker.numberNftStaked.add(1);
        whitelistedNFTStakedTotal = whitelistedNFTStakedTotal.add(1);
        staker.tokenIds[_whitelistedNFT].push(_tokenId);
        staker.tokenIndex[_whitelistedNFT][_tokenId] = staker.tokenIds[_whitelistedNFT].length.sub(1);
        tokenOwner[_tokenId] = _user;


        IERC721(_whitelistedNFT).safeTransferFrom(
            _user,
            address(this),
            _tokenId
        );

        weightContract.stake(_tokenId, _msgSender(), 1 ether);

        emit Staked(_user, _whitelistedNFT, _tokenId);
    }

    /// @notice Unstake NFTs.
    function unstake(uint256 _tokenId) external {
        require(
            tokenOwner[_tokenId] == _msgSender(),
            "GuildWhitelistedNFTStaking._unstake: Sender must have staked tokenID"
        );
        claimReward(_msgSender());
        _unstake(_msgSender(), _tokenId);
    }

    /// @notice Stake multiple DECO NFTs and claim reward tokens.
    function unstakeBatch(uint256[] memory tokenIds) external {
        claimReward(_msgSender());
        for (uint i = 0; i < tokenIds.length; i++) {
            if (tokenOwner[tokenIds[i]] == _msgSender()) {
                _unstake(_msgSender(), tokenIds[i]);
            }
        }
    }

     /**
     * @dev All the unstaking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they unstake the nfts based on ether price
    */
    function _unstake(address _user, address _whitelistedNFT, uint256 _tokenId) internal {
        Staker storage staker = stakers[_user];

        uint256 amount = getContribution(_tokenId);
        // staker.balance = staker.balance.sub(amount);
        whitelistedNFTStakedTotal = whitelistedNFTStakedTotal.sub(1);

        uint256 lastIndex = staker.tokenIds.length - 1;
        uint256 lastIndexKey = staker.tokenIds[lastIndex];
        uint256 tokenIdIndex = staker.tokenIndex[_tokenId];

        staker.tokenIds[tokenIdIndex] = lastIndexKey;
        staker.tokenIndex[lastIndexKey] = tokenIdIndex;
        if (staker.tokenIds.length > 0) {
            staker.tokenIds.pop();
            delete staker.tokenIndex[_tokenId];
        }

        if (staker.tokenIds.length == 0) {
            delete stakers[_user];
        }

        delete tokenOwner[_tokenId];

        balance = balance.sub(amount);

        if (balance == 0) {
            totalRoundRewards = 0;
        }

        weightContract.unstake(_tokenId, _user);
        IERC721(_whitelistedNFT).safeTransferFrom(address(this), _user, _tokenId);

        emit Unstaked(_user, _whitelistedNFT, _tokenId);
    }

    // Unstake without caring about rewards. EMERGENCY ONLY.
    function emergencyUnstake(address _whitelistedNFT, uint256 _tokenId) public {
        require(
            tokenOwner[_tokenId] == _msgSender(),
            "GuildWhitelistedNFTStaking._unstake: Sender must have staked tokenID"
        );
        _unstake(_msgSender(),_whitelistedNFT, _tokenId);
        emit EmergencyUnstake(_msgSender(), _whitelistedNFT, _tokenId);
    }


    /// @dev Updates the amount of rewards owed for each user before any tokens are moved
    function updateReward(address _user) public {
        rewardsContract.updateRewards();
        uint256 newRewards = rewardsContract.DecoRewards(lastUpdateTime, _getNow()); // TODO the rewards contract needs another type of rewards for the new

        if (balance == 0) {
            accumulatedRewards = accumulatedRewards.add(newRewards);
            lastUpdateTime = _getNow();
            return;
        }

        totalRewards = totalRewards.add(newRewards);
        totalRoundRewards = totalRoundRewards.add(newRewards);

        weightContract.updateOwnerWeight(_user);
        uint256 totalWeight = weightContract.getTotalWeight();

        if (totalWeight == 0) {
            return;
        }

        uint256 ownerWeight = weightContract.getOwnerWeight(_user);

        lastUpdateTime = _getNow();

        Staker storage staker = stakers[_user];
        uint256 _stakerRewards = totalRoundRewards.mul(ownerWeight)
                                    .div(totalWeight);

        if (staker.rewardsReleased >= _stakerRewards) {
            staker.rewardsEarned = staker.rewardsReleased;
        } else {
            staker.rewardsEarned = _stakerRewards;
        }
    }

    /// @notice Returns the about of rewards yet to be claimed
    function unclaimedRewards(address _user) external view returns(uint256) {

        uint256 _newRewards = rewardsContract.DecoRewards(lastUpdateTime, _getNow());
        uint256 _totalRoundRewards = totalRoundRewards.add(_newRewards);

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

        /// @dev accounts for dust
        uint256 rewardBal = rewardsToken.balanceOf(address(this));
        if (_payableAmount > rewardBal) {
            _payableAmount = rewardBal;
        }

        rewardsToken.transfer(_user, _payableAmount);
        emit RewardPaid(_user, _payableAmount);
    }

    function onERC721Received(address, address, uint256, bytes calldata data) public returns(bytes4) {
        return _ERC721_RECEIVED;
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}
