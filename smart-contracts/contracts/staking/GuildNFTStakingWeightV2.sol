pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "../DigitalaxAccessControls.sol";
//import "./interfaces/IGuildNFTStakingWeight.sol";
//import "./interfaces/IGuildNFTStakingWeightWhitelisted.sol";

/**
 * @title Digitalax Guild NFT Staking Weight
 * @dev Calculates the weight for staking on the PODE system
 * @author DIGITALAX CORE TEAM
 * @author
 */

contract GuildNFTStakingWeightV2 is BaseRelayRecipient {
    using SafeMath for uint256;

    DigitalaxAccessControls public accessControls;

    IERC20 public guildNativeERC20Token;
    address public stakingContract;
    address public whitelistedStakingContract; // This contract will have to be responsible for whitelisted nfts and deco staked on them.

    uint256 constant MULTIPLIER = 100000;

    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 constant DAILY_NFT_WEIGHT_DEFAULT = 10; // 1

    uint256 constant DEFAULT_POINT_WITHOUT_DECAY_RATE = 1000; // 100%
    uint256 public DECAY_POINT_DEFAULT = 75; // 7.5%
    uint256 public DECAY_POINT_WITH_APPRAISAL = 25; // 2.5%

    mapping (string => uint256) reactionPoint;

    event UpdateAccessControls(
        address indexed accessControls
    );

    struct TokenReaction {
        uint256 metaverseCount;
        uint256 clapCount;
        uint256 shareCount;
        uint256 followCount;
        uint256 favoriteCount;
        mapping (string => uint256) appraisalCount;
    }

    struct TokenWeight {
        uint256 lastWeight;
        mapping (uint256 => uint256) dailyWeight;

        mapping (uint256 => TokenReaction) dailyTokenReaction;

        uint256 lastUpdateDay;
    }

    struct OwnerWeight {
        uint256 lastWeight;
        uint256 totalAppraisals;
        uint256 stakedNFTCount;
        uint256 stakedWhitelistedNFTCount;
        mapping (uint256 => uint256) dailyClapPowerLevel;
        mapping (uint256 => uint256) dailyWeight;
        mapping (uint256 => uint256) dailyAppraisedTokenCount;
        uint256 startDay;
        uint256 lastUpdateDay;
    }

    struct AppraiserWeight {
        uint256 totalReactionCount;
        mapping (uint256 => uint256) dailyReactionCount;
        mapping (uint256 => uint256) dailyWeight;
        mapping (uint256 => uint256) dailyClapCount;
        mapping (uint256 => uint256) dailyClapLimit;

        mapping (uint256 => mapping (uint256 => TokenReaction)) dailyTokenReaction;
    }

//    struct DailyReaction {
//        // reaction => appraiserCount
//        mapping (uint256 => uint256) appraisersGaveReaction;
//    }

    uint256 public startTime;

    uint256 public stakedNFTCount;
    uint256 public totalPodeTokenWeight;

    uint256 public stakedWhitelistedNFTCount;
    uint256 public totalWhitelistedNFTTokenWeight;

    uint256 public totalAppraiserWeight;
    uint256 public totalGuildWeight;

    mapping (uint256 => address) public tokenOwner;
    mapping (address => mapping(uint256 => address)) public whitelistedNFTTokenOwner;
    mapping (address => mapping(uint256 => TokenWeight)) public whitelistedNFTTokenWeight;
    mapping(uint256 => TokenWeight) public podeTokenWeight;
    mapping (address => OwnerWeight) public ownerWeight;
    mapping (address => AppraiserWeight) public appraiserWeight;
    mapping (uint256 => uint256) dailyWeight;


    uint256 public lastUpdateDay;

    bool initialised;

    event StakedMembershipToken(
        address owner,
        uint256 tokenId
    );

    event UnstakedMembershipToken(
        address owner,
        uint256 tokenId
    );

    event StakedWhitelistedNFTToken(
        address owner,
        address whitelistedNFT,
        uint256 tokenId
    );
    event UnstakedWhitelistedNFTToken(
        address owner,
        address whitelistedNFT,
        uint256 tokenId
    );

    event WhitelistedNFTAppraisal(
        address appraiser,
        uint256 timestamp,
        string reaction,
        address whitelistedNFT,
        uint256 tokenId
    );

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
    }

    function init(address _stakingContract, address _whitelistedStakingContract, IERC20 _guildNativeERC20Token, DigitalaxAccessControls _accessControls) external {
        require(!initialised, "Already initialised");

        accessControls = _accessControls;
        stakingContract = _stakingContract;
        whitelistedStakingContract = _whitelistedStakingContract;
        guildNativeERC20Token = _guildNativeERC20Token;
        initialised = true;
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
        require(address(_accessControls) != address(0), "GuildNFTStakingWeightV2.updateAccessControls: Zero Address");
        accessControls = _accessControls;
        emit UpdateAccessControls(address(_accessControls));
    }

    function updateReactionPoint(string memory _reaction, uint256 _point) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStakingWeightV2.updateReactionPoint: Sender must be admin"
        );

        reactionPoint[_reaction] = _point;
    }

    function updateStartTime(uint256 _startTime) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStakingWeightV2.updateStartTime: Sender must be admin"
        );

        startTime = _startTime;
    }

    // Note needs to be 10x higher then the percentage you are interested in.
    function updateDecayPoints(uint256 decayPointDefault, uint256 decayPointWithAppraisal) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStakingWeightV2.updateDecayPoints: Sender must be admin"
        );

        DECAY_POINT_DEFAULT = decayPointDefault;
        DECAY_POINT_WITH_APPRAISAL = decayPointWithAppraisal;
    }

    function balanceOf(address _owner) external view returns (uint256) {
        return _balanceOf(_owner);
    }

    function _balanceOf(address _owner) internal view returns (uint256) {
        return ownerWeight[_owner].stakedNFTCount;
    }

    function _balanceOfWhitelistedNFT(address _owner) internal view returns (uint256) {
        return ownerWeight[_owner].stakedWhitelistedNFTCount;
    }

    function getTotalWhitelistedNFTTokenWeight() external view returns (uint256) {
        return totalWhitelistedNFTTokenWeight;
    }

    // getTotalPodeTokenWeight
    function getTotalWeight() external view returns (uint256) {
        return totalPodeTokenWeight;
    }

    function getOwnerWeight(address _tokenOwner) external view returns (uint256) {
        return ownerWeight[_tokenOwner].lastWeight;
    }

    function getTokenPrice(uint256 _tokenId) external view returns (uint256) {
        return 1;
    }

    // TODO make these values dynamic
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

    function _getReactionPoints(address _whitelistedNFT, uint256 _tokenId, uint256 _currentDay) internal view returns (uint256) {
        TokenReaction storage _reaction = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId].dailyTokenReaction[_currentDay];

        uint256 result = 0;

        result = result.add(_reaction.metaverseCount.mul(reactionPoint["Metaverse"]));

        result = result.add(_reaction.shareCount.mul(reactionPoint["Share"]));
        result = result.add(_reaction.favoriteCount.mul(reactionPoint["Favorite"]));
        result = result.add(_reaction.followCount.mul(reactionPoint["Follow"]));

        uint256 _totalSupply = guildNativeERC20Token.totalSupply();
        uint256 erc20Balance = guildNativeERC20Token.balanceOf(_msgSender());
        uint256 _clapLimit = _getClapLimit(_totalSupply, erc20Balance);
        result = result.add(_reaction.clapCount.mul(_getPowerLevelByClapLimit(_clapLimit)));

        result = result.add(_reaction.clapCount);       // stake points = clap limit per day

        result = result.add(_reaction.appraisalCount["Love"].mul(reactionPoint["Love"]));
        result = result.add(_reaction.appraisalCount["Like"].mul(reactionPoint["Like"]));
        result = result.add(_reaction.appraisalCount["Fire"].mul(reactionPoint["Fire"]));
        result = result.add(_reaction.appraisalCount["Sad"].mul(reactionPoint["Sad"]));
        result = result.add(_reaction.appraisalCount["Angry"].mul(reactionPoint["Angry"]));
        result = result.add(_reaction.appraisalCount["Novel"].mul(reactionPoint["Novel"]));

        return result;
    }

    function calcNewTotalNFTWeight() internal view returns (uint256) {
        return 0;
    }

    function calcNewTotalAppraiserWeight() internal view returns (uint256) {
        return 0;
    }

    function calcNewWeight() public view returns (uint256) {
        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= lastUpdateDay || stakedNFTCount == 0) {
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

        if (_owner.lastUpdateDay >= _currentDay) {
            return _owner.lastWeight;
        }

        uint256 _newWeight = _owner.dailyWeight[_owner.lastUpdateDay];

        for (uint256 i = _owner.lastUpdateDay + 1; i < _currentDay; i++) {
            _newWeight = _newWeight.add(DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER * _owner.stakedNFTCount)
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)        // decay rate: 7.5%
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE);

        }

        return _newWeight;
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
    function _initTokenWeight(address _whitelistedNFT, uint256 _tokenId) internal view returns (uint256) {
        uint256 _currentDay = getCurrentDay();

        TokenWeight storage _token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];

        if (_token.lastUpdateDay >= _currentDay) {
            return _token.lastWeight;
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
    function _calcTokenWeight(address _whitelistedNFT, uint256 _tokenId) internal returns (uint256) {
        uint256 _currentDay = getCurrentDay();
        TokenWeight memory _token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];

        if (_currentDay < _token.lastUpdateDay) {
            return _token.lastWeight;
        }

        uint256 _yesterdayWeight = _initTokenWeight(_whitelistedNFT, _tokenId);

        uint256 _currentDayReactionPoint = _getReactionPoints(_whitelistedNFT, _tokenId, _currentDay);

        if (_currentDayReactionPoint > 0) {     // 2.5%
            return _yesterdayWeight.add(_currentDayReactionPoint.mul(MULTIPLIER))
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_WITH_APPRAISAL)
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
        } else {                                // 7.5%
            return _yesterdayWeight.mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
        }
    }

    function _updateTodayWeightByReaction(address _appraiser, address _whitelistedNFT, uint256 _tokenId, address _tokenOwner) internal {
        uint256 _currentDay = getCurrentDay();

        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];

        token.dailyWeight[_currentDay] = _calcTokenWeight(_whitelistedNFT, _tokenId);
        token.lastUpdateDay = _currentDay;

        // Owner
        OwnerWeight storage owner = ownerWeight[_tokenOwner];
        owner.dailyWeight[_currentDay] = owner.dailyWeight[_currentDay].sub(token.lastWeight)
                                                                    .add(token.dailyWeight[_currentDay]);

        totalWhitelistedNFTTokenWeight = totalWhitelistedNFTTokenWeight.sub(owner.lastWeight)
                                        .add(owner.dailyWeight[_currentDay]);

        token.lastWeight = token.dailyWeight[_currentDay];
        owner.lastWeight = owner.dailyWeight[_currentDay];
        owner.lastUpdateDay = _currentDay;
        lastUpdateDay = _currentDay;
    }

    function favorite(address _appraiser, address _whitelistedNFT, uint256 _tokenId) external {
        require(canAppraise(_msgSender()), "GuildNGTStakingWeightV2.favorite: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();

        AppraiserWeight storage appraiser = appraiserWeight[_appraiser];

        require(
            appraiser.dailyTokenReaction[_currentDay][_tokenId].favoriteCount == 0,
            "WeightingContract.favorite: Members can fevorite an NFT once per day."
        );

        // Appraiser
        appraiser.dailyTokenReaction[_currentDay][_tokenId].favoriteCount = 1;

        // Token
        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        token.dailyTokenReaction[_currentDay].favoriteCount = token.dailyTokenReaction[_currentDay].favoriteCount.add(1);

        _updateTodayWeightByReaction(_appraiser, _whitelistedNFT, _tokenId, whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId]);
    }

    function follow(address _appraiser, address _whitelistedNFT, uint256 _tokenId) external {
        require(canAppraise(_msgSender()), "GuildNGTStakingWeightV2.follow: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();

        AppraiserWeight storage appraiser = appraiserWeight[_appraiser];

        require(
            appraiser.dailyTokenReaction[_currentDay][_tokenId].followCount == 0,
            "WeightingContract.follow: Members can follow an NFT once per day."
        );

        // Appraiser
        appraiser.dailyTokenReaction[_currentDay][_tokenId].followCount = 1;

        // Token
        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        token.dailyTokenReaction[_currentDay].followCount = token.dailyTokenReaction[_currentDay].followCount.add(1);

        _updateTodayWeightByReaction(_appraiser, _whitelistedNFT, _tokenId, whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId]);
    }

    function share(address _appraiser, address _whitelistedNFT, uint256 _tokenId) external {
        require(canAppraise(_msgSender()), "GuildNGTStakingWeightV2.share: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();

        AppraiserWeight storage appraiser = appraiserWeight[_appraiser];

        require(
            appraiser.dailyTokenReaction[_currentDay][_tokenId].shareCount == 0,
            "WeightingContract.share: Members can share an NFT once per day."
        );

        // Appraiser
        appraiser.dailyTokenReaction[_currentDay][_tokenId].shareCount = 1;

        // Token
        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        token.dailyTokenReaction[_currentDay].shareCount = token.dailyTokenReaction[_currentDay].shareCount.add(1);

        _updateTodayWeightByReaction(_appraiser, _whitelistedNFT, _tokenId, whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId]);
    }

    function metaverse(address _appraiser, address _whitelistedNFT, uint256 _tokenId) external {
        require(canAppraise(_msgSender()), "GuildNGTStakingWeightV2.metaverse: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();

        AppraiserWeight storage appraiser = appraiserWeight[_appraiser];

        require(
            appraiser.dailyTokenReaction[_currentDay][_tokenId].metaverseCount == 0,
            "WeightingContract.metaverse: Members can do this an NFT once per day."
        );

        // Appraiser
        appraiser.dailyTokenReaction[_currentDay][_tokenId].metaverseCount = 1;

        // Token
        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        token.dailyTokenReaction[_currentDay].metaverseCount = token.dailyTokenReaction[_currentDay].metaverseCount.add(1);

        _updateTodayWeightByReaction(_appraiser, _whitelistedNFT, _tokenId, whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId]);
    }


    function appraise(address _appraiser, uint256 _limitAppraisalCount, address _whitelistedNFT, uint256 _tokenId, string memory _reaction) external {
        require(canAppraise(_msgSender()), "GuildNGTStakingWeightV2.appraise: Sender must stake PODE");


        uint256 _currentDay = getCurrentDay();
        AppraiserWeight storage appraiser = appraiserWeight[_appraiser];

        require(
            appraiser.dailyReactionCount[_currentDay] < _limitAppraisalCount,
            "WeightingContract.appraise: Limit appraisal count per day"
        );

        // AppraiserWeight
        appraiser.dailyReactionCount[_currentDay] = appraiser.dailyReactionCount[_currentDay] + 1;
        appraiser.totalReactionCount = appraiser.totalReactionCount + 1;

        // Token
        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        token.dailyTokenReaction[_currentDay].appraisalCount[_reaction] = token.dailyTokenReaction[_currentDay].appraisalCount[_reaction].add(1);

        _updateTodayWeightByReaction(_appraiser, _whitelistedNFT, _tokenId, whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId]);
    }

    // TODO unit test this very thoroughly
     function migrateCurrentStake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice, uint256 stakeDate, uint256 stakeWeight) external {
         require(
             accessControls.hasAdminRole(_msgSender()),
             "GuildNFTStakingWeightV2.migrateCurrentStake: Sender must be admin"
         );
         require(tokenOwner[_tokenId] == address(0) || tokenOwner[_tokenId] == _tokenOwner);

         uint256 _currentDay = getCurrentDay();

         // TokenWeight
         TokenWeight storage token = podeTokenWeight[_tokenId];
         token.lastWeight = stakeWeight; //  TODO figure this out, because it seems tokens need to carry over alue
         token.lastUpdateDay = stakeDate;

         tokenOwner[_tokenId] = _tokenOwner;

         // OwnerWeight
         OwnerWeight storage owner = ownerWeight[_tokenOwner];

         if (owner.stakedNFTCount == 0) {
             owner.startDay = stakeDate;
         }

         updateOwnerWeight(_tokenOwner);

         owner.stakedNFTCount = owner.stakedNFTCount.add(1);
         owner.lastWeight = owner.lastWeight.add(token.lastWeight);
         owner.lastUpdateDay = _currentDay;

         // GuildWeight
         updateWeight();

         stakedNFTCount = stakedNFTCount.add(1);
         totalPodeTokenWeight = totalPodeTokenWeight.add(token.lastWeight);
         totalGuildWeight = totalGuildWeight.add(token.lastWeight);
         lastUpdateDay = _currentDay;
         emit StakedMembershipToken(_tokenOwner, _tokenId);
    }

    function stake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");
        require(tokenOwner[_tokenId] == address(0) || tokenOwner[_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

        // TokenWeight
        TokenWeight storage token = podeTokenWeight[_tokenId];
        token.lastWeight = MULTIPLIER; //  TODO figure this out, because it seems tokens need to carry over alue
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

        stakedNFTCount = stakedNFTCount.add(1);
        totalPodeTokenWeight = totalPodeTokenWeight.add(token.lastWeight);
        totalGuildWeight = totalGuildWeight.add(token.lastWeight);
        lastUpdateDay = _currentDay;
        emit StakedMembershipToken(_tokenOwner, _tokenId);
    }

    function unstake(uint256 _tokenId, address _tokenOwner) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");
        require(tokenOwner[_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

       // TokenWeight storage token = tokenWeight[_tokenId];
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
            totalPodeTokenWeight = 0;
        }

        delete podeTokenWeight[_tokenId]; // TODO look at this dont think its right action
        delete tokenOwner[_tokenId];

        emit UnstakedMembershipToken(_tokenOwner, _tokenId);
    }

    function stakeWhitelistedNFT(address _whitelistedNFT, uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external {
        require(_msgSender() == whitelistedStakingContract, "Sender must be staking contract");
        require(whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId] == address(0) || whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

        // TokenWeight
        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        token.lastWeight = MULTIPLIER;
        token.lastUpdateDay = _currentDay;

        whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId] = _tokenOwner;

        // OwnerWeight
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        if (owner.stakedWhitelistedNFTCount == 0) {
            owner.startDay = _currentDay;
        }

        updateOwnerWeight(_tokenOwner);

        owner.stakedWhitelistedNFTCount = owner.stakedWhitelistedNFTCount.add(1);
        owner.lastWeight = owner.lastWeight.add(token.lastWeight);
        owner.lastUpdateDay = _currentDay;

        // GuildWeight
        updateWeight();

        stakedWhitelistedNFTCount = stakedWhitelistedNFTCount.add(1);
        totalWhitelistedNFTTokenWeight = totalWhitelistedNFTTokenWeight.add(token.lastWeight);
        totalGuildWeight = totalGuildWeight.add(token.lastWeight);
        lastUpdateDay = _currentDay;

        emit StakedWhitelistedNFTToken(_tokenOwner, _whitelistedNFT, _tokenId);
    }

    function unstakeWhitelistedNFT(address _whitelistedNFT,uint256 _tokenId, address _tokenOwner) external {
        require(_msgSender() == whitelistedStakingContract, "Sender must be staking contract");
        require(whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        updateOwnerWeight(_tokenOwner);

        owner.stakedWhitelistedNFTCount = owner.stakedWhitelistedNFTCount.sub(1);

        if (owner.stakedWhitelistedNFTCount == 0) {
            delete ownerWeight[_tokenOwner];
        }

        stakedWhitelistedNFTCount = stakedWhitelistedNFTCount.sub(1);

        // need appraiser rewards logic here if there is staked erc20 tokens
        // need appraiser rewards logic here if there is staked erc20 tokens

        if (stakedWhitelistedNFTCount == 0) {
            totalWhitelistedNFTTokenWeight = 0;
        }

        delete whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        delete whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId];

        emit UnstakedWhitelistedNFTToken(_tokenOwner, _whitelistedNFT, _tokenId);
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

    function canAppraise(address _owner) public returns (bool){
        return _balanceOf(_owner) > 0;
    }
}
