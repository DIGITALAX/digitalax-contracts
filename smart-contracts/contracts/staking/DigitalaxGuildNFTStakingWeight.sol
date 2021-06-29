pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IDigitalaxGuildNFTStakingWeight.sol";

/**
 * @title Digitalax Guild NFT Staking Weight
 * @dev Calculates the weight for staking on the PODE system
 * @author DIGITALAX CORE TEAM
 * @author 
 */

contract DigitalaxGuildNFTStakingWeight {
    using SafeMath for uint256;

    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 constant DAILY_NFT_WEIGHT_DEFAULT = 10; // 

    uint256 constant DEFAULT_POINT_WITHOUT_DECAY_RATE = 1000;
    uint256 constant DECAY_POINT_DEFAULT = 75;
    uint256 constant DECAY_POINT_WITH_APPRAISAL = 25;

    mapping (string => uint256) reactionPoint;

    struct TokenWeight {
        uint256 primarySalePrice;

        uint256 totalWeight;
        mapping (uint256 => uint256) dailyWeight;
        mapping (uint256 => uint256) dailyAppraisalScore;
        mapping (string => uint256) appraisalCount;
    }

    struct OwnerWeight {
        uint256 totalWeight;
        mapping (uint256 => uint256) dailyWeight;
        uint256 currentStakedNFTCount;
        uint256 balance;
        mapping (uint256 => uint256) dailyTotalPriceOfCalculatedTokens;
        uint256 lastUpdateDay;
    }

    struct AppraiserReaction {
        uint256 totalReactionCount;
        mapping (uint256 => uint256) dailyReactionCount;
        uint256 lastUpdateDay;
    }

    uint256 public startTime;
    uint256 public currentStakedNFTCount;
    mapping (uint256 => uint256) public dailyTotalWeight;

    /// @notice Sum of the dailyTotalWeight so far
    uint256 public totalGuildWeight;

    mapping (uint256 => address) public tokenOwner;
    mapping (uint256 => TokenWeight) public tokenWeight;
    mapping (address => OwnerWeight) public ownerWeight;

    mapping (address => AppraiserReaction) public appraiserReaction;

    /// @notice mapping (days => mapping (tokenId => isCalculated))
    /// @dev these values are used to calculate the total weight of untouched tokens
    mapping (uint256 => mapping (uint256 => bool)) public dailyTokenCalculated;
    mapping (uint256 => uint256) public dailyTotalSalePriceOfCalculatedTokens;
    uint256 public totalSalePriceOfCurrentStakedTokens;

    uint256 public lastUpdateDay;
    uint256 public lastUpdateTime;

    event TokenAppraised(uint256 _tokenId, uint256 dailyReactionCount, uint256 totalReactionCount, uint256 _newWeight);

    constructor() public {
        reactionPoint["Love"] = 30;
        reactionPoint["Like"] = 10;
        reactionPoint["Fire"] = 25;
        reactionPoint["Sad"] = 5;
        reactionPoint["Angry"] = 15;
        reactionPoint["Novel"] = 2;
    }

    function getTotalWeight() external view returns (uint256) {
        return totalGuildWeight;
    }

    function getOwnerWeight(address _tokenOwner) external view returns (uint256) {
        return ownerWeight[_tokenOwner].totalWeight;
    }

    function getTokenPrice(uint256 _tokenId) external view returns (uint256) {
        return tokenWeight[_tokenId].primarySalePrice;
    }

    function _calcWeightWithDecayRate(uint256 _primarySalePrice, uint256 _appraisalScore, uint256 _decayRate) internal returns (uint256) {
        return _primarySalePrice.mul(_appraisalScore)
                            .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - _decayRate)
                            .div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
    }

    function updateWeight() public returns (bool) {
        uint256 _currentDay = getCurrentDay();

        if (_getNow() <= lastUpdateTime) {
            return false;
        }

        if (_currentDay <= lastUpdateDay) {
            return false;
        }

        for (uint256 i = lastUpdateDay; i < _currentDay; i++) {
            if (dailyTotalSalePriceOfCalculatedTokens[_currentDay] < totalSalePriceOfCurrentStakedTokens) {
                uint256 _missedTotalPrice = totalSalePriceOfCurrentStakedTokens - dailyTotalSalePriceOfCalculatedTokens[_currentDay];
                uint256 _missedTotalWeight = _calcWeightWithDecayRate(_missedTotalPrice, DAILY_NFT_WEIGHT_DEFAULT, DECAY_POINT_DEFAULT); // 7.5%

                dailyTotalSalePriceOfCalculatedTokens[_currentDay] = totalSalePriceOfCurrentStakedTokens;
                dailyTotalWeight[_currentDay] = dailyTotalWeight[_currentDay].add(_missedTotalWeight);
                totalGuildWeight = totalGuildWeight.add(_missedTotalWeight);
            }
        }

        lastUpdateTime = _getNow();
        lastUpdateDay = _currentDay;

        return true;
    }

    function updateOwnerWeight(address _tokenOwner) external returns (bool) {
        updateWeight();

        uint256 _currentDay = getCurrentDay();

        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        if (_currentDay <= owner.lastUpdateDay) {
            return false;
        }

        for (uint256 i = owner.lastUpdateDay; i < _currentDay; i++) {
            if (owner.dailyTotalPriceOfCalculatedTokens[_currentDay] < owner.balance) {
                uint256 _missedTotalPrice = owner.balance - owner.dailyTotalPriceOfCalculatedTokens[_currentDay];
                uint256 _missedTotalWeight = _calcWeightWithDecayRate(_missedTotalPrice, DAILY_NFT_WEIGHT_DEFAULT, DECAY_POINT_DEFAULT); // 7.5%

                owner.dailyTotalPriceOfCalculatedTokens[_currentDay] = owner.balance;
                owner.dailyWeight[_currentDay] = owner.dailyWeight[_currentDay].add(_missedTotalWeight);
            }
        }

        owner.lastUpdateDay = _currentDay;

        return true;
    }

    function appraise(uint256 _tokenId, address _appraiser, uint256 _limitAppraisalCount, string memory _appraiseAction) external {
        uint256 _currentDay = getCurrentDay();
        AppraiserReaction storage appraiser = appraiserReaction[_appraiser];

        require(appraiser.lastUpdateDay <= _currentDay);

        require(
            appraiser.dailyReactionCount[_currentDay] < _limitAppraisalCount, 
            "DigitalaxGuildNFTStakingWeight.appraise: Limit appraisal count per day"
        );

        // AppraiserReaction
        appraiser.dailyReactionCount[_currentDay] = appraiser.dailyReactionCount[_currentDay] + 1;
        appraiser.totalReactionCount = appraiser.totalReactionCount.add(1);
        appraiser.lastUpdateDay = _currentDay;

        // TokenWeight
        TokenWeight storage token = tokenWeight[_tokenId];

        if (token.dailyAppraisalScore[_currentDay] == 0) {
            token.dailyAppraisalScore[_currentDay] = DAILY_NFT_WEIGHT_DEFAULT;
        }

        token.dailyAppraisalScore[_currentDay] = token.dailyAppraisalScore[_currentDay].add(reactionPoint[_appraiseAction]);

        uint256 _newWeight = _calcWeightWithDecayRate(token.primarySalePrice, token.dailyAppraisalScore[_currentDay], DECAY_POINT_WITH_APPRAISAL); // 2.5%
        token.totalWeight = token.totalWeight.sub(token.dailyWeight[_currentDay])
                                        .add(_newWeight);
        token.appraisalCount[_appraiseAction] = token.appraisalCount[_appraiseAction].add(1);

        // OwnerWeight
        OwnerWeight storage owner = ownerWeight[tokenOwner[_tokenId]];
        owner.totalWeight = owner.totalWeight.sub(token.dailyWeight[_currentDay])
                                        .add(_newWeight);
        owner.dailyWeight[_currentDay] = owner.dailyWeight[_currentDay].sub(token.dailyWeight[_currentDay])
                                                                    .add(_newWeight);

        totalGuildWeight = totalGuildWeight.sub(token.dailyWeight[_currentDay])
                            .add(_newWeight);
        dailyTotalWeight[_currentDay] = dailyTotalWeight[_currentDay].sub(token.dailyWeight[_currentDay])
                                                                .add(_newWeight);

        token.dailyWeight[_currentDay] = _newWeight;

        if (dailyTokenCalculated[_currentDay][_tokenId] == false) {
            dailyTokenCalculated[_currentDay][_tokenId] = true;
            owner.dailyTotalPriceOfCalculatedTokens[_currentDay] = owner.dailyTotalPriceOfCalculatedTokens[_currentDay].add(token.primarySalePrice);
            dailyTotalSalePriceOfCalculatedTokens[_currentDay] = dailyTotalSalePriceOfCalculatedTokens[_currentDay].add(token.primarySalePrice);
        }

        emit TokenAppraised(_tokenId, appraiser.dailyReactionCount[_currentDay], appraiser.totalReactionCount, _newWeight);
    }

    function stake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external {
        if (totalGuildWeight == 0 && startTime == 0) {
            startTime = _getNow();
        }

        uint256 _currentDay = getCurrentDay();

        // TokenWeight
        TokenWeight storage token = tokenWeight[_tokenId];
        token.primarySalePrice = _primarySalePrice;
        token.dailyAppraisalScore[_currentDay] = DAILY_NFT_WEIGHT_DEFAULT;

        uint256 _newWeight = _calcWeightWithDecayRate(_primarySalePrice, DAILY_NFT_WEIGHT_DEFAULT, DECAY_POINT_DEFAULT);
        token.dailyWeight[_currentDay] = _newWeight;
        token.totalWeight = _newWeight;

        tokenOwner[_tokenId] = _tokenOwner;

        // OwnerWeight
        OwnerWeight storage owner = ownerWeight[_tokenOwner];
        owner.dailyWeight[_currentDay] = owner.dailyWeight[_currentDay].add(_newWeight);
        owner.totalWeight = owner.totalWeight.add(_newWeight);
        owner.currentStakedNFTCount = owner.currentStakedNFTCount.add(1);
        owner.dailyTotalPriceOfCalculatedTokens[_currentDay] = owner.dailyTotalPriceOfCalculatedTokens[_currentDay].add(token.primarySalePrice);

        totalGuildWeight = totalGuildWeight.sub(token.dailyWeight[_currentDay])
                            .add(_newWeight);
        dailyTotalWeight[_currentDay] = dailyTotalWeight[_currentDay].sub(token.dailyWeight[_currentDay])
                                                                .add(_newWeight);

        dailyTokenCalculated[_currentDay][_tokenId] = true;

        owner.balance = owner.balance.add(_primarySalePrice);
        totalSalePriceOfCurrentStakedTokens = totalSalePriceOfCurrentStakedTokens.add(_primarySalePrice);

        dailyTotalSalePriceOfCalculatedTokens[_currentDay] = dailyTotalSalePriceOfCalculatedTokens[_currentDay].add(token.primarySalePrice);

        currentStakedNFTCount = currentStakedNFTCount.add(1);
    }

    function unstake(uint256 _tokenId, address _tokenOwner) external {
        OwnerWeight storage owner = ownerWeight[_tokenOwner];
        TokenWeight storage token = tokenWeight[_tokenId];

        owner.currentStakedNFTCount = owner.currentStakedNFTCount.sub(1);
        owner.balance = owner.balance.sub(token.primarySalePrice);

        currentStakedNFTCount = currentStakedNFTCount.sub(1);
        totalSalePriceOfCurrentStakedTokens = totalSalePriceOfCurrentStakedTokens.sub(token.primarySalePrice);

        uint256 _currentDay = getCurrentDay();

        if (dailyTokenCalculated[_currentDay][_tokenId] == true) {
            owner.dailyTotalPriceOfCalculatedTokens[_currentDay] = owner.dailyTotalPriceOfCalculatedTokens[_currentDay].sub(token.primarySalePrice);
            dailyTotalSalePriceOfCalculatedTokens[_currentDay] = dailyTotalSalePriceOfCalculatedTokens[_currentDay].sub(token.primarySalePrice);
        }

        delete tokenWeight[_tokenId];
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
}