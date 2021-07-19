pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../EIP2771/BaseRelayRecipient.sol";

/**
 * @title Digitalax Guild NFT Staking Weight
 * @dev Calculates the weight for staking on the PODE system
 * @author DIGITALAX CORE TEAM
 * @author
 */

contract GuildNFTStakingWeightV1 is BaseRelayRecipient {
    using SafeMath for uint256;

    IERC20 public guildNativeERC20Token;
    address public stakingContract;

    uint256 constant MULTIPLIER = 100000;

    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 constant DAILY_NFT_WEIGHT_DEFAULT = 10; //

    uint256 constant DEFAULT_POINT_WITHOUT_DECAY_RATE = 1000;
    uint256 constant DECAY_POINT_DEFAULT = 75;
    uint256 constant DECAY_POINT_WITH_APPRAISAL = 25;

    mapping (string => uint256) reactionPoint;

    struct TokenReaction {
        uint256 metaverseCount;
        uint256 clapCount;
        uint256 shareCount;
        uint256 followCount;
        uint256 favoriteCount;
        uint256 skipCount;
        mapping (string => uint256) appraisalCount;
        uint256 stakedERC20Balance;
        bool stakeERC20ButtonClicked;
    }

    struct TokenWeight {
        uint256 lastWeight;
        mapping (uint256 => uint256) dailyWeight;

        mapping (uint256 => TokenReaction) dailyTokenReaction;

        uint256 stakedERC20Balance;

        uint256 lastUpdateDay;
    }

    struct OwnerWeight {
        uint256 lastWeight;
        uint256 totalAppraisals;
        uint256 stakedNFTCount;
        mapping (uint256 => uint256) dailyClapPowerLevel;
        mapping (uint256 => uint256) dailyWeight;
        mapping (uint256 => uint256) dailyAppraisedTokenCount;
        uint256 startDay;
        uint256 lastUpdateDay;
        uint256 balance;
    }

    struct AppraiserWeight {
        uint256 totalReactionCount;
        uint256 stakedERC20Balance;
        mapping (uint256 => uint256) dailyReactionCount;
        mapping (uint256 => uint256) dailyWeight;
        mapping (uint256 => uint256) dailyClapCount;
        mapping (uint256 => uint256) dailyClapLimit;
        mapping (uint256 => uint256) dailyStakedERC20Balance;

        mapping (uint256 => mapping (uint256 => TokenReaction)) dailyTokenReaction;
    }

    struct DailyReaction {
        // reaction => appraiserCount
        mapping (uint256 => uint256) appraisersGaveReaction;
    }

    uint256 public startTime;
    uint256 public stakedNFTCount;
    uint256 public stakedERC20Balance;
    uint256 public totalTokenWeight;
    uint256 public totalAppraiserWeight;
    uint256 public totalGuildWeight;

    mapping (uint256 => address) public tokenOwner;
    mapping (uint256 => TokenWeight) public tokenWeight;
    mapping (address => OwnerWeight) public ownerWeight;
    mapping (address => AppraiserWeight) public appraiserWeight;
    mapping (uint256 => uint256) dailyWeight;


    uint256 public lastUpdateDay;

    bool initialised;

    constructor() public {
        startTime = _getNow();
        reactionPoint["Love"] = 30;
        reactionPoint["Like"] = 10;
        reactionPoint["Fire"] = 25;
        reactionPoint["Sad"] = 5;
        reactionPoint["Angry"] = 15;
        reactionPoint["Novel"] = 20;

        reactionPoint["Metaverse"] = 13;

        reactionPoint["Follow"] = 10;
        reactionPoint["Share"] = 20;
        reactionPoint["Favorite"] = 15;

        reactionPoint["Skip"] = 1;
    }

    function init(address _stakingContract, IERC20 _guildNativeERC20Token) external {
        require(!initialised, "Already initialised");
        
        stakingContract = _stakingContract;
        guildNativeERC20Token = _guildNativeERC20Token;
        initialised = true;
    }

    function updateReactionPoint(string memory _reaction, uint256 _point) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");

        reactionPoint[_reaction] = _point;
    }

    function balanceOf(address _owner) external view returns (uint256) {
        return ownerWeight[_owner].stakedNFTCount;
    }

    function getTotalWeight() external view returns (uint256) {
        return 0;
        // return totalTokenWeight;
    }

    function getOwnerWeight(address _tokenOwner) external view returns (uint256) {
        return ownerWeight[_tokenOwner].lastWeight;
    }

    function getTokenPrice(uint256 _tokenId) external view returns (uint256) {
        return 1;
    }

    function _getClapLimit(uint256 _totalSupply, uint256 _balance) internal view returns (uint256) {
        uint256 _percentage = _balance.mul(MULTIPLIER).div(_totalSupply);

        if (_percentage > 1000) {           // 1+% held
            return 270;
        } else if (_percentage > 500) {     // 0.5% > 1% held
            return 240;
        } else if (_percentage > 250) {     // 0.25% > 0.5% held
            return 210;
        } else if (_percentage > 100) {     // 0.1% > 0.25% held
            return 180;
        } else if (_percentage > 50) {      // 0.05% > 0.1% held
            return 150;
        } else if (_percentage > 25) {      // 0.025% > 0.05% held
            return 120;
        } else if (_percentage > 10) {      // 0.01% > 0.025% held
            return 90;
        } else if (_percentage > 5) {       // 0.005% > 0.01% held
            return 60;
        } else if (_percentage > 0) {       // 0 > 0.005% held
            return 30;
        }

        return 0;                           // 0 held
    }

    function _getPowerLevelByClapLimit(uint256 _clapLimit) internal pure returns (uint256) {
        return _clapLimit / 30;
    }

    function _getReactionPoints(TokenReaction storage _reaction) internal view {
        uint256 result = 0;

        result = result.add(_reaction.metaverseCount.mul(reactionPoint["Metaverse"]));

        result = result.add(_reaction.shareCount.mul(reactionPoint["Share"]));
        result = result.add(_reaction.favoriteCount.mul(reactionPoint["Favorite"]));
        result = result.add(_reaction.followCount.mul(reactionPoint["Follow"]));
        result = result.add(_reaction.skipCount.mul(reactionPoint["Skip"]));

        uint256 _totalSupply = guildNativeERC20Token.totalSupply();
        uint256 _clapLimit = _getClapLimit(_totalSupply, _reaction.stakedERC20Balance);
        result = result.add(_reaction.clapCount.mul(_getPowerLevelByClapLimit(_clapLimit)));

        result = result.add(_reaction.clapCount);       // stake points = clap limit per day

        result = result.add(_reaction.appraisalCount["Love"].mul(reactionPoint["Love"]));
        result = result.add(_reaction.appraisalCount["Like"].mul(reactionPoint["Like"]));
        result = result.add(_reaction.appraisalCount["Fire"].mul(reactionPoint["Fire"]));
        result = result.add(_reaction.appraisalCount["Sad"].mul(reactionPoint["Sad"]));
        result = result.add(_reaction.appraisalCount["Angry"].mul(reactionPoint["Angry"]));
        result = result.add(_reaction.appraisalCount["Novel"].mul(reactionPoint["Novel"]));
    }

    function calcNewTotalNFTWeight() internal view returns (uint256) {
        return 0;
    }

    function calcNewTotalAppraiserWeight() internal view returns (uint256) {
        return 0;
    }

    function calcNewWeight() public view returns (uint256) {
        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= lastUpdateDay || stakedERC20Balance == 0) { // NOTE VICTOR MADE THIS CHANGE
            return totalGuildWeight;
        }

        uint256 _nft = calcNewTotalNFTWeight();
        uint256 _appraiser = calcNewTotalAppraiserWeight();

        return _nft.add(_appraiser);
    }

    function updateWeight() public returns (bool) {
        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= lastUpdateDay) {
            return false;
        }

        totalGuildWeight = calcNewWeight();

        lastUpdateDay = _currentDay;

        return true;
    }

    function calcNewOwnerWeight(address _tokenOwner) public view returns (uint256) {
        uint256 _currentDay = getCurrentDay();

        OwnerWeight storage _owner = ownerWeight[_tokenOwner];

        if (_currentDay <= _owner.lastUpdateDay || _owner.balance == 0) {
            return _owner.lastWeight;
        }

        uint256 _lastUpdateDayWeight = _owner.dailyWeight[_owner.lastUpdateDay];
        uint256 _missedTotalWeightAfterUpdateDay = _calcWeightWithDecayRate(_owner.balance, 0).mul(_currentDay - _owner.lastUpdateDay);
        uint256 _newWeight = _lastUpdateDayWeight.add(_missedTotalWeightAfterUpdateDay);

        return _owner.lastWeight.add(_newWeight);
    }
    
    function initTodayOwnerWeight(uint256 _ownerId) internal {
        uint256 _currentDay = getCurrentDay();

        OwnerWeight storage owner = ownerWeight[_ownerId];

        if (owner.lastUpdateDay >= _currentDay) {
            return;
        }

        for (uint256 i = owner.lastUpdateDay + 1; i <= _currentDay; i++) {
            owner.dailyWeight[i] = owner.dailyWeight[i - 1].add(DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER * owner.stakedNFTCount)
                                        .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)        // decay rate: 7.5%
                                        .div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
            
        }
    }

    function updateOwnerWeight(address _tokenOwner) public returns (bool) {
        updateWeight();
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= owner.lastUpdateDay) {
            return false;
        }

        owner.lastWeight = calcNewOwnerWeight(_tokenOwner);

        owner.lastUpdateDay = _currentDay;

        return true;
    }

    /**
     * @dev Get yesterday token weight
     */
    function _initTokenWeight(uint256 _tokenId) internal view returns (uint256) {
        uint256 _currentDay = getCurrentDay();

        TokenWeight memory _token = tokenWeight[_tokenId];

        if (_token.lastUpdateDay >= _currentDay) {
            return _token.totalWeight;
        }

        uint256 _newWeight = _token.dailyWeight[_token.lastUpdateDay];

        for (uint256 i = _token.lastUpdateDay + 1; i < _currentDay; i++) {
            _newWeight = _newWeight.add(DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER)
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)        // decay rate: 7.5%
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
        }

        return _newWeight;
    }

    /**
     * @dev Calc today token weight by yesterday weight & today reactions
     */
    function _calcTokenWeight(uint256 _tokenId) internal {
        uint256 _currentDay = getCurrentDay();
        TokenWeight memory _token = tokenWeight[_tokenId];

        if (_currentDay < _token.lastUpdateDay) {
            return _token.totalWeight;
        }

        uint256 _yesterdayWeight = _initTokenWeight(_tokenId);

        uint256 _currentDayReactionPoint = _getReactionPoints(_token.dailyTokenReaction[_currentDay]);

        if (_currentDayReactionPoint > 0) {     // 2.5%
            return _yesterdayWeight.add(_currentDayReactionPoint.mul(MULTIPLIER))
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_WITH_APPRAISAL)
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
        } else {                                // 7.5%
            return _yesterdayWeight.mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
        }
    }

    function favorite(address _appraiser, uint256 _tokenId) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");

        uint256 _currentDay = getCurrentDay();

        AppraiserWeight storage appraiser = appraiserWeight[_appraiser];

        require(
            appraiser.dailyTokenReaction[_currentDay][_tokenId].favoriteCount == 0,
            "WeightingContract.favorite: Members can fevorite an NFT once per day."
        );

        // Appraiser
        appraiser.dailyTokenReaction[_currentDay][_tokenId].favoriteCount = 1;

        // Token
        TokenWeight storage token = tokenWeight[_tokenId];
        token.dailyTokenReaction[_currentDay].favoriteCount = token.dailyTokenReaction[_currentDay].favoriteCount.add(1);

        token.dailyWeight[_currentDay] = _calcTokenWeight(_tokenId);
        token.lastUpdateDay = _currentDay;

        // Owner
        OwnerWeight storage owner = ownerWeight[tokenOwner[_tokenId]];
        owner.dailyWeight[_currentDay] = owner.dailyWeight[_currentDay].sub(token.lastWeight)
                                                                    .add(token.dailyWeight[_currentDay]);

        totalTokenWeight = totalTokenWeight.sub(owner.lastWeight)
                                        .add(owner.dailyWeight[_currentDay]);

        token.lastWeight = token.dailyWeight[_currentDay];
        owner.lastWeight = owner.dailyWeight[_currentDay];
        owner.lastUpdateDay = _currentDay;
    }

    function stakeERC20(address _appraiser, uint256 _amount, uint256 _tokenId) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");

        TokenWeight storage token = tokenWeight[_tokenId];

    }

    function unstakeERC20(address _appraiser, uint256 _amount, uint256 _tokenId) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");

    }

    function appraise(address _appraiser, uint256 _limitAppraisalCount, uint256 _tokenId, string memory _reaction) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");

        uint256 _currentDay = getCurrentDay();
        AppraiserWeight storage appraiser = appraiserWeight[_appraiser];
        
        require(
            appraiser.dailyReactionCount[_currentDay] < _limitAppraisalCount,
            "WeightingContract.appraise: Limit appraisal count per day"
        );

        // AppraiserWeight
        appraiser.dailyReactionCount[_currentDay] = appraiser.dailyReactionCount[_currentDay] + 1;
        appraiser.totalReactionCount = appraiser.totalReactionCount + 1;

        // TokenWeight
        TokenWeight storage token = tokenWeight[_tokenId]; // NOTE VICTOR MADE THIS CHANGE
        token.dailyAppraisalScore[_currentDay] = token.dailyAppraisalScore[_currentDay].add(reactionPoint[_reaction]);
        uint256 _newWeight = _calcWeightWithDecayRate(token.primarySalePrice, token.dailyAppraisalScore[_currentDay]);
        token.totalWeight = token.totalWeight.sub(token.dailyWeight[_currentDay])
                                            .add(_newWeight);
        
    }

    function stake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");
        require(tokenOwner[_tokenId] == address(0) || tokenOwner[_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

        // TokenWeight
        TokenWeight storage token = tokenWeight[_tokenId];
        token.lastWeight = MULTIPLIER;
        token.lastUpdateDay = _currentDay;

        tokenOwner[_tokenId] = _tokenOwner;

        // OwnerWeight
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        if (owner.stakedNFTCount == 0) {
            owner.startDay = _currentDay;
        }

        updateOwnerWeight(_tokenOwner);

        owner.stakedNFTCount = owner.stakedNFTCount.add(1);
        owner.lastWeight = owner.lastWeight.add(token.lastWeight);
        owner.lastUpdateDay = _currentDay;

        // GuildWeight
        updateWeight();

        owner.balance = owner.balance.add(_primarySalePrice);
        stakedNFTCount = stakedNFTCount.add(1);
        totalTokenWeight = totalTokenWeight.add(token.lastWeight);
        totalGuildWeight = totalGuildWeight.add(token.lastWeight);
        lastUpdateDay = _currentDay;
    }

    function unstake(uint256 _tokenId, address _tokenOwner) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");
        require(tokenOwner[_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

        TokenWeight storage token = tokenWeight[_tokenId];
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        updateOwnerWeight(_tokenOwner);

        owner.stakedNFTCount = owner.stakedNFTCount.sub(1);


        if (owner.stakedNFTCount == 0) {
            delete ownerWeight[_tokenOwner];
        }

        stakedNFTCount = stakedNFTCount.sub(1);

        // need appraiser rewards logic here if there is staked erc20 tokens
        // need appraiser rewards logic here if there is staked erc20 tokens

        if (stakedNFTCount == 0) {
            totalTokenWeight = 0;
        }

        owner.balance = owner.balance.sub(token.primarySalePrice);

        delete tokenWeight[_tokenId];
        delete tokenOwner[_tokenId];
    }

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

    function diffDays(uint fromTimestamp, uint toTimestamp) internal pure returns (uint _days) {
        require(fromTimestamp <= toTimestamp);
        _days = (toTimestamp - fromTimestamp) / SECONDS_PER_DAY;
    }

    function getCurrentDay() public view returns(uint256) {
        return diffDays(startTime, _getNow());
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }

    // NOTE VICTOR ADDED THIS
    function _calcWeightWithDecayRate(uint256 _primarySalePrice, uint256 _appraisalScore, uint256 _decayRate) internal returns (uint256) {
        return _primarySalePrice.mul(_appraisalScore)
        .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - _decayRate)
        .div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
    }
}
