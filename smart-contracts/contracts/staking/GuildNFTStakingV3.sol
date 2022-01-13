// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../DigitalaxAccessControls.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IGuildNFTRewards.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "./interfaces/IGuildNFTStakingWeight.sol";
import "./interfaces/IGuildNFTTokenRewards.sol";
import "hardhat/console.sol";
/**
 * @title Digitalax Staking
 * @dev Stake NFTs, earn tokens on the Digitalax platform
 * @author Digitalax Team
 */

contract GuildNFTStakingV3 is BaseRelayRecipient {
    using SafeMath for uint256;
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    IERC20 public rewardsToken;
    IERC721 public parentNFT;
    DigitalaxAccessControls public accessControls;
    IGuildNFTRewards public rewardsContract;
    IGuildNFTStakingWeight public weightContract;

    /// @notice total ethereum staked currently in the guild nft staking contract
    uint256 public stakedEthTotal;
    uint256 public nftStakedTotal;
    uint256 public lastUpdateTime;

    uint256 public totalRoundRewards;
    mapping (address => uint256) public totalRoundRewardTokenRewards;

    uint256 constant pointMultiplier = 10e18;

    /**
    @notice Struct to track what user is staking which tokens
    @dev tokenIds are all the tokens staked by the staker
    @dev balance is the current ether balance of the staker
    @dev rewardsEarned is the total reward for the staker till now
    @dev rewardsReleased is how much reward has been paid to the staker
    */
    struct Staker {
        uint256[] tokenIds;
        mapping (uint256 => uint256) tokenIndex;
        uint256 balance;
        uint256 rewardsEarned;
        uint256 rewardsReleased;
        mapping (address => uint256) rewardTokensRewardsEarned;
        mapping (address => uint256) rewardTokensRewardsReleased;
    }

    event UpdateAccessControls(
        address indexed accessControls
    );

    uint256 public balance;
    uint256 public accumulatedRewards;

    /// @notice mapping of a staker to its current properties
    mapping (address => Staker) public stakers;

    // Mapping from token ID to owner address
    mapping (uint256 => address) public tokenOwner;

    mapping(uint256 => address) public approvedParty;

    /// @notice sets the token to be claimable or not, cannot claim if it set to false
    bool public tokensClaimable;
    bool initialised;

    /// @notice event emitted when a user has staked a token
    event Staked(address owner, uint256 tokenId);

    /// @notice event emitted when a user has unstaked a token
    event Unstaked(address owner, uint256 tokenId);

    /// @notice event emitted when a user claims reward
    event RewardPaid(address indexed user, uint256 reward);

    /// @notice event emitted when a user claims reward
    event TokenRevenueRewardPaid(address indexed rewardToken, address indexed user, uint256 reward);

    /// @notice Allows reward tokens to be claimed
    event ClaimableStatusUpdated(bool status);

    /// @notice Emergency unstake tokens without rewards
    event EmergencyUnstake(address indexed user, uint256 tokenId);

    /// @notice Admin update of rewards contract
    event RewardsTokenUpdated(address indexed oldRewardsToken, address newRewardsToken );

    /// @notice Admin update of weighting contract
    event WeightingContractUpdated(address indexed oldWeightingContract, address newWeightingContract );

    constructor() public {
    }
     /**
     * @dev Single gateway to intialize the staking contract after deploying
     * @dev Sets the contract with the DECO NFT and DECO reward token
     */
    function initStaking(
        IERC20 _rewardsToken,
        IERC721 _parentNFT,
        DigitalaxAccessControls _accessControls,
        IGuildNFTStakingWeight _weightContract,
        address _trustedForwarder
    )
        external
    {
        require(!initialised, "Already initialised");
        rewardsToken = _rewardsToken;
        parentNFT = _parentNFT;
        accessControls = _accessControls;
        weightContract = _weightContract;
        lastUpdateTime = _getNow();
        trustedForwarder = _trustedForwarder;
        initialised = true;
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

    /// @notice Lets admin set the membership Token
    function setParentNFT(address _addr) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStaking.setRewardsContract: Sender must be admin"
        );
        require(nftStakedTotal == 0 && _addr != address(0), "Need to be address and with no nfts staked");

        parentNFT = IERC721(_addr);

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
        emit RewardsTokenUpdated(oldAddr, _addr);
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
    function getStakedTokens(address _user) external view returns (uint256[] memory tokenIds) {
        return stakers[_user].tokenIds;
    }

    /// @dev Get the amount a staked nft is valued at ie bought at
    function getContribution (uint256 _tokenId) public view returns (uint256) {
        return 1 ether;
    }

    function getAppraisalLimit (address _appraiser) public view returns (uint256) {
        return 10;
    }

    /// @notice Appraise NFT.
    function appraise(uint256 _tokenId, string memory _reaction) external {
        uint256 _appraisalLimit = getAppraisalLimit(_msgSender());

        weightContract.appraise(_tokenId, _msgSender(), _appraisalLimit, _reaction);
    }

    /// @notice Appraise multiple NFTs.
    function appraiseBatch(uint256[] calldata _tokenIds, string[] calldata _reactions) external {
        uint256 _appraisalLimit = getAppraisalLimit(_msgSender());

        for (uint i = 0; i < _tokenIds.length; i++) {
            weightContract.appraise(_tokenIds[i], _msgSender(), _appraisalLimit, _reactions[i]);
        }
    }

      /// @notice This is to set an external approved party who can unstake the nft in case the original address is broken.
    /// @notice To unset, set again with own address or 0x000...000
    function setApprovedParty(uint256 _tokenId, address _approvedParty) external {
        require(
            tokenOwner[_tokenId] == _msgSender(),
            "GuildWhitelistedNFTStaking.setApprovedParty: Sender must have staked tokenID"
        );

        approvedParty[_tokenId] = _approvedParty;
    }

    /// @notice Stake NFT and earn reward tokens.
    function stake(uint256 tokenId) external {
        // require();
        _stake(_msgSender(), tokenId);
    }

    /// @notice Stake multiple NFTs and earn reward tokens.
    function stakeBatch(uint256[] memory tokenIds) external {
        for (uint i = 0; i < tokenIds.length; i++) {
            _stake(_msgSender(), tokenIds[i]);
        }
    }

    /**
     * @dev All the staking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they stake the nfts based on ether price
    */
    function _stake(address _user, uint256 _tokenId) internal {

        Staker storage staker = stakers[_user];

        updateReward(_user);
        uint256 _primarySalePrice = getContribution(_tokenId);
        staker.balance = staker.balance.add(_primarySalePrice);
        stakedEthTotal = stakedEthTotal.add(_primarySalePrice);
        nftStakedTotal = nftStakedTotal.add(1);
        staker.tokenIds.push(_tokenId);
        staker.tokenIndex[_tokenId] = staker.tokenIds.length.sub(1);
        tokenOwner[_tokenId] = _user;

        balance = balance.add(_primarySalePrice);

        parentNFT.safeTransferFrom(
            _user,
            address(this),
            _tokenId
        );

        weightContract.stake(_tokenId, _msgSender(), _primarySalePrice);

        emit Staked(_user, _tokenId);
    }

    /// @notice Unstake NFTs.
    function unstake(uint256 _tokenId) external {
        bool isApprovedParty = approvedParty[_tokenId] == _msgSender();
        require(
            tokenOwner[_tokenId] == _msgSender() || isApprovedParty,
            "DigitalaxParentStaking._unstake: Sender must have staked tokenID or is approved party"
        );
        claimReward(_msgSender());
        _unstake(_msgSender(), _tokenId, isApprovedParty);
    }

    /// @notice Stake multiple DECO NFTs and claim reward tokens.
    function unstakeBatch(uint256[] memory tokenIds) external {
        claimReward(_msgSender());
        for (uint i = 0; i < tokenIds.length; i++) {
            bool isApprovedParty = approvedParty[tokenIds[i]] == _msgSender();
            if (tokenOwner[tokenIds[i]] == _msgSender() || isApprovedParty) {
                _unstake(_msgSender(), tokenIds[i], isApprovedParty);
            }
        }
    }

     /**
     * @dev All the unstaking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they unstake the nfts based on ether price
    */
    function _unstake(address _user, uint256 _tokenId, bool _isApprovedParty) internal {
        Staker storage staker = stakers[_user];

        uint256 amount = getContribution(_tokenId);
        staker.balance = staker.balance.sub(amount);
        stakedEthTotal = stakedEthTotal.sub(amount);
        nftStakedTotal = nftStakedTotal.sub(1);

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

        if(_isApprovedParty){
            parentNFT.safeTransferFrom(address(this), approvedParty[_tokenId], _tokenId);
        } else {
            parentNFT.safeTransferFrom(address(this), _user, _tokenId);
        }

        emit Unstaked(_user, _tokenId);
    }

    // Unstake without caring about rewards. EMERGENCY ONLY.
    function emergencyUnstake(uint256 _tokenId) public {
        bool isApprovedParty = approvedParty[_tokenId] == _msgSender();
        require(
            tokenOwner[_tokenId] == _msgSender() || isApprovedParty,
            "DigitalaxParentStaking._unstake: Sender must have staked tokenID or be approved party"
        );
        _unstake(_msgSender(), _tokenId, isApprovedParty);
        emit EmergencyUnstake(_msgSender(), _tokenId);
    }


    /// @dev Updates the amount of rewards owed for each user before any tokens are moved
    function updateReward(address _user) public {
        rewardsContract.updateRewards();
        uint256 newRewards = rewardsContract.DecoRewards(lastUpdateTime, _getNow());

        if (balance == 0) {
            accumulatedRewards = accumulatedRewards.add(newRewards);
            lastUpdateTime = _getNow();
            return;
        }

        totalRoundRewards = totalRoundRewards.add(newRewards);

        address[] memory _tokens = IGuildNFTTokenRewards(address(rewardsContract)).getExtraRewardTokens();
        // Continue if there is mona value in this pool


        for (uint i=0; i< _tokens.length; i++) {
            // 2 Calculates the overall amount of mona revenue that has increased since the last time someone called this method
            uint256 thisTokenRewards = IGuildNFTTokenRewards(address(rewardsContract)).MembershipTokenRevenueRewards(_tokens[i], lastUpdateTime,
                                                _getNow());

                  console.log("the thisTokenRewards  %s", thisTokenRewards);

            // 3 Update the overall rewards per token points with the new mona rewards
            totalRoundRewardTokenRewards[_tokens[i]] = totalRoundRewardTokenRewards[_tokens[i]].add(thisTokenRewards);

                  console.log("the totalRoundRewardTokenRewards[_tokens[i]]  %s", totalRoundRewardTokenRewards[_tokens[i]]);
        }


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

        for (uint i=0; i< _tokens.length; i++) {
                    uint256 specificTokenRewards = totalRoundRewardTokenRewards[_tokens[i]].mul(ownerWeight)
                                    .div(totalWeight);

                  console.log("the specificTokenRewards  %s", specificTokenRewards);

                     if (staker.rewardTokensRewardsReleased[_tokens[i]] >= specificTokenRewards) {
                         staker.rewardTokensRewardsEarned[_tokens[i]] = staker.rewardTokensRewardsReleased[_tokens[i]];
                     } else {
                         staker.rewardTokensRewardsEarned[_tokens[i]] = specificTokenRewards;
                     }

                  console.log("the staker.rewardTokensRewardsEarned[_tokens[i]]  %s", staker.rewardTokensRewardsEarned[_tokens[i]]);
                  console.log("the staker.rewardTokensRewardsReleased[_tokens[i]]  %s", staker.rewardTokensRewardsReleased[_tokens[i]]);
        }
    }

    /// @notice Returns the about of rewards yet to be claimed
    function unclaimedRewards(address _user) external view returns(uint256) {
        if (stakedEthTotal == 0) {
            return 0;
        }

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

    /// @notice Returns the about of rewards yet to be claimed
    function unclaimedExtraRewards(address _user, address _rewardToken) external view returns(uint256) {
        if (stakedEthTotal == 0) {
            return 0;
        }

        uint256 _newRewards = IGuildNFTTokenRewards(address(rewardsContract)).MembershipTokenRevenueRewards(_rewardToken, lastUpdateTime, _getNow());
        uint256 _totalRoundRewards = totalRoundRewardTokenRewards[_rewardToken].add(_newRewards);

        uint256 _totalWeight = weightContract.calcNewWeight();

        if (_totalWeight == 0) {
            return 0;
        }

        uint256 _ownerWeight = weightContract.calcNewOwnerWeight(_user);
        uint256 _ownerTotalRewards = _totalRoundRewards.mul(_ownerWeight)
                        .div(_totalWeight);

        uint256 _payableAmount = 0;

        if (_ownerTotalRewards > stakers[_user].rewardTokensRewardsReleased[_rewardToken]) {
            _payableAmount = _ownerTotalRewards.sub(stakers[_user].rewardTokensRewardsReleased[_rewardToken]);
        } else {
            return 0;
        }

        /// @dev accounts for dust
        uint256 rewardBal = IERC20(_rewardToken).balanceOf(address(this));
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


        if (staker.rewardsEarned > staker.rewardsReleased) {
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


        // Extra tokens
        address[] memory _tokens = IGuildNFTTokenRewards(address(rewardsContract)).getExtraRewardTokens();

        // Continue if there is mona value in this pool
        for (uint i=0; i< _tokens.length; i++) {
                            console.log("the tokens are %s", _tokens[i]);
            if (staker.rewardTokensRewardsEarned[_tokens[i]] > staker.rewardTokensRewardsReleased[_tokens[i]]){
                uint256 rewardPayableAmount = staker.rewardTokensRewardsEarned[_tokens[i]].sub(staker.rewardTokensRewardsReleased[_tokens[i]]);
                staker.rewardTokensRewardsReleased[_tokens[i]] = staker.rewardTokensRewardsEarned[_tokens[i]];
                    if (rewardPayableAmount > 0) {
                        /// @dev accounts for dust
                        uint256 tokenRewardBal = IERC20(_tokens[i]).balanceOf(address(this));
                        if (rewardPayableAmount > tokenRewardBal) {
                            rewardPayableAmount = tokenRewardBal;
                        }

                        IERC20(_tokens[i]).transfer(_user, rewardPayableAmount);
                        emit TokenRevenueRewardPaid(_tokens[i], _user, rewardPayableAmount);
                    }
            }
        }
    }

    function getStakerExtraRewardsEarned(address _staker, address _rewardToken) external view returns (uint256){
        return stakers[_staker].rewardTokensRewardsEarned[_rewardToken];
    }

    function getStakerExtraRewardsReleased(address _staker, address _rewardToken) external view returns (uint256){
        return stakers[_staker].rewardTokensRewardsReleased[_rewardToken];
    }

    function onERC721Received(address, address, uint256, bytes calldata data) public returns(bytes4) {
        return _ERC721_RECEIVED;
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}
