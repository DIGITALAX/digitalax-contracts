// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./DigitalaxAccessControls.sol";
import "./DigitalaxGenesisNFT.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IDigitalaxRewards.sol";
import "../interfaces/IDigitalaxGenesisNFT.sol";

/**
 * @title Digitalax Staking
 * @dev Stake NFTs, earn tokens on the Digitialax platform
 * @author Adrian Guerrera (deepyr)
 * @author DIGITALAX CORE TEAM
 */


contract DigitalaxGenesisStaking {
    using SafeMath for uint256;
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    IERC20 public rewardsToken;
    IDigitalaxGenesisNFT public genesisNFT;
    DigitalaxAccessControls public accessControls;
    IDigitalaxRewards public rewardsContract;

    /// @notice all funds will be sent to this address pon purchase of a Genesis NFT
    address payable public fundsMultisig;

    /// @notice total ethereum staked currently in the gensesis staking contract
    uint256 public stakedEthTotal;
    uint256 public lastUpdateTime;

    uint256 public rewardsPerTokenPoints;
    uint256 public totalUnclaimedRewards;

    uint256 constant pointMultiplier = 10e32;

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
        uint256 rewardsEarned;
        uint256 rewardsReleased;
    }

    /// @notice mapping of a staker to its current properties
    mapping (address => Staker) public stakers;

    // Mapping from token ID to owner address
    mapping (uint256 => address) public tokenOwner;

    /// @notice tokenId => amount contributed
    mapping (uint256 => uint256) public contribution;
    uint256 public totalContributions;
    // @notice the maximum accumulative amount a user can contribute to the genesis sale
    uint256 public constant maximumContributionAmount = 2 ether;

    /// @notice sets the token to be claimable or not, cannot claim if it set to false
    bool public tokensClaimable;
    bool initialised;

    /// @notice event emitted when a user has staked a token
    event Staked(address owner, uint256 amount);

    /// @notice event emitted when a user has unstaked a token
    event Unstaked(address owner, uint256 amount);

    /// @notice event emitted when a user claims reward
    event RewardPaid(address indexed user, uint256 reward);
    
    /// @notice Allows reward tokens to be claimed
    event ClaimableStatusUpdated(bool status);

    /// @notice Emergency unstake tokens without rewards
    event EmergencyUnstake(address indexed user, uint256 tokenId);

    // @notice event emitted when a contributors amount is increased
    event ContributionIncreased(
        uint256 indexed tokenId,
        uint256 contribution
    );

    constructor() public {
    }
     /**
     * @dev Single gateway to intialize the staking contract after deploying
     * @dev Sets the contract with the MONA genesis NFT and MONA reward token 
     */
    function initGenesisStaking(
        address payable _fundsMultisig,
        IERC20 _rewardsToken,
        IDigitalaxGenesisNFT _genesisNFT,
        DigitalaxAccessControls _accessControls
    )
        public
    {
        require(!initialised, "Already initialised");
        fundsMultisig = _fundsMultisig;
        rewardsToken = _rewardsToken;
        genesisNFT = _genesisNFT;
        accessControls = _accessControls;
        lastUpdateTime = block.timestamp;
        initialised = true;
    }

    function setRewardsContract(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxGenesisStaking.setRewardsContract: Sender must be admin"
        );
        require(_addr != address(0));
        rewardsContract = IDigitalaxRewards(_addr);
    }

    function setTokensClaimable(
        bool _enabled
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxGenesisStaking.setTokensClaimable: Sender must be admin"
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


    /// @dev Get the amount a staked nft is valued at ie bought at
    function getGenesisContribution (
        uint256 _tokenId
    ) 
        public
        view
        returns (uint256 amount)
    {
        return contribution[_tokenId];
    }

    /// @notice Stake Genesis MONA NFT and earn reward tokens. 
    function stake(
        uint256 tokenId
    )
        external
    {
        _stake(msg.sender, tokenId);
    }

     /// @notice Stake multiple MONA NFTs and earn reward tokens. 
    function stakeBatch(uint256[] memory tokenIds)
        external
    {
        for (uint i = 0; i < tokenIds.length; i++) {
            _stake(msg.sender, tokenIds[i]);
        }
    }

    /// @notice Stake all your MONA NFTs and earn reward tokens. 
    function stakeAll()
        external
    {
        uint256 balance = genesisNFT.balanceOf(msg.sender);
        for (uint i = 0; i < balance; i++) {
            _stake(msg.sender, genesisNFT.tokenOfOwnerByIndex(msg.sender,i));
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
        uint256 amount = getGenesisContribution(_tokenId);
        staker.balance = staker.balance.add(amount);
        stakedEthTotal = stakedEthTotal.add(amount);
        staker.tokenIds.push(_tokenId);
        staker.tokenIndex[staker.tokenIds.length - 1];
        tokenOwner[_tokenId] = _user;
        genesisNFT.safeTransferFrom(
            _user,
            address(this),
            _tokenId
        );

        emit Staked(_user, _tokenId);
    }

    /// @notice Unstake Genesis MONA NFTs. 
    function unstake(
        uint256 _tokenId
    ) 
        external 
    {
        require(
            tokenOwner[_tokenId] == msg.sender,
            "DigitalaxGenesisStaking._unstake: Sender must have staked tokenID"
        );
        claimReward(msg.sender);
        _unstake(msg.sender, _tokenId);
    }

    /// @notice Stake multiple Genesis NFTs and claim reward tokens. 
    function unstakeBatch(
        uint256[] memory tokenIds
    )
        external
    {
        claimReward(msg.sender);
        for (uint i = 0; i < tokenIds.length; i++) {
            if (tokenOwner[tokenIds[i]] == msg.sender) {
                _unstake(msg.sender, tokenIds[i]);
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

        uint256 amount = getGenesisContribution(_tokenId);
        staker.balance = staker.balance.sub(amount);
        stakedEthTotal = stakedEthTotal.sub(amount);

        uint256 lastIndex = staker.tokenIds.length - 1;
        uint256 lastIndexKey = staker.tokenIds[lastIndex];
        staker.tokenIds[staker.tokenIndex[_tokenId]] = lastIndexKey;
        staker.tokenIndex[lastIndexKey] = staker.tokenIndex[_tokenId];
        if (staker.tokenIds.length > 0) {
            staker.tokenIds.pop();
            delete staker.tokenIndex[_tokenId];
        }

        if (staker.balance == 0) {
            delete stakers[_user];
        }
        delete tokenOwner[_tokenId];

        genesisNFT.safeTransferFrom(
            address(this),
            _user,
            _tokenId
        );

        emit Unstaked(_user, _tokenId);

    }

    // Unstake without caring about rewards. EMERGENCY ONLY.
    function emergencyUnstake(uint256 _tokenId) external {
        require(
            tokenOwner[_tokenId] == msg.sender,
            "DigitalaxGenesisStaking._unstake: Sender must have staked tokenID"
        );
        _unstake(msg.sender, _tokenId);
        emit EmergencyUnstake(msg.sender, _tokenId);

    }


    /// @dev Updates the amount of rewards owed for each user before any tokens are moved
    function updateReward(
        address _user
    ) 
        public 
    {
        rewardsContract.updateRewards();
        uint256 genesisRewards = rewardsContract.genesisRewards(lastUpdateTime, block.timestamp);

        if (stakedEthTotal > 0) {
            rewardsPerTokenPoints = rewardsPerTokenPoints.add(genesisRewards
                                            .mul(1e18)
                                            .mul(pointMultiplier)
                                            .div(stakedEthTotal));
        }
        
        lastUpdateTime = block.timestamp;
        uint256 rewards = rewardsOwing(_user);

        Staker storage staker = stakers[_user];
        if (_user != address(0)) {
            staker.rewardsEarned = staker.rewardsEarned.add(rewards);
            staker.lastRewardPoints = rewardsPerTokenPoints; 
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

        rewardsToken.transfer(_user, payableAmount);
        emit RewardPaid(_user, payableAmount);
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

        uint256 genesisRewards = rewardsContract.genesisRewards(lastUpdateTime,
                                                        block.timestamp);

        uint256 newRewardPerToken = rewardsPerTokenPoints.add(genesisRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(stakedEthTotal))
                                                         .sub(stakers[_user].lastRewardPoints);
                                                         
        uint256 rewards = stakers[_user].balance.mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);
        return rewards.add(stakers[_user].rewardsEarned).sub(stakers[_user].rewardsReleased);
    }

    // Set contribution amounts for NFTs
    ///@dev So the genesis contracts did not have any way to check how much was contributed
    ///@dev So instead we put in the amounts using this function
    function setContributions(
        uint256[] memory tokens,
        uint256[] memory amounts
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxGenesisStaking.setContributions: Sender must be admin"
        );
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 token = tokens[i];
            uint256 amount = amounts[i];
            contribution[token] = amount;
            totalContributions = totalContributions.add(amount);

        }
    }

    /**
     * @notice Facilitates an owner to increase there contribution
     * @dev Cannot contribute less than minimumContributionAmount
     * @dev Cannot contribute accumulative more than than maximumContributionAmount
     * @dev Reverts if caller does not already owns an genesis token
     * @dev All funds move to fundsMultisig
     */
    function increaseContribution(uint256 _tokenId)
        external
        payable
    {
        updateReward(tokenOwner[_tokenId]);
        require(
            contribution[_tokenId] > 0,
            "DigitalaxGenesisStaking.increaseContribution: genesis NFT was not contribibuted"
        );

        uint256 _amountToIncrease = msg.value;
        contribution[_tokenId] = contribution[_tokenId].add(_amountToIncrease);

        require(
            contribution[_tokenId] <= maximumContributionAmount,
            "DigitalaxGenesisStaking.increaseContribution: You cannot exceed the maximum contribution amount"
        );

        totalContributions = totalContributions.add(_amountToIncrease);

        (bool fundsTransferSuccess,) = fundsMultisig.call{value : _amountToIncrease}("");
        require(
            fundsTransferSuccess,
            "DigitalaxGenesisStaking.increaseContribution: Unable to send contribution to funds multisig"
        );
        
        Staker storage staker = stakers[tokenOwner[_tokenId]];
        /// @dev Update staked balance
        if (staker.tokenIds[staker.tokenIndex[_tokenId]] == _tokenId ) {
            staker.balance = staker.balance.add(_amountToIncrease);
            stakedEthTotal = stakedEthTotal.add(_amountToIncrease);
        }
        emit ContributionIncreased(_tokenId, _amountToIncrease);
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



}