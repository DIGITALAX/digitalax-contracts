// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IDigitalaxNFTRewards.sol";
import "./interfaces/IDigitalaxNFT.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
/**
 * @title Digitalax Staking
 * @dev Stake NFTs, earn tokens on the Digitalax platform
 * @author Digitalax Team
 */

contract DigitalaxNFTStaking is BaseRelayRecipient {
    using SafeMath for uint256;
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    IERC20 public rewardsToken;
    IDigitalaxNFT public parentNFT;

    DigitalaxAccessControls public accessControls;
    IDigitalaxNFTRewards public rewardsContract;
    bool initialised;


    /// @notice total ethereum staked currently in the gensesis staking contract
    uint256 public stakedEthTotal;

    // upgrade uint256 public stakedEthTotalOnlyMainNft;
    // upgrade uint256 public stakedEthTotalExtraNfts;
    uint256 public lastUpdateTime;

    uint256 public rewardsPerTokenPoints;
    uint256 public totalUnclaimedRewards;

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
        uint256 lastRewardPoints;
        mapping (address => uint256) lastTokenRewardPoints;
        uint256 rewardsEarned;
        uint256 rewardsReleased;
        mapping (address => uint256) tokenRevenueRewardsEarned;
        mapping (address => uint256) tokenRevenueRewardsReleased;
    }

    event UpdateAccessControls(
        address indexed accessControls
    );

    /// @notice mapping of a staker to its current properties
    mapping (address => Staker) public stakers;
    // upgrade mapping (address => ExtraTokenStaker) public extraTokenStakers;

    // Mapping from token ID to owner address
    mapping (uint256 => address) public tokenOwner;

    /// @notice sets the token to be claimable or not, cannot claim if it set to false
    bool public tokensClaimable;

    /// @notice event emitted when a user has staked a token
    event Staked(address owner, uint256 amount);
	mapping (address => uint256) public tokenRewardsPerTokenPoints;

    /// @notice event emitted when a user has unstaked a token
    event Unstaked(address owner, uint256 amount);

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

    // Upgraded with extra tokens feature
    //////////////////////////////
    uint256 public stakedEthTotalOnlyMainNft;
    mapping(address => uint256) public stakedEthTotalExtraNfts;

    struct ExtraTokenStaker {
        mapping (address => uint256[]) tokenIds;
        mapping (address => mapping (uint256 => uint256)) tokenIndex;
    }

    mapping (address => ExtraTokenStaker) extraTokenStakers;

    // Mapping from token ID to owner address
    mapping (address => mapping (uint256 => address)) public extraTokenOwner;
    mapping (address => mapping (uint256 => uint256)) public extraTokenLastPurchasePrice;
    mapping (address => mapping (uint256 => bool)) public extraTokenLastPurchasePriceWasZero;

   mapping (uint256 => uint256) public mainTokenLastPurchasePrice;
   mapping (uint256 => bool) public mainTokenLastPurchasePriceWasZero;

    mapping(address => uint256) public extraTokensIndex;
    address[] public extraTokens;

    uint256 public MAX_EXTRA_TOKENS;

     // Events
    event AddExtraTokens(
        address[] rewardTokens
    );

    event RemoveExtraTokens(
        address[] rewardTokens
    );

    /// @notice event emitted when a user has staked a token
    event StakedByNFT(address owner, uint256 amount, address token);

    /// @notice event emitted when a user has unstaked a token
    event UnstakedByNFT(address owner, uint256 amount, address token);

    event EmergencyUnstakeByNFT(address indexed user, uint256 tokenId, address token);
    ////////////////////////////////

     /**
     * @dev Single gateway to intialize the staking contract after deploying
     * @dev Sets the contract with the MONA NFT and MONA reward token
     */
    function initialize(
        IERC20 _rewardsToken,
        IDigitalaxNFT _parentNFT,
        DigitalaxAccessControls _accessControls,
        address _trustedForwarder
    )
        public
    {
        require(!initialised);
        rewardsToken = _rewardsToken;
        parentNFT = _parentNFT;
        accessControls = _accessControls;
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
    function _msgSender()
    internal
    view
    returns (address payable sender)
    {
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
            "DigitalaxNFTStaking.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "DigitalaxNFTStaking.updateAccessControls: Zero Address");
        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }

    /// @notice Lets admin set the Rewards Token
    function setRewardsContract(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxNFTStaking.setRewardsContract: Sender must be admin"
        );
        require(_addr != address(0));
        address oldAddr = address(rewardsContract);
        rewardsContract = IDigitalaxNFTRewards(_addr);
        emit RewardsTokenUpdated(oldAddr, _addr);
    }

    /// @notice Lets admin set the Rewards to be claimable
    function setTokensClaimable(
        bool _enabled
    )
        external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxParentStaking.setTokensClaimable: Sender must be admin"
        );
        tokensClaimable = _enabled;
        emit ClaimableStatusUpdated(_enabled);
    }

    /// @dev Getter functions for Staking contract
    /// @dev Get the tokens staked by a user
    function getStakedTokens(
        address _user
    )
        external
        view
        returns (uint256[] memory tokenIds)
    {
        return stakers[_user].tokenIds;
    }

    function getExtraStakedTokens(
        address _user,
        address _token
    )
        external
        view
        returns (uint256[] memory tokenIds)
    {
        return extraTokenStakers[_user].tokenIds[_token];
    }


    /// @dev Get the amount a staked nft is valued at ie bought at
    function getContribution (
        uint256 _tokenId
    )
        public
        view
        returns (uint256)
    {
        return parentNFT.primarySalePrice(_tokenId);
    }

    /// @dev Get the amount a staked nft is valued at ie bought at
    function getExtraTokenContribution (
        address _token,
        uint256 _tokenId
    )
        public
        view
        returns (uint256)
    {

        console.log("primary sale price is: %s", IDigitalaxNFT(_token).primarySalePrice(_tokenId));
        return IDigitalaxNFT(_token).primarySalePrice(_tokenId);
    }

    /// @notice Stake MONA NFTs and earn reward tokens.
    function stake(
        uint256 tokenId
    )
        external
    {
        // require();
        _stake(_msgSender(), tokenId);
    }

    /// @notice Stake multiple MONA NFTs and earn reward tokens.
    function stakeBatch(uint256[] memory tokenIds)
        external
    {
        for (uint i = 0; i < tokenIds.length; i++) {
            _stake(_msgSender(), tokenIds[i]);
        }
    }

    /**
     * @dev All the staking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they stake the nfts based on ether price
    */
    function _stake(
        address _user,
        uint256 _tokenId
    )
        internal
    {
        Staker storage staker = stakers[_user];

        if (staker.balance == 0 && staker.lastRewardPoints == 0 ) {
          staker.lastRewardPoints = rewardsPerTokenPoints;
        }

        updateReward(_user);
        uint256 amount = getContribution(_tokenId);
        mainTokenLastPurchasePrice[_tokenId] = amount;

        if(amount == 0){
            mainTokenLastPurchasePriceWasZero[_tokenId] = true;
        }

        staker.balance = staker.balance.add(amount);
        stakedEthTotal = stakedEthTotal.add(amount);

        if(stakedEthTotalOnlyMainNft == 0){
            stakedEthTotalOnlyMainNft = stakedEthTotal;
        } else {
            stakedEthTotalOnlyMainNft = stakedEthTotalOnlyMainNft.add(amount);
        }

        staker.tokenIds.push(_tokenId);
        staker.tokenIndex[_tokenId] = staker.tokenIds.length.sub(1);
        tokenOwner[_tokenId] = _user;
        parentNFT.safeTransferFrom(
            _user,
            address(this),
            _tokenId
        );

        emit Staked(_user, _tokenId);
    }

    /// @notice Unstake NFTs.
    function unstake(
        uint256 _tokenId
    )
        external
    {
        require(
            tokenOwner[_tokenId] == _msgSender(),
            "DigitalaxParentStaking._unstake: Sender must have staked tokenID"
        );
        claimReward(_msgSender());
        _unstake(_msgSender(), _tokenId);
    }

    /// @notice Stake multiple MONA NFTs and claim reward tokens.
    function unstakeBatch(
        uint256[] memory tokenIds
    )
        external
    {
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
    function _unstake(
        address _user,
        uint256 _tokenId
    )
        internal
    {

        Staker storage staker = stakers[_user];

        uint256 amount = getContribution(_tokenId);
        if(mainTokenLastPurchasePrice[_tokenId] > 0  ||  mainTokenLastPurchasePriceWasZero[_tokenId]){
            differentPrimaryPriceUpdateVariables(_tokenId);
        }

        mainTokenLastPurchasePriceWasZero[_tokenId] = false;


        staker.balance = staker.balance.sub(amount);
        stakedEthTotal = stakedEthTotal.sub(amount);

        if(stakedEthTotalOnlyMainNft >= amount){
            stakedEthTotalOnlyMainNft = stakedEthTotalOnlyMainNft.sub(amount);
        } else if(stakedEthTotalOnlyMainNft == 0){
            stakedEthTotalOnlyMainNft = stakedEthTotal;
        }

        uint256 lastIndex = staker.tokenIds.length - 1;
        uint256 lastIndexKey = staker.tokenIds[lastIndex];
        uint256 tokenIdIndex = staker.tokenIndex[_tokenId];

        staker.tokenIds[tokenIdIndex] = lastIndexKey;
        staker.tokenIndex[lastIndexKey] = tokenIdIndex;
        if (staker.tokenIds.length > 0) {
            staker.tokenIds.pop();
            delete staker.tokenIndex[_tokenId];
        }

        if (staker.balance == 0) { // Fixed in upgrade
            delete stakers[_user];
        }
        delete tokenOwner[_tokenId];

        parentNFT.safeTransferFrom(
            address(this),
            _user,
            _tokenId
        );

        emit Unstaked(_user, _tokenId);

    }

    // Unstake without caring about rewards. EMERGENCY ONLY.
    function emergencyUnstake(uint256 _tokenId) public {
        require(
            tokenOwner[_tokenId] == _msgSender(),
            "DigitalaxParentStaking._unstake: Sender must have staked tokenID"
        );
        _unstake(_msgSender(), _tokenId);
        emit EmergencyUnstake(_msgSender(), _tokenId);

    }


    /// @dev Updates the amount of rewards owed for each user before any tokens are moved
    function updateReward(
        address _user
    )
        public
    {
        rewardsContract.updateRewards();
        uint256 parentRewards = rewardsContract.MonaRewards(lastUpdateTime, _getNow());

        if (stakedEthTotal > 0) {
            rewardsPerTokenPoints = rewardsPerTokenPoints.add(parentRewards
                                            .mul(1e18)
                                            .mul(pointMultiplier)
                                            .div(stakedEthTotal));
        }

        address[] memory _tokens = rewardsContract.getExtraRewardTokens();
        // Continue if there is mona value in this pool

        if (stakedEthTotal > 0) {
        for (uint i=0; i< _tokens.length; i++) {
            // 2 Calculates the overall amount of mona revenue that has increased since the last time someone called this method
            uint256 thisTokenRewards = rewardsContract.TokenRevenueRewards(_tokens[i], lastUpdateTime,
                                                _getNow());

            // 3 Update the overall rewards per token points with the new mona rewards
            tokenRewardsPerTokenPoints[_tokens[i]] = tokenRewardsPerTokenPoints[_tokens[i]].add(thisTokenRewards
                .mul(1e18)
                .mul(pointMultiplier)
                .div(stakedEthTotal));

            }

        }

        lastUpdateTime = _getNow();
        uint256 rewards = rewardsOwing(_user);

        Staker storage staker = stakers[_user];
        if (_user != address(0)) {
            staker.rewardsEarned = staker.rewardsEarned.add(rewards);
            staker.lastRewardPoints = rewardsPerTokenPoints;
                for (uint i=0; i< _tokens.length; i++) {
                    uint256 specificTokenRewards = tokenRewardsOwing(_user, _tokens[i]);
                    staker.tokenRevenueRewardsEarned[_tokens[i]] = staker.tokenRevenueRewardsEarned[_tokens[i]].add(specificTokenRewards);
                    staker.lastTokenRewardPoints[_tokens[i]] = tokenRewardsPerTokenPoints[_tokens[i]];
                  }
        }
    }


    /// @notice Returns the rewards owing for a user
    /// @dev The rewards are dynamic and normalised from the other pools
    /// @dev This gets the rewards from each of the periods as one multiplier
    function rewardsOwing(
        address _user
    )
        public
        view
        returns(uint256)
    {
        uint256 newRewardPerToken = rewardsPerTokenPoints.sub(stakers[_user].lastRewardPoints);
        uint256 rewards = stakers[_user].balance.mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);
        return rewards;
    }
    function tokenRewardsOwing(
        address _user,
        address _token
    )
        public
        view
        returns(uint256)
    {
        uint256 newRewardPerToken = tokenRewardsPerTokenPoints[_token].sub(stakers[_user].lastTokenRewardPoints[_token]);
        uint256 rewards = stakers[_user].balance.mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);

        return rewards;
    }


    /// @notice Returns the about of rewards yet to be claimed
    function unclaimedRewards(
        address _user
    )
        external
        view
        returns(uint256)
    {
        if (stakedEthTotal == 0) {
            return 0;
        }

        uint256 parentRewards = rewardsContract.MonaRewards(lastUpdateTime, _getNow());

        uint256 newRewardPerToken = rewardsPerTokenPoints.add(parentRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(stakedEthTotal))
                                                         .sub(stakers[_user].lastRewardPoints);

        uint256 rewards = stakers[_user].balance.mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);
        return rewards.add(stakers[_user].rewardsEarned).sub(stakers[_user].rewardsReleased);
    }
