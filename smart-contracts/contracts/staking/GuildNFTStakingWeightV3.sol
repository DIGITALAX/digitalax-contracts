pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../DigitalaxAccessControls.sol";

import "./interfaces/IGuildNFTStakingWeightStorage.sol";
/**
 * @title Digitalax Guild NFT Staking Weight
 * @dev Calculates the weight for staking on the PODE system
 * @author DIGITALAX CORE TEAM
 * @author
 */

contract GuildNFTStakingWeightV3 {
    using SafeMath for uint256;

    bool initialised;
    // Important contract addresses we need to set
    DigitalaxAccessControls public accessControls;
    IERC20 public guildNativeERC20Token;
    IGuildNFTStakingWeightStorage public store;
    address public stakingContract; // Pode Membership NFTs Staking
    address public whitelistedStakingContract; // Whitelisted NFTs Staking

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
        uint256 lastGuildMemberWeight;

        uint256 totalWhitelistedNFTAppraisals;

        uint256 stakedNFTCount;
        uint256 stakedWhitelistedNFTCount;

        mapping (uint256 => uint256) dailyWeight; // whitelisted nfts
        mapping (uint256 => uint256) dailyGuildMemberWeight; // guild member weight

        uint256 startDay;
        uint256 lastUpdateDay;
        uint256 lastGuildMemberUpdateDay;
    }

    struct AppraiserStats {
        uint256 totalReactionCount;
        uint256 totalClapCount;
        mapping (uint256 => uint256) dailyReactionCount;
        mapping (uint256 => uint256) dailyClapCount;
        mapping (uint256 => uint256) dailyClapLimit;

        mapping (uint256 => mapping (address => mapping(uint256 => TokenReaction))) dailyTokenReaction;

        uint256 totalGuildMemberReactionCount;
        mapping (uint256 => uint256) dailyGuildMemberReactionCount;
        mapping (uint256 => mapping(address => uint256)) dailyGuildMemberAppraisalReactionCount;
        mapping (uint256 => mapping (address => TokenReaction)) dailyGuildMemberReaction;

        uint256 lastReactionDay;
        uint256 maxDecoBonus;
        uint256 maxAssetsPercentageAppraised;

        uint256 uniqueWhitelistedNFTAppraisedLastBonus;
        mapping (address => mapping(uint256 => bool)) hasAppraisedWhitelistedNFTBefore;
        uint256 uniqueWhitelistedNFTsAppraised;
    }

    // Constants
    uint256 constant MULTIPLIER = 100000;
    uint256 constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 constant DAILY_NFT_WEIGHT_DEFAULT = 10; // 1
    uint256 constant DEFAULT_POINT_WITHOUT_DECAY_RATE = 1000; // 100%

    uint256 public startTime;
    uint256 public stakedNFTCount;
    uint256 public stakedWhitelistedNFTCount;
    uint256 public totalWhitelistedNFTTokenWeight;
    uint256 public totalGuildWeight;

    uint256 public lastUpdateDay;
    uint256 public lastGuildMemberUpdateDay;

    // Mappings
    //   mapping (string => uint256) public reactionPoint;
    mapping (uint256 => address) public tokenOwner;
    mapping (address => mapping(uint256 => address)) public whitelistedNFTTokenOwner;

    // Mappings
    mapping (address => mapping(uint256 => TokenWeight)) public whitelistedNFTTokenWeight;
    mapping(uint256 => TokenWeight) public podeTokenWeight;
    mapping(address => TokenWeight) public guildMemberWeight;
    mapping (address => OwnerWeight) public ownerWeight;
    mapping (address => AppraiserStats) public appraiserStats;

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

    event WhitelistedNFTReaction(
        string reaction,
        uint256 quantity,
        address whitelistedNFT,
        uint256 tokenId
    );

    event AppraiseGuildMember(
        string reaction,
        address guildMember
    );

    function initialize(address _stakingContract, address _whitelistedStakingContract, IERC20 _guildNativeERC20Token, DigitalaxAccessControls _accessControls, IGuildNFTStakingWeightStorage _store) public  {
        require(!initialised);
        accessControls = _accessControls;
        stakingContract = _stakingContract;
        whitelistedStakingContract = _whitelistedStakingContract;
        guildNativeERC20Token = _guildNativeERC20Token;
        store = _store;
        initialised = true;
        startTime = _getNow();
    }

    function _balanceOf(address _owner) internal view returns (uint256) {
        return ownerWeight[_owner].stakedNFTCount;
    }
    function balanceOf(address _owner) external view returns (uint256) {
        return _balanceOf(_owner);
    }

    function balanceOfWhitelistedNFT(address _owner) external view returns (uint256) {
        return ownerWeight[_owner].stakedWhitelistedNFTCount;
    }

    function getTotalWhitelistedNFTTokenWeight() external view returns (uint256) {
        return calcNewTotalWhitelistedNFTWeight();
    }

    function getTotalWeight() external view returns (uint256) {
        return calcNewWeight();
    }

    function getOwnerWeight(address _tokenOwner) external view returns (uint256) {
        return calcNewOwnerWeight(_tokenOwner);
    }

    function getWhitelistedNFTOwnerWeight(address _tokenOwner) external view returns (uint256) {
        return calcNewWhitelistedNFTOwnerWeight(_tokenOwner);
    }

    //    function getOwnerLastGuildMemberWeight(address _tokenOwner) external view returns (uint256) {
    //        return ownerWeight[_tokenOwner].lastGuildMemberWeight;
    //    }
    //
    //    function getOwnerLastWhitelistedNFTWeight(address _tokenOwner) external view returns (uint256) {
    //        return ownerWeight[_tokenOwner].lastWeight;
    //    }

    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "Sender must be admin"
        );
        accessControls = _accessControls;
    }

    // Overall variables
    function setStartTime(uint256 _startTime) external returns (uint256){
        require(
            accessControls.hasAdminRole(_msgSender()),
            "Sender must be admin"
        );
        startTime = _startTime;
        return startTime;
    }

    // Overall variables
    function setTotalWeights(uint256 _totalGuildWeight, uint256 _totalWhitelistedNFTTokenWeight) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "Sender must be admin"
        );
        totalGuildWeight = _totalGuildWeight;
        totalWhitelistedNFTTokenWeight = _totalWhitelistedNFTTokenWeight;
    }


  function setStakedWhitelistedNFTCount(address _tokenOwner, uint256 _manualSet) external returns (uint256){
        require(
            accessControls.hasAdminRole(_msgSender()),
            "Sender must be admin"
        );
      OwnerWeight storage owner = ownerWeight[_tokenOwner];

      owner.stakedWhitelistedNFTCount = _manualSet;
    }

    function calcNewWeight() public view returns (uint256) {
        uint256 _currentDay = diffDays(startTime, _getNow());

        if (_currentDay <= lastGuildMemberUpdateDay || (stakedNFTCount == 0 && stakedWhitelistedNFTCount == 0)) {
            return totalGuildWeight;
        }

        uint256 _totalPeriodUpToLastUpdateDay = _currentDay.sub(lastGuildMemberUpdateDay);
        uint256 _totalPeriodUpToStartDate = diffDays(startTime, _getNow());

        return totalGuildWeight.add(DAILY_NFT_WEIGHT_DEFAULT.mul(MULTIPLIER).mul(stakedNFTCount).mul(_totalPeriodUpToLastUpdateDay));
    }

    function calcNewTotalWhitelistedNFTWeight() public view returns (uint256) {
        uint256 _currentDay = diffDays(startTime, _getNow());

        if (_currentDay <= lastUpdateDay  || (stakedNFTCount == 0 && stakedWhitelistedNFTCount == 0)) {
            return totalWhitelistedNFTTokenWeight;
        }

        uint256 _totalPeriodUpToLastUpdateDay = _currentDay.sub(lastUpdateDay);
        uint256 _totalPeriodUpToStartDate = diffDays(startTime, _getNow());

        return totalWhitelistedNFTTokenWeight.add(DAILY_NFT_WEIGHT_DEFAULT.mul(MULTIPLIER).mul(stakedWhitelistedNFTCount).mul(_totalPeriodUpToLastUpdateDay));
    }

    function updateWeight() public returns (bool) {
        uint256 _currentDay = diffDays(startTime, _getNow());

        if (_currentDay <= lastGuildMemberUpdateDay) {
            return false;
        }
        totalGuildWeight = calcNewWeight();

        lastGuildMemberUpdateDay = _currentDay;

        return true;
    }

    function updateWhitelistedNFTWeight() public returns (bool) {
        uint256 _currentDay = diffDays(startTime, _getNow());

        if (_currentDay <= lastUpdateDay ) {
            return false;
        }
        totalWhitelistedNFTTokenWeight = (calcNewTotalWhitelistedNFTWeight());

        lastUpdateDay = (_currentDay);

        return true;
    }

    function calcNewOwnerWeight(address _tokenOwner) public view returns (uint256) {
        uint256 _currentDay = diffDays(startTime, _getNow());

        OwnerWeight storage _owner = ownerWeight[_tokenOwner];

        if(_owner.stakedNFTCount == 0){
            return 0; // This is to prevent a bonus from being provided to users.
        }

        if (_owner.lastGuildMemberUpdateDay >= _currentDay) {

            return _owner.lastGuildMemberWeight;
        }

        uint256 reactionActivityBonus = 0;

        // Set up appraisers info
        AppraiserStats storage appraiser = appraiserStats[_tokenOwner];

        // Appraised nft extra
        uint256 _appraisalMilestoneBonus = store.getAppraisedBonusMappingValue(appraiser.uniqueWhitelistedNFTsAppraised);
        if( appraiser.uniqueWhitelistedNFTAppraisedLastBonus < _appraisalMilestoneBonus) {
            reactionActivityBonus = reactionActivityBonus.add((_appraisalMilestoneBonus.sub(appraiser.uniqueWhitelistedNFTAppraisedLastBonus)).mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT));
            //  appraiser.uniqueWhitelistedNFTAppraisedLastBonus = _appraisalMilestoneBonus;
        }

        // percentage of total assets consideration
        if(stakedWhitelistedNFTCount > 0) {
            uint256 percentageTotalAssets = uint256(1000000000000000000).mul(appraiser.uniqueWhitelistedNFTsAppraised).div(stakedWhitelistedNFTCount);
            if( appraiser.maxAssetsPercentageAppraised < percentageTotalAssets) {
                // appraiser.maxAssetsPercentageAppraised = percentageTotalAssets;
                reactionActivityBonus = reactionActivityBonus.add(percentageTotalAssets.mul(uint256(100)).mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT) / 1000000000000000000);
            }
        }

        // 5 Appraisal days Bonus
        uint256 daysPassedSinceLastGuildAppraisal = diffDays(_owner.lastGuildMemberUpdateDay, _currentDay);
        if(daysPassedSinceLastGuildAppraisal < 10 && appraiser.totalReactionCount > 0) {
            reactionActivityBonus = reactionActivityBonus.add(uint256(10).sub(daysPassedSinceLastGuildAppraisal).mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT));
        }

        uint256 _newWeight = _owner.dailyGuildMemberWeight[_owner.lastGuildMemberUpdateDay];

        _newWeight = _newWeight.add((reactionActivityBonus.add(DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER * _owner.stakedNFTCount))
        .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - store.getDECAY_POINT_DEFAULT() )        // decay rate: 7.5%
        .div(DEFAULT_POINT_WITHOUT_DECAY_RATE).mul(_currentDay.sub(_owner.lastGuildMemberUpdateDay)));

        return _newWeight;
    }

    function calcNewWhitelistedNFTOwnerWeight(address _tokenOwner) public view returns (uint256) {
        uint256 _currentDay = diffDays(startTime, _getNow());

        OwnerWeight storage _owner = ownerWeight[_tokenOwner];

        if (_owner.lastUpdateDay >= _currentDay) {
            return _owner.lastWeight;
        }

        uint256 _newWeight = _owner.dailyWeight[_owner.lastUpdateDay];

        _newWeight = _newWeight.add((DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER * _owner.stakedWhitelistedNFTCount)
        .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - store.getDECAY_POINT_DEFAULT() )        // decay rate: 7.5%
        .div(DEFAULT_POINT_WITHOUT_DECAY_RATE).mul(_currentDay.sub(_owner.lastUpdateDay)));

        return _newWeight;
    }

    function updateWhitelistedNFTOwnerWeight(address _tokenOwner) public returns (bool) {
        updateWhitelistedNFTWeight();
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        uint256 _currentDay = diffDays(startTime, _getNow());

        if (_currentDay <= owner.lastUpdateDay) {
            return false;
        }
        uint256 newDays = _currentDay.sub(owner.lastUpdateDay);
        uint256 prevWeight = owner.lastWeight;
        owner.lastWeight = calcNewWhitelistedNFTOwnerWeight(_tokenOwner); // total weight?

        uint256 presumedIncreaseTokenWeight = newDays.mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT).mul(owner.stakedWhitelistedNFTCount);

        if(prevWeight <= totalWhitelistedNFTTokenWeight ) {
            totalWhitelistedNFTTokenWeight = (totalWhitelistedNFTTokenWeight.sub(prevWeight));
        }

        uint256 modWeight = 0;
        if(owner.lastWeight >= presumedIncreaseTokenWeight){
            modWeight = modWeight.add(owner.lastWeight.sub(presumedIncreaseTokenWeight));
        }

        totalWhitelistedNFTTokenWeight = (totalWhitelistedNFTTokenWeight.add(modWeight)); //owner.lastGuildMemberWeight).sub(presumedIncreaseGuildWeight);

        owner.lastUpdateDay = _currentDay;

        return true;
    }
    function updateOwnerWeight(address _tokenOwner) public returns (bool) {
        updateWeight();
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        uint256 _currentDay = diffDays(startTime, _getNow());

        if (_currentDay <= owner.lastGuildMemberUpdateDay) {
            return false;
        }
        uint256 newDays = _currentDay.sub(owner.lastGuildMemberUpdateDay);
        uint256 prevGuildMemberWeight = owner.lastGuildMemberWeight;

        owner.lastGuildMemberWeight = calcNewOwnerWeight(_tokenOwner);

        // ** AFTER SETTING UP THE CALC NEW OWNER WEIGHT ABOVE, NEED TO UPDATE THE APPRAISER ACHIEVEMENT VALUES
        // Set up appraisers info
        AppraiserStats storage appraiser = appraiserStats[_tokenOwner];
        // 1 Deco extra
//        if(guildNativeERC20Token.totalSupply() > 0) {
//            uint256 _decoBonus = store.getDecoBonusMappingValue(guildNativeERC20Token.totalSupply(), guildNativeERC20Token.balanceOf(_tokenOwner));
//            if( appraiser.maxDecoBonus < _decoBonus) {
//                appraiser.maxDecoBonus = _decoBonus;
//            }
//        }
        // 2 Appraised nft extra
        uint256 _appraisalMilestoneBonus = store.getAppraisedBonusMappingValue(appraiser.uniqueWhitelistedNFTsAppraised);
        if( appraiser.uniqueWhitelistedNFTAppraisedLastBonus < _appraisalMilestoneBonus) {
            appraiser.uniqueWhitelistedNFTAppraisedLastBonus = _appraisalMilestoneBonus;
        }
        // 4 percentage of total assets consideration
        if(stakedWhitelistedNFTCount > 0) {
            uint256 percentageTotalAssets = uint256(1000000000000000000).mul(appraiser.uniqueWhitelistedNFTsAppraised).div(stakedWhitelistedNFTCount);
            if( appraiser.maxAssetsPercentageAppraised < percentageTotalAssets) {
                appraiser.maxAssetsPercentageAppraised = percentageTotalAssets;
            }
        }
        // ***

        uint256 presumedIncreaseGuildWeight = newDays.mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT).mul(owner.stakedNFTCount);


        if(prevGuildMemberWeight <= totalGuildWeight ) {
            totalGuildWeight = (totalGuildWeight.sub(prevGuildMemberWeight));
        }


        uint256 modWeight = 0;
        if(owner.lastGuildMemberWeight >= presumedIncreaseGuildWeight){
            modWeight = modWeight.add(owner.lastGuildMemberWeight.sub(presumedIncreaseGuildWeight));
        }

        totalGuildWeight = (totalGuildWeight.add(modWeight));

        owner.lastGuildMemberUpdateDay = _currentDay;

        return true;
    }


    /**
     * @dev Calc today token weight by yesterday weight & today reactions
     */
    function _calcTokenWeight(address _whitelistedNFT, uint256 _tokenId) internal returns (uint256) {
        uint256 _currentDay = diffDays(startTime, _getNow());
        TokenWeight storage _token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];

        if (_currentDay < _token.lastUpdateDay) {

            return _token.lastWeight;
        }

        // init token weight
        if (_token.lastUpdateDay >= _currentDay) {
            return _token.lastWeight;
        }

        uint256 _yesterdayWeight = _token.dailyWeight[_token.lastUpdateDay];


        _yesterdayWeight = _yesterdayWeight.add((DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER)
        .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - store.getDECAY_POINT_DEFAULT() )        // decay rate: 7.5%
        .div(DEFAULT_POINT_WITHOUT_DECAY_RATE).mul(_currentDay.sub(_token.lastUpdateDay)));


        // ** Get Reaction points
        TokenReaction storage _reaction = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId].dailyTokenReaction[_currentDay];

        uint256 _currentDayReactionPoint = 0;

        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.metaverseCount.mul(store.getReactionPoint("Metaverse")));

        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.shareCount.mul(store.getReactionPoint("Share")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.favoriteCount.mul(store.getReactionPoint("Favorite")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.followCount.mul(store.getReactionPoint("Follow")));

        uint256 _totalSupply = guildNativeERC20Token.totalSupply();
        uint256 erc20Balance = guildNativeERC20Token.balanceOf(_msgSender());

        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.clapCount);       // stake points = clap limit per day

        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Love"].mul(store.getReactionPoint("Love")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Like"].mul(store.getReactionPoint("Like")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Fire"].mul(store.getReactionPoint("Fire")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Sad"].mul(store.getReactionPoint("Sad")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Angry"].mul(store.getReactionPoint("Angry")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Novel"].mul(store.getReactionPoint("Novel")));

        _currentDayReactionPoint = _currentDayReactionPoint.mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT);

        if (_currentDayReactionPoint > 0) {     // 2.5%
            return _yesterdayWeight.add((_currentDayReactionPoint.add((MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT)))
            .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - store.getDECAY_POINT_WITH_APPRAISAL() )
                .div(DEFAULT_POINT_WITHOUT_DECAY_RATE));
        } else {                                // 7.5%
            return _yesterdayWeight; //.mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - store.getDECAY_POINT_DEFAULT() )
            //.div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
        }
    }

    /**
     * @dev Calc today token weight by yesterday weight & today reactions
     */
    function _calcGuildMemberWeight(address _guildMember) internal returns (uint256) {
        uint256 _currentDay = diffDays(startTime, _getNow());
        TokenWeight storage _guildMemberWeight = guildMemberWeight[_guildMember];

        if (_currentDay < _guildMemberWeight.lastUpdateDay) {
            return _guildMemberWeight.lastWeight;
        }

        // Get guild member reaction points
        TokenReaction storage _reaction = guildMemberWeight[_guildMember].dailyTokenReaction[_currentDay];

        uint256 _currentDayReactionPoint = 0;

        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Love"].mul(store.getReactionPoint("Love")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Like"].mul(store.getReactionPoint("Like")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Fire"].mul(store.getReactionPoint("Fire")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Sad"].mul(store.getReactionPoint("Sad")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Angry"].mul(store.getReactionPoint("Angry")));
        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Novel"].mul(store.getReactionPoint("Novel")));

        _currentDayReactionPoint = _currentDayReactionPoint.add(_reaction.appraisalCount["Self"].mul(store.getReactionPoint("Self")));

        _currentDayReactionPoint = _currentDayReactionPoint.mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT);

        // update current day reaction points with the other factors

        // init guild member weight *******

        if (_guildMemberWeight.lastUpdateDay >= _currentDay) {
            return _guildMemberWeight.lastWeight;
        }

        uint256 _newWeight = _guildMemberWeight.dailyWeight[_guildMemberWeight.lastUpdateDay];

        _newWeight = _newWeight.add((DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER)
        .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - store.getDECAY_POINT_DEFAULT() )        // decay rate: 7.5%
        .div(DEFAULT_POINT_WITHOUT_DECAY_RATE).mul(_currentDay.sub(_guildMemberWeight.lastUpdateDay)));

        if (_currentDayReactionPoint > 0) {     // 2.5%
            return _newWeight.add((_currentDayReactionPoint).add((MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT))
            .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - store.getDECAY_POINT_WITH_APPRAISAL() )
                .div(DEFAULT_POINT_WITHOUT_DECAY_RATE));
        } else {                                // 7.5%
            return _newWeight; //.mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - store.getDECAY_POINT_DEFAULT() )
            //.div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
        }
    }

    function _updateTodayWeightByReaction(address _whitelistedNFT, uint256 _tokenId, address _tokenOwner) internal {
        uint256 _currentDay = diffDays(startTime, _getNow());

        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];

        token.dailyWeight[_currentDay] = _calcTokenWeight(_whitelistedNFT, _tokenId);

        token.lastUpdateDay = _currentDay;

        // Owner
        OwnerWeight storage owner = ownerWeight[_tokenOwner];
        // This means that they provided a reaction
        owner.totalWhitelistedNFTAppraisals = owner.totalWhitelistedNFTAppraisals.add(1);
        owner.dailyWeight[_currentDay] = owner.dailyWeight[_currentDay]
        .add(token.dailyWeight[_currentDay]).sub(token.lastWeight);

        totalWhitelistedNFTTokenWeight = (totalWhitelistedNFTTokenWeight.sub(owner.lastWeight)
        .add(owner.dailyWeight[_currentDay]));

        token.lastWeight = token.dailyWeight[_currentDay];
        owner.lastWeight = owner.dailyWeight[_currentDay];
        owner.lastUpdateDay = _currentDay;


        AppraiserStats storage appraiser = appraiserStats[_msgSender()];
        if(!appraiser.hasAppraisedWhitelistedNFTBefore[_whitelistedNFT][_tokenId]){
            appraiser.hasAppraisedWhitelistedNFTBefore[_whitelistedNFT][_tokenId] = true;
            appraiser.uniqueWhitelistedNFTsAppraised = appraiser.uniqueWhitelistedNFTsAppraised.add(1);
        }

        lastUpdateDay = (_currentDay);
    }

    function _updateTodayGuildMemberWeightByReaction(address _guildMember) internal {
        uint256 _currentDay = diffDays(startTime, _getNow());

        TokenWeight storage _guildMemberWeight = guildMemberWeight[_guildMember];

        _guildMemberWeight.dailyWeight[_currentDay] = _calcGuildMemberWeight(_guildMember);
        _guildMemberWeight.lastUpdateDay = _currentDay;

        // Owner
        OwnerWeight storage owner = ownerWeight[_guildMember];

        owner.dailyGuildMemberWeight[_currentDay] = _guildMemberWeight.dailyWeight[_currentDay];

        totalGuildWeight = (totalGuildWeight.sub(owner.lastGuildMemberWeight)
        .add(owner.dailyGuildMemberWeight[_currentDay]));

        _guildMemberWeight.lastWeight = _guildMemberWeight.dailyWeight[_currentDay];
        owner.lastGuildMemberWeight = owner.dailyGuildMemberWeight[_currentDay];
        owner.lastGuildMemberUpdateDay = _currentDay;

        lastGuildMemberUpdateDay = (_currentDay);
    }

    // Fixed reaction - reactWhitelistedNFT represents favorite, follow, share, and metaverse.
    function reactWhitelistedNFT(address[] memory _whitelistedNFTs, uint256[] memory _tokenIds, string[] memory _reactions) external {
        require(ownerWeight[_msgSender()].stakedNFTCount > 0, "Sender must stake PODE");
        require(_whitelistedNFTs.length == _tokenIds.length, "Arrays must be equal in length");
        require(_whitelistedNFTs.length == _reactions.length, "Arrays must be equal in length");

        uint256 _currentDay = diffDays(startTime, _getNow());

        AppraiserStats storage appraiser = appraiserStats[_msgSender()];

        for (uint256 i = 0; i < _whitelistedNFTs.length; i++) {
            require(whitelistedNFTTokenOwner[_whitelistedNFTs[i]][ _tokenIds[i]] != _msgSender(), "Cannot React to Own token");

            TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFTs[i]][_tokenIds[i]];
            if (keccak256(bytes(_reactions[i])) == keccak256(bytes("Favorite"))) {
                require(appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].favoriteCount == 0,
                    "Members can favorite an NFT once per day.");
                appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].favoriteCount = 1;
                token.dailyTokenReaction[_currentDay].favoriteCount = token.dailyTokenReaction[_currentDay].favoriteCount.add(1);

            } else if (keccak256(bytes(_reactions[i])) == keccak256(bytes("Follow"))) {
                require(appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].followCount == 0,
                    "Members can follow an NFT once per day.");
                appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].followCount = 1;
                token.dailyTokenReaction[_currentDay].followCount = token.dailyTokenReaction[_currentDay].followCount.add(1);

            } else if (keccak256(bytes(_reactions[i])) == keccak256(bytes("Share"))) {
                require(appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].shareCount == 0,
                    "Members can share an NFT once per day.");
                appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].shareCount = 1;
                token.dailyTokenReaction[_currentDay].shareCount = token.dailyTokenReaction[_currentDay].shareCount.add(1);

            } else if (keccak256(bytes(_reactions[i])) == keccak256(bytes("Metaverse"))) {
                require(appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].metaverseCount == 0,
                    "Members can metaverse an NFT once per day.");
                appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].metaverseCount = 1;
                token.dailyTokenReaction[_currentDay].metaverseCount = token.dailyTokenReaction[_currentDay].metaverseCount.add(1);

            } else {
                require(
                    false,
                    "An inputted reaction string is not allowed"
                );
            }


            appraiser.totalReactionCount = appraiser.totalReactionCount + 1;
            _updateTodayWeightByReaction(_whitelistedNFTs[i], _tokenIds[i], whitelistedNFTTokenOwner[_whitelistedNFTs[i]][ _tokenIds[i]]);
            emit WhitelistedNFTReaction(_reactions[i], 1, _whitelistedNFTs[i], _tokenIds[i]);
        }
        // AppraiserStats - Boost
        TokenWeight storage _guildMemberWeight = guildMemberWeight[_msgSender()];
        uint256 currentDay = diffDays(startTime, _getNow());
        _guildMemberWeight.dailyTokenReaction[currentDay].appraisalCount["Self"] = _guildMemberWeight.dailyTokenReaction[currentDay].appraisalCount["Self"].add(_tokenIds.length);
        _updateTodayGuildMemberWeightByReaction(_msgSender());


    }

    // Emotional appraisals
    function appraiseWhitelistedNFT( address[] memory _whitelistedNFTs, uint256[] memory _tokenIds, string[] memory _reactions) external {
        require(ownerWeight[_msgSender()].stakedNFTCount > 0, "Sender must stake PODE");


        uint256 _currentDay = diffDays(startTime, _getNow());
        AppraiserStats storage appraiser = appraiserStats[_msgSender()];

        require(_whitelistedNFTs.length == _tokenIds.length, "Must be equal quantity of whitelisted and token ids");
        require(_whitelistedNFTs.length == _reactions.length, "Must be equal quantity of whitelisted and token ids");
        uint256 _totalSupply = guildNativeERC20Token.totalSupply();
        uint256 erc20Balance = guildNativeERC20Token.balanceOf(_msgSender());
        uint256 _clapLimit = store.getClapMappingValue(_totalSupply, erc20Balance);
        for (uint256 i = 0; i < _whitelistedNFTs.length; i++) {
            require(whitelistedNFTTokenOwner[_whitelistedNFTs[i]][ _tokenIds[i]] != _msgSender(), "Cannot React to Own token");

            require(
                appraiser.dailyReactionCount[_currentDay] < _clapLimit,
                "Limit appraisal count per day"
            );

            // AppraiserStats
            appraiser.dailyReactionCount[_currentDay] = appraiser.dailyReactionCount[_currentDay] + 1;
            appraiser.totalReactionCount = appraiser.totalReactionCount + 1;

            // Token
            TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFTs[i]][_tokenIds[i]];
            token.dailyTokenReaction[_currentDay].appraisalCount[_reactions[i]] = token.dailyTokenReaction[_currentDay].appraisalCount[_reactions[i]].add(1);

            _updateTodayWeightByReaction(_whitelistedNFTs[i], _tokenIds[i], whitelistedNFTTokenOwner[_whitelistedNFTs[i]][ _tokenIds[i]]);
            emit WhitelistedNFTReaction(_reactions[i], 1, _whitelistedNFTs[i], _tokenIds[i]);
        }
        // AppraiserStats - Boost
        TokenWeight storage _guildMemberWeight = guildMemberWeight[_msgSender()];
        uint256 currentDay = diffDays(startTime, _getNow());
        _guildMemberWeight.dailyTokenReaction[currentDay].appraisalCount["Self"] = _guildMemberWeight.dailyTokenReaction[currentDay].appraisalCount["Self"].add(_tokenIds.length);
        _updateTodayGuildMemberWeightByReaction(_msgSender());
    }


    function clapWhitelistedNFT( address[] memory _whitelistedNFTs, uint256[] memory _tokenIds, uint256[] memory _clapQuantity) external {
        require(ownerWeight[_msgSender()].stakedNFTCount > 0, "Sender must stake PODE");

        uint256 _currentDay = diffDays(startTime, _getNow());
        AppraiserStats storage appraiser = appraiserStats[_msgSender()];

        require(_whitelistedNFTs.length == _tokenIds.length, "Must be equal quantity of whitelisted token ids");
        uint256 _totalSupply = guildNativeERC20Token.totalSupply();
        uint256 erc20Balance = guildNativeERC20Token.balanceOf(_msgSender());
        uint256 _clapLimit = store.getClapMappingValue(_totalSupply, erc20Balance);
        for (uint256 i = 0; i < _whitelistedNFTs.length; i++) {

            require(whitelistedNFTTokenOwner[_whitelistedNFTs[i]][ _tokenIds[i]] != _msgSender(), "Cannot React to Own token");

            require(
                appraiser.dailyClapCount[_currentDay].add(_clapQuantity[i]) <= _clapLimit,
                "Limit appraisal count per day"
            );

            // AppraiserStats
            appraiser.dailyClapCount[_currentDay] = appraiser.dailyClapCount[_currentDay] + _clapQuantity[i];
            appraiser.totalClapCount = appraiser.totalClapCount + _clapQuantity[i];

            appraiser.totalReactionCount = appraiser.totalReactionCount + 1;

            // Token
            TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFTs[i]][_tokenIds[i]];
            token.dailyTokenReaction[_currentDay].clapCount = token.dailyTokenReaction[_currentDay].clapCount.add(_clapQuantity[i]);

            _updateTodayWeightByReaction(_whitelistedNFTs[i], _tokenIds[i], whitelistedNFTTokenOwner[_whitelistedNFTs[i]][ _tokenIds[i]]);
            emit WhitelistedNFTReaction("Clap", _clapQuantity[i], _whitelistedNFTs[i], _tokenIds[i]);
        }
        // AppraiserStats - Boost
        TokenWeight storage _guildMemberWeight = guildMemberWeight[_msgSender()];
        uint256 currentDay = diffDays(startTime, _getNow());
        _guildMemberWeight.dailyTokenReaction[currentDay].appraisalCount["Self"] = _guildMemberWeight.dailyTokenReaction[currentDay].appraisalCount["Self"].add(_tokenIds.length);
        _updateTodayGuildMemberWeightByReaction(_msgSender());
    }

    function appraiseGuildMember(address[] memory _guildMembers, string[] memory _reactions) external {
        require(ownerWeight[_msgSender()].stakedNFTCount > 0, "Sender must stake PODE");

        uint256 _currentDay = diffDays(startTime, _getNow());
        AppraiserStats storage appraiser = appraiserStats[_msgSender()];

        uint256 _totalSupply = guildNativeERC20Token.totalSupply();
        uint256 erc20Balance = guildNativeERC20Token.balanceOf(_msgSender());
        uint256 _clapLimit = store.getClapMappingValue(_totalSupply, erc20Balance);
        require(_guildMembers.length == _reactions.length, "Must be equal quantity of whitelisted and token ids");
        for (uint256 i = 0; i < _guildMembers.length; i++) {
            require(_msgSender() != _guildMembers[i], "Appraiser cannot appraise themselves");
            require(ownerWeight[_guildMembers[i]].stakedNFTCount > 0, "Appraiser cannot appraise non-pode stakers");

            require(
                appraiser.dailyGuildMemberReactionCount[_currentDay] < _clapLimit,
                "Limit appraisal count per day"
            );
            require(
                appraiser.dailyGuildMemberAppraisalReactionCount[_currentDay][_guildMembers[i]] == 0,
                "Reached Limit appraisal per appraisers per day"
            );

            // AppraiserStats
            appraiser.dailyGuildMemberReactionCount[_currentDay] = appraiser.dailyGuildMemberReactionCount[_currentDay] + 1;
            appraiser.totalGuildMemberReactionCount = appraiser.totalGuildMemberReactionCount + 1;
            appraiser.dailyGuildMemberAppraisalReactionCount[_currentDay][_guildMembers[i]] = appraiser.dailyGuildMemberAppraisalReactionCount[_currentDay][_guildMembers[i]] + 1;

            // Token
            TokenWeight storage _guildMemberWeight = guildMemberWeight[_guildMembers[i]];
            _guildMemberWeight.dailyTokenReaction[_currentDay].appraisalCount[_reactions[i]] = _guildMemberWeight.dailyTokenReaction[_currentDay].appraisalCount[_reactions[i]].add(1);

            _updateTodayGuildMemberWeightByReaction(_guildMembers[i]);
            emit AppraiseGuildMember(_reactions[i], _guildMembers[i]);
        }

        // AppraiserStats - Boost
        TokenWeight storage _guildMemberWeight = guildMemberWeight[_msgSender()];
        uint256 currentDay = diffDays(startTime, _getNow());
        _guildMemberWeight.dailyTokenReaction[currentDay].appraisalCount["Self"] = _guildMemberWeight.dailyTokenReaction[currentDay].appraisalCount["Self"].add(_guildMembers.length);
        _updateTodayGuildMemberWeightByReaction(_msgSender());
    }


    // TODO unit test this very thoroughly
    function migrateCurrentStake(uint256 _tokenId, address _tokenOwner, uint256 stakeWeight) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "Sender must be admin"
        );

        // TokenWeight
        TokenWeight storage token = podeTokenWeight[_tokenId];
        token.lastWeight = stakeWeight;
        _stake(_tokenId, _tokenOwner);
    }

    function stake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external {
        require(_msgSender() == stakingContract);

        _stake(_tokenId, _tokenOwner);
    }

    function _stake(uint256 _tokenId, address _tokenOwner) internal {
        require(tokenOwner[_tokenId] == address(0) || tokenOwner[_tokenId] == _tokenOwner);
        uint256 _currentDay = diffDays(startTime, _getNow());

        // TokenWeight
        TokenWeight storage token = podeTokenWeight[_tokenId];
        if(token.lastWeight == 0){
            token.lastWeight = DAILY_NFT_WEIGHT_DEFAULT.mul(MULTIPLIER);
        }
        token.lastUpdateDay = _currentDay;

        tokenOwner[_tokenId] = _tokenOwner;

        // OwnerWeight
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        if (owner.stakedNFTCount == 0) {
            owner.startDay = _currentDay;
        }

        owner.stakedNFTCount = owner.stakedNFTCount.add(1);

        // GuildWeight
        updateWeight();

        stakedNFTCount = stakedNFTCount.add(1);
        totalGuildWeight = (totalGuildWeight.add(token.lastWeight));

        owner.dailyGuildMemberWeight[_currentDay] =owner.dailyGuildMemberWeight[_currentDay].add(token.lastWeight);
        owner.lastGuildMemberWeight = owner.lastGuildMemberWeight.add(token.lastWeight);

        updateOwnerWeight(_tokenOwner);

        owner.lastGuildMemberUpdateDay = _currentDay;
        lastGuildMemberUpdateDay = (_currentDay);
        emit StakedMembershipToken(_tokenOwner, _tokenId);
    }

    function unstake(uint256 _tokenId, address _tokenOwner) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");
        require(tokenOwner[_tokenId] == _tokenOwner);

        uint256 _currentDay = diffDays(startTime, _getNow());

        // TokenWeight storage token = tokenWeight[_tokenId];
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        owner.stakedNFTCount = owner.stakedNFTCount.sub(1);

        stakedNFTCount = stakedNFTCount.sub(1);

        TokenWeight storage token = podeTokenWeight[_tokenId];

        uint256 newWeight = owner.lastGuildMemberWeight.div(owner.stakedNFTCount.add(1));

        if(newWeight<= totalGuildWeight){
            totalGuildWeight = totalGuildWeight.sub(newWeight);
        }

        if(newWeight <= owner.lastGuildMemberWeight){
            owner.lastGuildMemberWeight = owner.lastGuildMemberWeight.sub(newWeight);
        }

        updateOwnerWeight(_tokenOwner);
        owner.lastGuildMemberUpdateDay = _currentDay;
        lastGuildMemberUpdateDay = (_currentDay);

        if (stakedNFTCount == 0) {
            totalGuildWeight = (0);
        }

        if(token.lastWeight <= totalGuildWeight ) {
            totalGuildWeight = (totalGuildWeight.sub(token.lastWeight));
        }

        token.lastWeight = newWeight;

        TokenWeight storage guildMember = guildMemberWeight[_tokenOwner];

        if(newWeight <= owner.dailyGuildMemberWeight[_currentDay]){
            owner.dailyGuildMemberWeight[_currentDay] = owner.dailyGuildMemberWeight[_currentDay].sub(newWeight);
        }
        guildMember.dailyWeight[_currentDay] = owner.dailyGuildMemberWeight[_currentDay];
        guildMember.lastWeight = owner.lastGuildMemberWeight;

        delete tokenOwner[_tokenId];

        emit UnstakedMembershipToken(_tokenOwner, _tokenId);
    }

    function stakeWhitelistedNFT(address _whitelistedNFT, uint256 _tokenId, address _tokenOwner) external {
        require(_msgSender() == whitelistedStakingContract, "Sender must be staking contract");
        require(whitelistedNFTTokenOwner[_whitelistedNFT][ _tokenId] == address(0) || whitelistedNFTTokenOwner[_whitelistedNFT][ _tokenId] == _tokenOwner);

        uint256 _currentDay = diffDays(startTime, _getNow());

        // TokenWeight
        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        if(token.lastWeight == 0){
            token.lastWeight = DAILY_NFT_WEIGHT_DEFAULT.mul(MULTIPLIER);
        }

        token.lastUpdateDay = _currentDay;

        whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId] = _tokenOwner;

        // OwnerWeight
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        if (owner.stakedWhitelistedNFTCount == 0) {
            owner.startDay = _currentDay;
        }

        owner.stakedWhitelistedNFTCount = owner.stakedWhitelistedNFTCount.add(1);
        owner.lastWeight = owner.lastWeight.add(token.lastWeight);

        // GuildWeight
        updateWeight();

        stakedWhitelistedNFTCount = stakedWhitelistedNFTCount.add(1);
        totalWhitelistedNFTTokenWeight = (totalWhitelistedNFTTokenWeight.add(token.lastWeight));

        updateWhitelistedNFTOwnerWeight(_tokenOwner);
        owner.lastUpdateDay = _currentDay;
        lastUpdateDay = (_currentDay);

        emit StakedWhitelistedNFTToken(_tokenOwner, _whitelistedNFT, _tokenId);
    }

    function unstakeWhitelistedNFT(address _whitelistedNFT,uint256 _tokenId, address _tokenOwner) external {
        require(_msgSender() == whitelistedStakingContract, "Sender must be staking contract");
        require(whitelistedNFTTokenOwner[_whitelistedNFT][ _tokenId] == _tokenOwner);

        uint256 _currentDay = diffDays(startTime, _getNow());

        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        token.dailyWeight[_currentDay] = _calcTokenWeight(_whitelistedNFT, _tokenId);
        token.lastWeight = token.dailyWeight[_currentDay];

        owner.stakedWhitelistedNFTCount = owner.stakedWhitelistedNFTCount.sub(1);

        if(token.lastWeight <= owner.lastWeight){
            owner.lastWeight = owner.lastWeight.sub(token.lastWeight);
        }

        if(token.lastWeight <= owner.dailyWeight[_currentDay]){
            owner.dailyWeight[_currentDay] = owner.dailyWeight[_currentDay].sub(token.lastWeight);
        }

        stakedWhitelistedNFTCount = stakedWhitelistedNFTCount.sub(1);

        if (stakedWhitelistedNFTCount == 0) {
            totalWhitelistedNFTTokenWeight = 0;
        }


        if(token.lastWeight <= totalWhitelistedNFTTokenWeight) {
            totalWhitelistedNFTTokenWeight = (totalWhitelistedNFTTokenWeight.sub(token.lastWeight));
        }

        updateWhitelistedNFTOwnerWeight(_tokenOwner);

        owner.lastUpdateDay = _currentDay;
        lastUpdateDay = (_currentDay);


        delete whitelistedNFTTokenOwner[_whitelistedNFT][ _tokenId];

        emit UnstakedWhitelistedNFTToken(_tokenOwner, _whitelistedNFT, _tokenId);
    }

    function _msgSender() internal view returns (address payable sender) {
        return msg.sender;
    }

    function diffDays(uint fromTimestamp, uint toTimestamp) internal pure returns (uint _days) {
        require(fromTimestamp <= toTimestamp);
        _days = (toTimestamp - fromTimestamp) / SECONDS_PER_DAY;
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}