/*
      * @notice Returns the about of rewards yet to be claimed (this currently includes pending and awarded together
      * @param _user the user we are interested in
      * @dev returns the claimable rewards and pending rewards
      */
    function unclaimedExtraRewards(
        address _user,
        address _token
    )
        public
        view
        returns(uint256 claimableRewards, uint256 pendingRewards)
    {
        if (stakedEthTotal == 0) {
            return (0,0);
        }

        Staker storage staker = stakers[_user];

        uint256 tokenRewards = rewardsContract.TokenRevenueRewards(_token, lastUpdateTime,
                                                        _getNow());

        uint256 newRewardPerToken = tokenRewardsPerTokenPoints[_token].add(tokenRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(stakedEthTotal))
                                                         .sub(staker.lastTokenRewardPoints[_token]);

        uint256 newRewards = stakers[_user].balance.mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);

        claimableRewards = staker.tokenRevenueRewardsEarned[_token].add(newRewards).sub(staker.tokenRevenueRewardsReleased[_token]);

        pendingRewards = newRewards.add(staker.tokenRevenueRewardsEarned[_token]);
    }


    /// @notice Lets a user with rewards owing to claim tokens
    function claimReward(
        address _user
    )
        public
    {
        require(
            tokensClaimable == true,
            "Tokens cannnot be claimed yet"
        );
        updateReward(_user);

        Staker storage staker = stakers[_user];

        uint256 payableAmount = staker.rewardsEarned.sub(staker.rewardsReleased);
        staker.rewardsReleased = staker.rewardsReleased.add(payableAmount);

        /// @dev accounts for dust
        uint256 rewardBal = rewardsToken.balanceOf(address(this));
        if (payableAmount > rewardBal) {
            payableAmount = rewardBal;
        }

        rewardsToken.transfer(_user, payableAmount);
        emit RewardPaid(_user, payableAmount);

	    // Extra tokens
        address[] memory _tokens = rewardsContract.getExtraRewardTokens();
        // Continue if there is mona value in this pool
        for (uint i=0; i< _tokens.length; i++) {
            uint256 rewardPayableAmount = 0;
            if(staker.tokenRevenueRewardsEarned[_tokens[i]] >= staker.tokenRevenueRewardsReleased[_tokens[i]]) {
                rewardPayableAmount = staker.tokenRevenueRewardsEarned[_tokens[i]].sub(staker.tokenRevenueRewardsReleased[_tokens[i]]);
                staker.tokenRevenueRewardsReleased[_tokens[i]] = staker.tokenRevenueRewardsEarned[_tokens[i]];
            }
            if(rewardPayableAmount > 0){
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


    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata data
    )
        public returns(bytes4)
    {
        return _ERC721_RECEIVED;
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    /*
     * @dev Setter functions for contract config custom last rewards time for a pool
     */
    function setMaxExtraTokens(
    uint256 _maxExtraTokensCount) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "SetMaxRewardsTokens: Sender must be admin"
        );
        MAX_EXTRA_TOKENS = _maxExtraTokensCount;

    }

    function addExtraTokens(address[] memory _extraTokens) public {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "AddExtraTokens: Sender must be admin"
        );
        require((_extraTokens.length) > 0, "AddExtraTokens: Empty array not supported");
        require(MAX_EXTRA_TOKENS >= _extraTokens.length, "AddExtraTokens: Already reached max erc20 supported");
        for (uint i = 0; i < _extraTokens.length; i++) {
            if(!checkInExtraTokens(_extraTokens[i]) && _extraTokens[i] != address(parentNFT)) { // Main nft not supported for now
                uint256 index = extraTokens.length;
                extraTokens.push(_extraTokens[i]);
                extraTokensIndex[_extraTokens[i]] = index;
            }
        }
        emit AddExtraTokens(_extraTokens);
    }

    function removeExtraTokens(address[] memory _extraTokens) public {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "RemoveExtraTokens: Sender must be admin"
        );

        require((extraTokens.length) > 0, "RemoveExtraTokens: No extra tokens instantiated");
        require((_extraTokens.length) > 0, "RemoveExtraTokens: Empty array not supported");

        for (uint i = 0; i < _extraTokens.length; i++) {
            if(checkInExtraTokens(_extraTokens[i])) {
                uint256 rowToDelete = extraTokensIndex[_extraTokens[i]];
                address keyToMove = extraTokens[extraTokens.length-1];
                extraTokens[rowToDelete] = keyToMove;
                extraTokensIndex[keyToMove] = rowToDelete;
                extraTokens.pop();
                delete(extraTokensIndex[_extraTokens[i]]);
            }
        }

        emit RemoveExtraTokens(_extraTokens);
    }

    function checkInExtraTokens(address _extraToken) public view returns (bool isAddress) {
        if(extraTokens.length == 0) return false;
        return (extraTokens[extraTokensIndex[_extraToken]] == _extraToken);
    }

    function getExtraTokens() external view returns (address[] memory returnExtraTokens){
        return _getExtraTokens();
    }

    function _getExtraTokens() internal view returns (address[] memory returnExtraTokens){
        address[] memory a = new address[](extraTokens.length);
        for (uint i=0; i< extraTokens.length; i++) {
            a[i] = extraTokens[i];
        }
        return a;
    }

    // New staking upgrade
    /// @notice Stake MONA NFTs and earn reward tokens.
    function stakeByNFT(
        uint256 tokenId,
        address token
    )
        external
    {
        // require();
        _stakeByNFT(_msgSender(), tokenId, token);
    }

    /// @notice Stake multiple MONA NFTs and earn reward tokens.
    function stakeBatchByNFT(uint256[] memory tokenIds, address[] memory tokens)
        external
    {
        require(tokenIds.length == tokens.length, "Arrays must be same length");
        for (uint i = 0; i < tokenIds.length; i++) {
            _stakeByNFT(_msgSender(), tokenIds[i], tokens[i]);
        }
    }

    /**
     * @dev All the staking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they stake the nfts based on ether price
    */
    function _stakeByNFT(
        address _user,
        uint256 _tokenId,
        address _token
    )
        internal
    {
        Staker storage staker = stakers[_user];
        ExtraTokenStaker storage extraTokenStaker = extraTokenStakers[_user];

        if (staker.balance == 0 && staker.lastRewardPoints == 0 ) {
          staker.lastRewardPoints = rewardsPerTokenPoints;
        }

        updateReward(_user);
        uint256 amount = getExtraTokenContribution(_token, _tokenId);

        extraTokenLastPurchasePrice[_token][_tokenId] = amount;

        if(amount == 0){
            extraTokenLastPurchasePriceWasZero[_token][_tokenId] = true;
        }

        staker.balance = staker.balance.add(amount);
        stakedEthTotal = stakedEthTotal.add(amount);

        if(stakedEthTotalOnlyMainNft == 0){
            stakedEthTotalOnlyMainNft = stakedEthTotal;
        }

        stakedEthTotalExtraNfts[_token] = stakedEthTotalExtraNfts[_token].add(amount);

        extraTokenStaker.tokenIds[_token].push(_tokenId);
        extraTokenStaker.tokenIndex[_token][_tokenId] = extraTokenStaker.tokenIds[_token].length.sub(1);
        extraTokenOwner[_token][_tokenId] = _user;
        IDigitalaxNFT(_token).safeTransferFrom(
            _user,
            address(this),
            _tokenId
        );

        emit StakedByNFT(_user, _tokenId, _token);
    }

    /// @notice Unstake NFTs.
    function unstakeByNFT(
        uint256 _tokenId,
        address _token
    )
        external
    {
        require(
            extraTokenOwner[_token][_tokenId] == _msgSender(),
            "DigitalaxParentStaking._unstake: Sender must have staked tokenID"
        );
        claimReward(_msgSender());
        _unstakeByNFT(_msgSender(), _tokenId, _token);
    }

    /// @notice Stake multiple MONA NFTs and claim reward tokens.
    function unstakeBatchByNFT(
        uint256[] memory tokenIds,
        address[] memory tokens
    )
        external
    {
        require(tokenIds.length == tokens.length, "Arrays must be same length");
        claimReward(_msgSender());
        for (uint i = 0; i < tokenIds.length; i++) {
            if (extraTokenOwner[tokens[i]][tokenIds[i]] == _msgSender()) {
                _unstakeByNFT(_msgSender(), tokenIds[i], tokens[i]);
            }
        }
    }

     /**
     * @dev All the unstaking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they unstake the nfts based on ether price
    */
    function _unstakeByNFT(
        address _user,
        uint256 _tokenId,
        address _token
    )
        internal
    {

        Staker storage staker = stakers[_user];
        ExtraTokenStaker storage extraTokenStaker = extraTokenStakers[_user];

        uint256 amount = getExtraTokenContribution(_token, _tokenId);

        extraTokenLastPurchasePriceWasZero[_token][_tokenId] = false;

        staker.balance = staker.balance.sub(amount);
        stakedEthTotal = stakedEthTotal.sub(amount);

        if (stakedEthTotalOnlyMainNft == 0){
            stakedEthTotalOnlyMainNft = stakedEthTotal;
        }

        if (stakedEthTotalExtraNfts[_token] >= amount){
            stakedEthTotalExtraNfts[_token]  = stakedEthTotalExtraNfts[_token].sub(amount);
        }

        uint256 lastIndex = extraTokenStaker.tokenIds[_token].length - 1;
        uint256 lastIndexKey = extraTokenStaker.tokenIds[_token][lastIndex];
        uint256 tokenIdIndex = extraTokenStaker.tokenIndex[_token][_tokenId];

        extraTokenStaker.tokenIds[_token][tokenIdIndex] = lastIndexKey;
        extraTokenStaker.tokenIndex[_token][lastIndexKey] = tokenIdIndex;

        if (extraTokenStaker.tokenIds[_token].length > 0) {
            delete extraTokenStaker.tokenIds[_token][extraTokenStaker.tokenIds[_token].length -1];
            delete extraTokenStaker.tokenIndex[_token][_tokenId];
        }


        if(staker.balance == 0){
            delete stakers[_user];
        }

        delete extraTokenOwner[_token][_tokenId];

        IDigitalaxNFT(_token).safeTransferFrom(
            address(this),
            _user,
            _tokenId
        );

        emit UnstakedByNFT(_user, _tokenId, _token);

    }

    // Unstake without caring about rewards. EMERGENCY ONLY.
    function emergencyUnstakeByNFT(uint256 _tokenId, address _token) public {
        require(
            extraTokenOwner[_token][_tokenId] == _msgSender(),
            "DigitalaxParentStaking._unstakeByNFT: Sender must have staked tokenID"
        );
        differentPrimaryPriceUpdateVariablesExtraToken(_tokenId, _token);
        _unstakeByNFT(_msgSender(), _tokenId, _token);
        emit EmergencyUnstakeByNFT(_msgSender(), _tokenId, _token);

    }

    // Save the primary sale price so that it updates the appropriate user with this
    function saveCurrentPrimarySalePrice(uint256[] memory _tokenIds) public {
        // First check  owner
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxNFTStaking.saveCurrentPrimarySalePrice: Sender must be admin"
        );
        for (uint i = 0; i < _tokenIds.length; i++) {
            // Then check if token owner
            require(tokenOwner[_tokenIds[i]] != address(0), "Must be staked in the platform");
            // Then set the price on new mapping
            mainTokenLastPurchasePrice[_tokenIds[i]] = parentNFT.primarySalePrice(_tokenIds[i]); // It is assumed this is the value it had when it entered into the contract.
            if(mainTokenLastPurchasePrice[_tokenIds[i]] == 0){
                mainTokenLastPurchasePriceWasZero[_tokenIds[i]] = true;
            }
        }
    }


    // Save the primary sale price so that it updates the appropriate user with this price after you update the price
    function priceUpdatedTokens(uint256[] memory _tokenIds) public {
        // First check  owner
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxNFTStaking.saveCurrentPrimarySalePrice: Sender must be admin"
        );

        for (uint i = 0; i < _tokenIds.length; i++) {
            // Then check if token owner
            require(tokenOwner[_tokenIds[i]] != address(0), "Must be staked in the platform");
            differentPrimaryPriceUpdateVariables(_tokenIds[i]);
        }
    }

    // The following function is used to update the proper balances if the contract has been notified of a change in value using saveCurrentPrimarySalePrice
    function differentPrimaryPriceUpdateVariables(uint256 _tokenId) internal {
        uint256 _value = getContribution(_tokenId);
        Staker storage staker = stakers[tokenOwner[_tokenId]];
        if(mainTokenLastPurchasePrice[_tokenId] > _value){ // New value less than the old value
            uint256 delta = mainTokenLastPurchasePrice[_tokenId].sub(_value);
            staker.balance = staker.balance.sub(delta);
            stakedEthTotal = stakedEthTotal.sub(delta);
            stakedEthTotalOnlyMainNft = stakedEthTotalOnlyMainNft.sub(delta);

        } else if(mainTokenLastPurchasePrice[_tokenId]< _value){ // New value greater than the old value
            uint256 delta = _value.sub(mainTokenLastPurchasePrice[_tokenId]);
            staker.balance = staker.balance.add(delta);
            stakedEthTotal = stakedEthTotal.add(delta);
            stakedEthTotalOnlyMainNft = stakedEthTotalOnlyMainNft.add(delta);
        }
        if(mainTokenLastPurchasePrice[_tokenId] == 0){
            mainTokenLastPurchasePriceWasZero[_tokenId] = true;
        } else {
            mainTokenLastPurchasePriceWasZero[_tokenId] = false;
        }
    }

    // Save the primary sale price so that it updates the appropriate user with this
    // This only needs to be used at first to save the ones that havent been previously stored.
    function saveCurrentPrimarySalePriceExtraTokens(uint256[] memory _tokenIds, address[] memory _tokens) public {
        // First check  owner
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxNFTStaking.saveCurrentPrimarySalePriceExtraToken: Sender must be admin"
        );
         for (uint i = 0; i < _tokenIds.length; i++) {
            // Then check if token owner
            require(extraTokenOwner[_tokens[i]][_tokenIds[i]] != address(0), "Must be staked in the platform");
            require(_tokens[i] != address(0), "Token cannot be 0");
            // Then set the price on new mapping
            extraTokenLastPurchasePrice[_tokens[i]][_tokenIds[i]] = IDigitalaxNFT(_tokens[i]).primarySalePrice(_tokenIds[i]); // It is assumed this is the value it had when it entered into the contract.
            if(extraTokenLastPurchasePrice[_tokens[i]][_tokenIds[i]] == 0){
                extraTokenLastPurchasePriceWasZero[_tokens[i]][_tokenIds[i]] = true;
            }
         }
    }

    // Save the primary sale price so that it updates the appropriate user with this price after you update the price
    function priceUpdatedExtraTokens(uint256[] memory _tokenIds, address[] memory _tokens) public {
        // First check  owner
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxNFTStaking.saveCurrentPrimarySalePrice: Sender must be admin"
        );
        require(_tokenIds.length == _tokens.length, "Arrays must be same length");
        for (uint i = 0; i < _tokenIds.length; i++) {
            // Then check if token owner
            require(extraTokenOwner[_tokens[i]][_tokenIds[i]] != address(0), "Must be staked in the platform");
            require(_tokens[i] != address(0), "Token cannot be 0");
            differentPrimaryPriceUpdateVariablesExtraToken(_tokenIds[i], _tokens[i]);
        }
    }

    // The following function is used to update the proper balances if the contract has been notified of a change in value using saveCurrentPrimarySalePrice
    function differentPrimaryPriceUpdateVariablesExtraToken(uint256 _tokenId, address _token) internal {
            uint256 _value = getExtraTokenContribution(_token, _tokenId);
            Staker storage staker = stakers[extraTokenOwner[_token][_tokenId]];
            if(extraTokenLastPurchasePrice[_token][_tokenId] > _value){ // New value less than the old value

                uint256 delta = extraTokenLastPurchasePrice[_token][_tokenId].sub(_value);
                staker.balance = staker.balance.sub(delta);
                stakedEthTotal = stakedEthTotal.sub(delta);
                stakedEthTotalExtraNfts[_token] = stakedEthTotalExtraNfts[_token].sub(delta);

            } else if(extraTokenLastPurchasePrice[_token][_tokenId]< _value){ // New value greater than the old value
                uint256 delta = _value.sub(extraTokenLastPurchasePrice[_token][_tokenId]);
                staker.balance = staker.balance.add(delta);
                stakedEthTotal = stakedEthTotal.add(delta);
                stakedEthTotalExtraNfts[_token] = stakedEthTotalExtraNfts[_token].add(delta);
            }

            if(extraTokenLastPurchasePrice[_token][_tokenId] == 0){
                extraTokenLastPurchasePriceWasZero[_token][_tokenId] = true;
            } else {
                extraTokenLastPurchasePriceWasZero[_token][_tokenId] = false;
            }
    }
}
