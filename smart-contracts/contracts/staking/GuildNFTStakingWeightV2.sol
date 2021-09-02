pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../EIP2771/BaseRelayRecipient.sol";
import "../DigitalaxAccessControls.sol";
//import "./interfaces/IGuildNFTStakingWeight.sol";
//import "./interfaces/IGuildNFTStakingWeightWhitelisted.sol";

import "@nomiclabs/buidler/console.sol";
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

    PercentageMapping[9] public clapMapping;
    PercentageMapping[9] public decoBonusMapping;
    AppraisedBonusMapping[13] public appraisalBonusMapping;

    mapping (string => uint256) reactionPoint;

    event UpdateAccessControls(
        address indexed accessControls
    );

    struct PercentageMapping {
        uint256 percentage;
        uint256 mapValue;
    }

    struct AppraisedBonusMapping {
        uint256 numberAppraised;
        uint256 bonus;
    }

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

        uint256 totalWhitelistedNFTAppraisals; // TODO
       // uint256 totalGuildMemberAppraisals; // this is appraiser.totalGuildMemberReactionCount

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

//    struct DailyReaction {
//        // reaction => appraiserCount
//        mapping (uint256 => uint256) appraisersGaveReaction;
//    }

    uint256 public startTime;

    uint256 public stakedNFTCount;

    uint256 public stakedWhitelistedNFTCount;
    uint256 public totalWhitelistedNFTTokenWeight;

    uint256 public totalGuildWeight;

    mapping (uint256 => address) public tokenOwner;
    mapping (address => mapping(uint256 => address)) public whitelistedNFTTokenOwner;

    mapping (address => mapping(uint256 => TokenWeight)) public whitelistedNFTTokenWeight;
    mapping(uint256 => TokenWeight) public podeTokenWeight;
    mapping(address => TokenWeight) public guildMemberWeight;

    mapping (address => OwnerWeight) public ownerWeight;

    mapping (address => AppraiserStats) public appraiserStats;
    mapping (uint256 => uint256) dailyWeight;


    uint256 public lastUpdateDay;
    uint256 public lastGuildMemberUpdateDay;

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

        clapMapping[0] = PercentageMapping(0, 30);
        clapMapping[1] = PercentageMapping(5, 60);
        clapMapping[2] = PercentageMapping(10, 90);
        clapMapping[3] = PercentageMapping(25, 120);
        clapMapping[4] = PercentageMapping(50, 150);
        clapMapping[5] = PercentageMapping(100, 180);
        clapMapping[6] = PercentageMapping(250, 210);
        clapMapping[7] = PercentageMapping(500, 240);
        clapMapping[8] = PercentageMapping(1000, 270);

        decoBonusMapping[0] = PercentageMapping(0, 30);
        decoBonusMapping[1] = PercentageMapping(5, 60);
        decoBonusMapping[2] = PercentageMapping(10, 90);
        decoBonusMapping[3] = PercentageMapping(25, 120);
        decoBonusMapping[4] = PercentageMapping(50, 150);
        decoBonusMapping[5] = PercentageMapping(100, 180);
        decoBonusMapping[6] = PercentageMapping(250, 210);
        decoBonusMapping[7] = PercentageMapping(500, 240);
        decoBonusMapping[8] = PercentageMapping(1000, 270);

        appraisalBonusMapping[0] = AppraisedBonusMapping(0, 0);
        appraisalBonusMapping[1] = AppraisedBonusMapping(1, 1);
        appraisalBonusMapping[2] = AppraisedBonusMapping(10, 1);
        appraisalBonusMapping[3] = AppraisedBonusMapping(50, 2);
        appraisalBonusMapping[4] = AppraisedBonusMapping(110, 3);
        appraisalBonusMapping[5] = AppraisedBonusMapping(200, 5);
        appraisalBonusMapping[6] = AppraisedBonusMapping(400, 8);
        appraisalBonusMapping[7] = AppraisedBonusMapping(800,13);
        appraisalBonusMapping[8] = AppraisedBonusMapping(1300, 21);
        appraisalBonusMapping[9] = AppraisedBonusMapping(2000, 34);
        appraisalBonusMapping[10] = AppraisedBonusMapping(3600, 55);
        appraisalBonusMapping[11] = AppraisedBonusMapping(6000, 89);
        appraisalBonusMapping[12] = AppraisedBonusMapping(13000, 144);
    }

    function init(address _stakingContract, address _whitelistedStakingContract, IERC20 _guildNativeERC20Token, DigitalaxAccessControls _accessControls) external {
        require(!initialised, "Already initialised");

        accessControls = _accessControls;
        stakingContract = _stakingContract;
        whitelistedStakingContract = _whitelistedStakingContract;
        guildNativeERC20Token = _guildNativeERC20Token;
        initialised = true;
    }

    function balanceOf(address _owner) external view returns (uint256) {
        return _balanceOf(_owner);
    }

    function balanceOfWhitelistedNFT(address _owner) external view returns (uint256) {
        return _balanceOfWhitelistedNFT(_owner);
    }

    function _balanceOf(address _owner) internal view returns (uint256) {
        return ownerWeight[_owner].stakedNFTCount;
    }

    function _balanceOfWhitelistedNFT(address _owner) internal view returns (uint256) {
        return ownerWeight[_owner].stakedWhitelistedNFTCount;
    }

    function getTotalWhitelistedNFTTokenWeight() external view returns (uint256) {
       // return totalWhitelistedNFTTokenWeight;
        return calcNewTotalWhitelistedNFTWeight();
    }

    function getTotalWeight() external view returns (uint256) {
        return calcNewWeight();
    }

    function getOwnerWeight(address _tokenOwner) external view returns (uint256) {
        return calcNewOwnerWeight(_tokenOwner);
     //   return ownerWeight[_tokenOwner].lastGuildMemberWeight;
    }

    function getWhitelistedNFTOwnerWeight(address _tokenOwner) external view returns (uint256) {
        return calcNewWhitelistedNFTOwnerWeight(_tokenOwner);
      //  return ownerWeight[_tokenOwner].lastWeight;
    }

    function getOwnerLastGuildMemberWeight(address _tokenOwner) external view returns (uint256) {
        return ownerWeight[_tokenOwner].lastGuildMemberWeight;
    }

    function getOwnerLastWhitelistedNFTWeight(address _tokenOwner) external view returns (uint256) {
        return ownerWeight[_tokenOwner].lastWeight;
    }

    // TODO FUNCTIONS THAT CANNOT GO IN DUE TO CONTRACT SIZE RIGHT NOW
    //    function updateReactionPoint(string memory _reaction, uint256 _point) external {
    //        require(
    //            accessControls.hasAdminRole(_msgSender()),
    //            "GuildNFTStakingWeightV2.updateReactionPoint: Sender must be admin"
    //        );
    //
    //        reactionPoint[_reaction] = _point;
    //    }
//
//    function setClapsMappingValue(uint256[] memory percentage, uint256[] memory mappingValue) external {
//        require(percentage.length == 9, "GuildNFTStakingWeightV2.setClapsMappingValue: Must set all mapping values");
//        require(percentage.length == mappingValue.length,  "GuildNFTStakingWeightV2.setClapsMappingValue: Arrays must be same length");
//        for(uint256 i =0; i<9; i++){
//            if(i > 0){
//                require(percentage[i] > percentage[i.sub(1)], "GuildNFTStakingWeightV2.setClapsMappingValue: Must have increasing percentage");
//                require(mappingValue[i] > mappingValue[i.sub(1)], "GuildNFTStakingWeightV2.setClapsMappingValue: Must have increasing mapValue");
//            }
//            clapMapping[i].percentage = percentage[i];
//            clapMapping[i].mapValue = mappingValue[i];
//        }
//    }
//
//    function getClapsMappingValues() external view returns (uint256[9] memory percentage, uint256[9] memory mapValue){
//        for(uint256 i =0; i<9; i++){
//            percentage[i] = clapMapping[i].percentage;
//            mapValue[i] = clapMapping[i].mapValue;
//        }
//        return (percentage, mapValue);
//    }
//
//    function setDecoBonusValue(uint256[] memory percentage, uint256[] memory mappingValue) external {
//        require(percentage.length == 9, "GuildNFTStakingWeightV2.setDecoBonusValue: Must set all mapping values");
//        require(percentage.length == mappingValue.length,  "GuildNFTStakingWeightV2.setDecoBonusValue: Arrays must be same length");
//        for(uint256 i =0; i<9; i++){
//            if(i > 0){
//                require(percentage[i] > percentage[i.sub(1)], "GuildNFTStakingWeightV2.setDecoBonusValue: Must have increasing percentage");
//                require(mappingValue[i] > mappingValue[i.sub(1)], "GuildNFTStakingWeightV2.setDecoBonusValue: Must have increasing mapValue");
//            }
//            decoBonusMapping[i].percentage = percentage[i];
//            decoBonusMapping[i].mapValue = mappingValue[i];
//        }
//    }
//
//    function getDecoBonusMappingValues() external view returns (uint256[9] memory percentage, uint256[9] memory mapValue){
//        for(uint256 i =0; i<9; i++){
//            percentage[i] = decoBonusMapping[i].percentage;
//            mapValue[i] = decoBonusMapping[i].mapValue;
//        }
//        return (percentage, mapValue);
//    }

    //    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
    //        require(
    //            accessControls.hasAdminRole(_msgSender()),
    //            "GuildNFTStaking.updateAccessControls: Sender must be admin"
    //        );
    //        require(address(_accessControls) != address(0), "GuildNFTStakingWeightV2.updateAccessControls: Zero Address");
    //        accessControls = _accessControls;
    //        emit UpdateAccessControls(address(_accessControls));
    //    }
    //
    //    function updateStartTime(uint256 _startTime) external {
    //        require(
    //            accessControls.hasAdminRole(_msgSender()),
    //            "GuildNFTStakingWeightV2.updateStartTime: Sender must be admin"
    //        );
    //
    //        startTime = _startTime;
    //    }
    //
    //    // Note needs to be 10x higher then the percentage you are interested in.
    //    function updateDecayPoints(uint256 decayPointDefault, uint256 decayPointWithAppraisal) external {
    //        require(
    //            accessControls.hasAdminRole(_msgSender()),
    //            "GuildNFTStakingWeightV2.updateDecayPoints: Sender must be admin"
    //        );
    //
    //        DECAY_POINT_DEFAULT = decayPointDefault;
    //        DECAY_POINT_WITH_APPRAISAL = decayPointWithAppraisal;
    //    }

    function _getMappingValue(uint256 _totalSupply, uint256 _balance, PercentageMapping[9] storage _mapping) internal view returns (uint256) {
        uint256 _percentage = _balance.mul(MULTIPLIER) / _totalSupply;

        if (_percentage > _mapping[8].percentage) {           // 1+% held
            return _mapping[8].mapValue;
        } else if (_percentage > _mapping[7].percentage) {     // 0.5% > 1% held
            return _mapping[7].mapValue;
        } else if (_percentage > _mapping[6].percentage) {     // 0.25% > 0.5% held
            return _mapping[6].mapValue;
        } else if (_percentage > _mapping[5].percentage) {     // 0.1% > 0.25% held
            return _mapping[5].mapValue;
        } else if (_percentage > _mapping[4].percentage) {      // 0.05% > 0.1% held
            return _mapping[4].mapValue;
        } else if (_percentage > _mapping[3].percentage) {      // 0.025% > 0.05% held
            return _mapping[3].mapValue;
        } else if (_percentage > _mapping[2].percentage) {      // 0.01% > 0.025% held
            return _mapping[2].mapValue;
        } else if (_percentage > _mapping[1].percentage) {       // 0.005% > 0.01% held
            return _mapping[1].mapValue;
        } else if (_percentage >= _mapping[0].percentage) {       // 0 > 0.005% held
            return  _mapping[0].mapValue;
        } else {
            return 0;
        }// 0 held
    }

    function setAppraisalBonusMapping(uint256[] memory appraisalCount, uint256[] memory bonusValue) external {
        require(appraisalCount.length == 13, "GuildNFTStakingWeightV2.setAppraisalBonusMapping: Must set all mapping values");
        require(appraisalCount.length == bonusValue.length,  "GuildNFTStakingWeightV2.setAppraisalBonusMapping: Arrays must be same length");
        for(uint256 i =0; i<13; i++){
            if(i > 0){
                require(appraisalCount[i] > appraisalCount[i.sub(1)], "GuildNFTStakingWeightV2.setAppraisalBonusMapping: Must have increasing percentage");
                require(bonusValue[i] > bonusValue[i.sub(1)], "GuildNFTStakingWeightV2.setAppraisalBonusMapping: Must have increasing mapValue");
            }
            appraisalBonusMapping[i].numberAppraised = appraisalCount[i];
            appraisalBonusMapping[i].bonus = bonusValue[i];
        }
    }

    function getAppraisedBonusMappingValues() external view returns (uint256[13] memory numberAppraised, uint256[13] memory bonus){
        for(uint256 i =0; i<13; i++){
            numberAppraised[i] = appraisalBonusMapping[i].numberAppraised;
            bonus[i] = appraisalBonusMapping[i].bonus;
        }
        return (numberAppraised, bonus);
    }

    function _getAppraisedBonusMappingValue(uint256 _totalAppraised, AppraisedBonusMapping[13] storage _mapping) internal view returns (uint256) {
        if (_totalAppraised > _mapping[12].numberAppraised) {
            return _mapping[12].bonus;
        } else if (_totalAppraised > _mapping[11].numberAppraised) {
            return _mapping[11].bonus;
        } else if (_totalAppraised > _mapping[10].numberAppraised) {
            return _mapping[10].bonus;
        } else if (_totalAppraised > _mapping[9].numberAppraised) {
            return _mapping[9].bonus;
        } else if (_totalAppraised > _mapping[8].numberAppraised) {
            return _mapping[8].bonus;
        } else if (_totalAppraised > _mapping[7].numberAppraised) {
            return _mapping[7].bonus;
        } else if (_totalAppraised > _mapping[6].numberAppraised) {
            return _mapping[6].bonus;
        } else if (_totalAppraised > _mapping[5].numberAppraised) {
            return _mapping[5].bonus;
        } else if (_totalAppraised > _mapping[4].numberAppraised) {
            return _mapping[4].bonus;
        } else if (_totalAppraised > _mapping[3].numberAppraised) {
            return _mapping[3].bonus;
        } else if (_totalAppraised > _mapping[2].numberAppraised) {
            return _mapping[2].bonus;
        } else if (_totalAppraised > _mapping[1].numberAppraised) {
            return _mapping[1].bonus;
        } else if (_totalAppraised >= _mapping[0].numberAppraised) {
            return  _mapping[0].bonus;
        } else {
            return 0;
        }// 0 held
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
        uint256 _clapLimit = _getMappingValue(_totalSupply, erc20Balance, clapMapping);
     //   result = result.add(_reaction.clapCount.mul(_getPowerLevelByClapLimit(_clapLimit)));

        result = result.add(_reaction.clapCount);       // stake points = clap limit per day

        result = result.add(_reaction.appraisalCount["Love"].mul(reactionPoint["Love"]));
        result = result.add(_reaction.appraisalCount["Like"].mul(reactionPoint["Like"]));
        result = result.add(_reaction.appraisalCount["Fire"].mul(reactionPoint["Fire"]));
        result = result.add(_reaction.appraisalCount["Sad"].mul(reactionPoint["Sad"]));
        result = result.add(_reaction.appraisalCount["Angry"].mul(reactionPoint["Angry"]));
        result = result.add(_reaction.appraisalCount["Novel"].mul(reactionPoint["Novel"]));

        return result.mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT);
    }

    function _getGuildMemberReactionPoints(address _guildMember, uint256 _currentDay) internal view returns (uint256) {
        TokenReaction storage _reaction = guildMemberWeight[_guildMember].dailyTokenReaction[_currentDay];

        uint256 result = 0;

        result = result.add(_reaction.appraisalCount["Love"].mul(reactionPoint["Love"]));
        result = result.add(_reaction.appraisalCount["Like"].mul(reactionPoint["Like"]));
        result = result.add(_reaction.appraisalCount["Fire"].mul(reactionPoint["Fire"]));
        result = result.add(_reaction.appraisalCount["Sad"].mul(reactionPoint["Sad"]));
        result = result.add(_reaction.appraisalCount["Angry"].mul(reactionPoint["Angry"]));
        result = result.add(_reaction.appraisalCount["Novel"].mul(reactionPoint["Novel"]));

        return result.mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT);
    }

//    function calcNewTotalNFTWeight() internal view returns (uint256) {
//        uint256 _currentDay = getCurrentDay();
//
//        return totalWhitelistedNFTTokenWeight;
//    }


    function calcNewWeight() public view returns (uint256) {
        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= lastGuildMemberUpdateDay || (stakedNFTCount == 0 && stakedWhitelistedNFTCount == 0)) {
            return totalGuildWeight;
        }

        console.log("The current day is: %s", _currentDay);
        console.log("The lastupdate day is: %s", lastGuildMemberUpdateDay);
        uint256 _totalPeriodUpToLastUpdateDay = _currentDay.sub(lastGuildMemberUpdateDay);
        uint256 _totalPeriodUpToStartDate = diffDays(startTime, _getNow());
        console.log("The Total period to last update is: %s", _totalPeriodUpToLastUpdateDay);
        console.log("The Total period to start date is: %s", _totalPeriodUpToStartDate);

        return totalGuildWeight.add(DAILY_NFT_WEIGHT_DEFAULT.mul(MULTIPLIER).mul(stakedNFTCount).mul(_totalPeriodUpToLastUpdateDay));
       // uint256 _newWeight = totalGuildWeight.mul(_totalPeriodUpToStartDate).div(_totalPeriodUpToStartDate.sub(_totalPeriodUpToLastUpdateDay).add(1));

    }
    function calcNewTotalWhitelistedNFTWeight() public view returns (uint256) {
        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= lastUpdateDay || (stakedNFTCount == 0 && stakedWhitelistedNFTCount == 0)) {
            return totalWhitelistedNFTTokenWeight;
        }

        console.log("The current day is: %s", _currentDay);
        console.log("The lastupdate day is: %s", lastUpdateDay);
        uint256 _totalPeriodUpToLastUpdateDay = _currentDay.sub(lastUpdateDay);
        uint256 _totalPeriodUpToStartDate = diffDays(startTime, _getNow());
        console.log("The Total period to last update is: %s", _totalPeriodUpToLastUpdateDay);
        console.log("The Total period to start date is: %s", _totalPeriodUpToStartDate);

        return totalWhitelistedNFTTokenWeight.add(DAILY_NFT_WEIGHT_DEFAULT.mul(MULTIPLIER).mul(stakedWhitelistedNFTCount).mul(_totalPeriodUpToLastUpdateDay));
       // uint256 _newWeight = totalGuildWeight.mul(_totalPeriodUpToStartDate).div(_totalPeriodUpToStartDate.sub(_totalPeriodUpToLastUpdateDay).add(1));

    }


    function updateWeight() public returns (bool) {
        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= lastGuildMemberUpdateDay) {
            return false;
        }
        totalGuildWeight = calcNewWeight();

        lastGuildMemberUpdateDay = _currentDay;

        return true;
    }


    function updateWhitelistedNFTWeight() public returns (bool) {
        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= lastUpdateDay) {
            return false;
        }
        totalWhitelistedNFTTokenWeight = calcNewTotalWhitelistedNFTWeight();

        lastUpdateDay = _currentDay;

        return true;
    }

    function calcNewOwnerWeight(address _tokenOwner) public view returns (uint256) {
        uint256 _currentDay = getCurrentDay();
        console.log("****We are calculating the owner weight on date %s!", _currentDay);
        OwnerWeight storage _owner = ownerWeight[_tokenOwner];

        if (_owner.lastGuildMemberUpdateDay >= _currentDay) {

            console.log("***Hit this point %s!", _owner.lastGuildMemberWeight);
            return _owner.lastGuildMemberWeight;
        }

        uint256 _newWeight = _owner.dailyGuildMemberWeight[_owner.lastGuildMemberUpdateDay];
        console.log("The new weight is");

      //  for (uint256 i = _owner.lastGuildMemberUpdateDay + 1; i < _currentDay; i++) {
        // Need to also add the new factors

            _newWeight = _newWeight.add((DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER * _owner.stakedNFTCount)
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)        // decay rate: 7.5%
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE).mul(_currentDay.sub(_owner.lastGuildMemberUpdateDay)));

      //  }

        return _newWeight;
    }

    function calcNewWhitelistedNFTOwnerWeight(address _tokenOwner) public view returns (uint256) {
        uint256 _currentDay = getCurrentDay();

        console.log("****We are calculating the whitelisted nft owner weight on date %s!", _currentDay);
        OwnerWeight storage _owner = ownerWeight[_tokenOwner];

        if (_owner.lastUpdateDay >= _currentDay) {
            return _owner.lastWeight;
        }

        uint256 _newWeight = _owner.dailyWeight[_owner.lastUpdateDay];

      //  for (uint256 i = _owner.lastUpdateDay + 1; i < _currentDay; i++) {
            _newWeight = _newWeight.add((DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER * _owner.stakedWhitelistedNFTCount)
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)        // decay rate: 7.5%
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE).mul(_currentDay.sub(_owner.lastUpdateDay)));

       // }

        return _newWeight;
    }

    function updateWhitelistedNFTOwnerWeight(address _tokenOwner) public returns (bool) {
        updateWhitelistedNFTWeight();
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= owner.lastUpdateDay) {
            return false;
        }
        uint256 newDays = _currentDay.sub(owner.lastUpdateDay);
        uint256 prevWeight = owner.lastWeight;
        owner.lastWeight = calcNewWhitelistedNFTOwnerWeight(_tokenOwner); // total weight?
        console.log("reached whitelisted nfts total whitelisted nft weight weight @@@@@ %s", totalWhitelistedNFTTokenWeight);
        console.log("reached whitelisted nfts owner last weight @@@@@ %s", owner.lastWeight);
        console.log("reached whitelisted nfts owner prev weight @@@@@ %s", prevWeight);
        uint256 presumedIncreaseTokenWeight = newDays.mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT).mul(owner.stakedWhitelistedNFTCount);
        console.log("the presumed increase token weight is *****&&&&&&& %s", presumedIncreaseTokenWeight);
        console.log("the new days  is *****&&&&&&& %s", newDays);

        if(prevWeight <= totalWhitelistedNFTTokenWeight ) {
            totalWhitelistedNFTTokenWeight = totalWhitelistedNFTTokenWeight.sub(prevWeight);
        }

        uint256 modWeight = 0;
        if(owner.lastWeight >= presumedIncreaseTokenWeight){
            modWeight = modWeight.add(owner.lastWeight.sub(presumedIncreaseTokenWeight));
        }
//        else {
//            modWeight = modWeight.add(presumedIncreaseTokenWeight);
//        }
        totalWhitelistedNFTTokenWeight = totalWhitelistedNFTTokenWeight.add(modWeight); //owner.lastGuildMemberWeight).sub(presumedIncreaseGuildWeight);

        console.log("The new totalWhitelistedNFTTokenWeight is %s", totalWhitelistedNFTTokenWeight);
        owner.lastUpdateDay = _currentDay;

        return true;
    }
    function updateOwnerWeight(address _tokenOwner) public returns (bool) {
        updateWeight();
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

        uint256 _currentDay = getCurrentDay();

        if (_currentDay <= owner.lastGuildMemberUpdateDay) {
            return false;
        }
        uint256 newDays = _currentDay.sub(owner.lastGuildMemberUpdateDay);
        uint256 prevGuildMemberWeight = owner.lastGuildMemberWeight;
        owner.lastGuildMemberWeight = calcNewOwnerWeight(_tokenOwner);
        //if(totalGuildWeight >= prevGuildMemberWeight) {
        console.log("total guild weight is %s", totalGuildWeight);
        console.log("last guild weight is %s", owner.lastGuildMemberWeight);
        console.log("prev guild weight is %s", prevGuildMemberWeight);

        uint256 presumedIncreaseGuildWeight = newDays.mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT).mul(owner.stakedNFTCount);
        console.log("removala guild weight is %s", presumedIncreaseGuildWeight);

        if(prevGuildMemberWeight <= totalGuildWeight ) {
         totalGuildWeight = totalGuildWeight.sub(prevGuildMemberWeight);
        }

    //    if(presumedIncreaseGuildWeight <= totalGuildWeight.add(owner.lastGuildMemberWeight) ) {
        uint256 modWeight = 0;
        if(owner.lastGuildMemberWeight >= presumedIncreaseGuildWeight){
            modWeight = modWeight.add(owner.lastGuildMemberWeight.sub(presumedIncreaseGuildWeight));
        }
//        else {
//            modWeight = modWeight.add(presumedIncreaseGuildWeight);
//        }
            totalGuildWeight = totalGuildWeight.add(modWeight); //owner.lastGuildMemberWeight).sub(presumedIncreaseGuildWeight);


        owner.lastGuildMemberUpdateDay = _currentDay;

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

       // for (uint256 i = _token.lastUpdateDay + 1; i < _currentDay; i++) {
            _newWeight = _newWeight.add((DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER)
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)        // decay rate: 7.5%
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE).mul(_currentDay.sub(_token.lastUpdateDay)));
       // }

        return _newWeight;
    }

    /**
     * @dev Get yesterday token weight
     */
    function _initGuildMemberWeight(address _guildMember) internal view returns (uint256) {
        uint256 _currentDay = getCurrentDay();

        TokenWeight storage _guildMemberWeight = guildMemberWeight[_guildMember];

        if (_guildMemberWeight.lastUpdateDay >= _currentDay) {
            return _guildMemberWeight.lastWeight;
        }

        uint256 _newWeight = _guildMemberWeight.dailyWeight[_guildMemberWeight.lastUpdateDay];

        //for (uint256 i = _guildMemberWeight.lastUpdateDay + 1; i < _currentDay; i++) {
            _newWeight = _newWeight.add((DAILY_NFT_WEIGHT_DEFAULT * MULTIPLIER)
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)        // decay rate: 7.5%
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE).mul(_currentDay.sub(_guildMemberWeight.lastUpdateDay)));
        //}

        return _newWeight;
    }

    /**
     * @dev Calc today token weight by yesterday weight & today reactions
     */
    function _calcTokenWeight(address _whitelistedNFT, uint256 _tokenId) internal returns (uint256) {
        uint256 _currentDay = getCurrentDay();
        TokenWeight memory _token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];

        if (_currentDay < _token.lastUpdateDay) {

            console.log("did not hit reaction points ######################", _currentDay);
            return _token.lastWeight;
        }

        uint256 _yesterdayWeight = _initTokenWeight(_whitelistedNFT, _tokenId);

        uint256 _currentDayReactionPoint = _getReactionPoints(_whitelistedNFT, _tokenId, _currentDay);

        console.log("the reaction points are %s ######################", _currentDayReactionPoint);
        if (_currentDayReactionPoint > 0) {     // 2.5%
            return _yesterdayWeight.add((_currentDayReactionPoint.add((MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT)))
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_WITH_APPRAISAL)
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE));
        } else {                                // 7.5%
            return _yesterdayWeight; //.mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)
                                    //.div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
        }
    }

    /**
     * @dev Calc today token weight by yesterday weight & today reactions
     */
    function _calcGuildMemberWeight(address _guildMember) internal returns (uint256) {
        uint256 _currentDay = getCurrentDay();
        TokenWeight memory _guildMemberWeight = guildMemberWeight[_guildMember];

        if (_currentDay < _guildMemberWeight.lastUpdateDay) {
            return _guildMemberWeight.lastWeight;
        }

        uint256 reactionActivityBonus = 0;

        // Set up appraisers info
        AppraiserStats storage appraiser = appraiserStats[_msgSender()];

        // 1 Deco extra
        if(guildNativeERC20Token.totalSupply() > 0) {
            uint256 _decoBonus = _getMappingValue(guildNativeERC20Token.totalSupply(), guildNativeERC20Token.balanceOf(_msgSender()), decoBonusMapping);
            if( appraiser.maxDecoBonus < _decoBonus) {
                reactionActivityBonus = reactionActivityBonus.add((_decoBonus.sub(appraiser.maxDecoBonus)).mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT));
                appraiser.maxDecoBonus = _decoBonus;
            }
        }

        // 2 Appraised nft extra
        uint256 _appraisalMilestoneBonus = _getAppraisedBonusMappingValue(appraiser.uniqueWhitelistedNFTsAppraised, appraisalBonusMapping);
        if( appraiser.uniqueWhitelistedNFTAppraisedLastBonus < _appraisalMilestoneBonus) {
            reactionActivityBonus = reactionActivityBonus.add((_appraisalMilestoneBonus.sub(appraiser.uniqueWhitelistedNFTAppraisedLastBonus)).mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT));
            appraiser.uniqueWhitelistedNFTAppraisedLastBonus = _appraisalMilestoneBonus;
        }

        // 4 percentage of total assets consideration
        if(stakedWhitelistedNFTCount > 0) {
            uint256 percentageTotalAssets = uint256(1000000000000000000).mul(appraiser.uniqueWhitelistedNFTsAppraised).div(stakedWhitelistedNFTCount);
            if( appraiser.maxAssetsPercentageAppraised < percentageTotalAssets) {
                appraiser.maxAssetsPercentageAppraised = percentageTotalAssets;
                reactionActivityBonus = reactionActivityBonus.add(percentageTotalAssets.mul(uint256(100)).mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT) / 1000000000000000000);
            }
        }

        // 5 Appraisal days Bonus
        uint256 daysPassedSinceLastGuildAppraisal = diffDays(_guildMemberWeight.lastUpdateDay, _currentDay);
        if(daysPassedSinceLastGuildAppraisal < 10) {
            reactionActivityBonus = reactionActivityBonus.add(uint256(10).sub(daysPassedSinceLastGuildAppraisal).mul(MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT));
        }

        uint256 _currentDayReactionPoint = _getGuildMemberReactionPoints(_guildMember, _currentDay);
        // update current day reaction points with the other factors

        if (_currentDayReactionPoint > 0) {     // 2.5%
            return _initGuildMemberWeight(_guildMember).add((reactionActivityBonus.add(_currentDayReactionPoint).add((MULTIPLIER).mul(DAILY_NFT_WEIGHT_DEFAULT)))
                                    .mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_WITH_APPRAISAL)
                                    .div(DEFAULT_POINT_WITHOUT_DECAY_RATE));
        } else {                                // 7.5%
            return _initGuildMemberWeight(_guildMember); //.mul(DEFAULT_POINT_WITHOUT_DECAY_RATE - DECAY_POINT_DEFAULT)
                                    //.div(DEFAULT_POINT_WITHOUT_DECAY_RATE);
        }
    }

    function _updateTodayWeightByReaction(address _whitelistedNFT, uint256 _tokenId, address _tokenOwner) internal {
        uint256 _currentDay = getCurrentDay();


        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        console.log("update today weight by reactions %s", token.dailyWeight[_currentDay]);
        token.dailyWeight[_currentDay] = _calcTokenWeight(_whitelistedNFT, _tokenId);
        console.log("update today weight by reactions 2 %s", token.dailyWeight[_currentDay]);
        console.log("the last weight was %s", token.lastWeight);
        token.lastUpdateDay = _currentDay;

        // Owner
        OwnerWeight storage owner = ownerWeight[_tokenOwner];
        // This means that they provided a reaction
        owner.totalWhitelistedNFTAppraisals = owner.totalWhitelistedNFTAppraisals.add(1);
        owner.dailyWeight[_currentDay] = owner.dailyWeight[_currentDay]
                                                                    .add(token.dailyWeight[_currentDay]).sub(token.lastWeight);

        console.log("nnew daily is", owner.dailyWeight[_currentDay]);
        totalWhitelistedNFTTokenWeight = totalWhitelistedNFTTokenWeight.sub(owner.lastWeight)
                                        .add(owner.dailyWeight[_currentDay]);

        console.log("nnew whitelisted Total is", totalWhitelistedNFTTokenWeight);
        token.lastWeight = token.dailyWeight[_currentDay];
        owner.lastWeight = owner.dailyWeight[_currentDay];
        owner.lastUpdateDay = _currentDay;


        AppraiserStats storage appraiser = appraiserStats[_msgSender()];
        if(!appraiser.hasAppraisedWhitelistedNFTBefore[_whitelistedNFT][_tokenId]){
            appraiser.hasAppraisedWhitelistedNFTBefore[_whitelistedNFT][_tokenId] = true;
            appraiser.uniqueWhitelistedNFTsAppraised = appraiser.uniqueWhitelistedNFTsAppraised.add(1);
        }

     //   updateWhitelistedNFTOwnerWeight(whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId]);

        lastUpdateDay = _currentDay;
    }

    function _updateTodayGuildMemberWeightByReaction(address _guildMember) internal {
        uint256 _currentDay = getCurrentDay();

        TokenWeight storage _guildMemberWeight = guildMemberWeight[_guildMember];

        _guildMemberWeight.dailyWeight[_currentDay] = _calcGuildMemberWeight(_guildMember);
        _guildMemberWeight.lastUpdateDay = _currentDay;

        // Owner
        OwnerWeight storage owner = ownerWeight[_guildMember];

        owner.dailyGuildMemberWeight[_currentDay] = owner.dailyGuildMemberWeight[_currentDay].sub(owner.lastGuildMemberWeight)
                                                                    .add(_guildMemberWeight.dailyWeight[_currentDay]);

        totalGuildWeight = totalGuildWeight.sub(owner.lastGuildMemberWeight)
                                        .add(owner.dailyGuildMemberWeight[_currentDay]);

        _guildMemberWeight.lastWeight = _guildMemberWeight.dailyWeight[_currentDay];
        owner.lastGuildMemberWeight = owner.dailyGuildMemberWeight[_currentDay];
        owner.lastGuildMemberUpdateDay = _currentDay;

   //     updateOwnerWeight(_guildMember);

        lastGuildMemberUpdateDay = _currentDay;
    }

    function favorite(address[] memory _whitelistedNFTs, uint256[] memory _tokenIds) external {
        require(canAppraise(_msgSender()), "GuildNFTStakingWeightV2.favorite: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();

        AppraiserStats storage appraiser = appraiserStats[_msgSender()];

        require(_whitelistedNFTs.length == _tokenIds.length, "Must be equal quantity of whitelisted and token ids");
        for (uint256 i = 0; i < _whitelistedNFTs.length; i++) {

            console.log("update today weight by reactions %s", _whitelistedNFTs[i]);

            require(
                appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].favoriteCount == 0,
                "WeightingContract.favorite: Members can favorite an NFT once per day."
            );

            // Appraiser
            appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].favoriteCount = 1;

            // Token
            TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFTs[i]][_tokenIds[i]];
            token.dailyTokenReaction[_currentDay].favoriteCount = token.dailyTokenReaction[_currentDay].favoriteCount.add(1);

            _updateTodayWeightByReaction(_whitelistedNFTs[i], _tokenIds[i], whitelistedNFTTokenOwner[_whitelistedNFTs[i]][_tokenIds[i]]);
        }
    }

    function follow(address[] memory _whitelistedNFTs, uint256[] memory _tokenIds) external {
        require(canAppraise(_msgSender()), "GuildNFTStakingWeightV2.follow: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();

        AppraiserStats storage appraiser = appraiserStats[_msgSender()];
        require(_whitelistedNFTs.length == _tokenIds.length, "Must be equal quantity of whitelisted and token ids");
        for (uint256 i = 0; i < _whitelistedNFTs.length; i++) {
            require(
                appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].followCount == 0,
                "WeightingContract.follow: Members can follow an NFT once per day."
            );

            // Appraiser
            appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].followCount = 1;

            // Token
            TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFTs[i]][_tokenIds[i]];
            token.dailyTokenReaction[_currentDay].followCount = token.dailyTokenReaction[_currentDay].followCount.add(1);

            _updateTodayWeightByReaction(_whitelistedNFTs[i], _tokenIds[i], whitelistedNFTTokenOwner[_whitelistedNFTs[i]][_tokenIds[i]]);
        }
    }

    function share(address[] memory _whitelistedNFTs, uint256[] memory _tokenIds) external {
        require(canAppraise(_msgSender()), "GuildNFTStakingWeightV2.share: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();

        AppraiserStats storage appraiser = appraiserStats[_msgSender()];
        require(_whitelistedNFTs.length == _tokenIds.length, "Must be equal quantity of whitelisted and token ids");
        for (uint256 i = 0; i < _whitelistedNFTs.length; i++) {
            require(
                appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].shareCount == 0,
                "WeightingContract.share: Members can share an NFT once per day."
            );

            // Appraiser
            appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].shareCount = 1;

            // Token
            TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFTs[i]][_tokenIds[i]];
            token.dailyTokenReaction[_currentDay].shareCount = token.dailyTokenReaction[_currentDay].shareCount.add(1);

            _updateTodayWeightByReaction(_whitelistedNFTs[i], _tokenIds[i], whitelistedNFTTokenOwner[_whitelistedNFTs[i]][_tokenIds[i]]);
        }
    }

    function metaverse(address[] memory _whitelistedNFTs, uint256[] memory _tokenIds) external {
        require(canAppraise(_msgSender()), "GuildNFTStakingWeightV2.metaverse: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();

        AppraiserStats storage appraiser = appraiserStats[_msgSender()];
        require(_whitelistedNFTs.length == _tokenIds.length, "Must be equal quantity of whitelisted and token ids");
        for (uint256 i = 0; i < _whitelistedNFTs.length; i++) {
            require(
                appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].metaverseCount == 0,
                "WeightingContract.metaverse: Members can do this an NFT once per day."
            );

            // Appraiser
            appraiser.dailyTokenReaction[_currentDay][_whitelistedNFTs[i]][_tokenIds[i]].metaverseCount = 1;

            // Token
            TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFTs[i]][_tokenIds[i]];
            token.dailyTokenReaction[_currentDay].metaverseCount = token.dailyTokenReaction[_currentDay].metaverseCount.add(1);

            _updateTodayWeightByReaction(_whitelistedNFTs[i], _tokenIds[i], whitelistedNFTTokenOwner[_whitelistedNFTs[i]][_tokenIds[i]]);
        }
    }


    function appraiseWhitelistedNFT( address[] memory _whitelistedNFTs, uint256[] memory _tokenIds, string[] memory _reactions) external {
        require(canAppraise(_msgSender()), "GuildNFTStakingWeightV2.appraise: Sender must stake PODE");


        uint256 _currentDay = getCurrentDay();
        AppraiserStats storage appraiser = appraiserStats[_msgSender()];

        require(_whitelistedNFTs.length == _tokenIds.length, "Must be equal quantity of whitelisted and token ids");
        require(_whitelistedNFTs.length == _reactions.length, "Must be equal quantity of whitelisted and token ids");
        uint256 _totalSupply = guildNativeERC20Token.totalSupply();
        uint256 erc20Balance = guildNativeERC20Token.balanceOf(_msgSender());
        uint256 _clapLimit = _getMappingValue(_totalSupply, erc20Balance, clapMapping);
        for (uint256 i = 0; i < _whitelistedNFTs.length; i++) {

            require(
                appraiser.dailyReactionCount[_currentDay] < _clapLimit,
                "WeightingContract.appraise: Limit appraisal count per day"
            );

            // AppraiserStats
            appraiser.dailyReactionCount[_currentDay] = appraiser.dailyReactionCount[_currentDay] + 1;
            appraiser.totalReactionCount = appraiser.totalReactionCount + 1;

            // Token
            TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFTs[i]][_tokenIds[i]];
            token.dailyTokenReaction[_currentDay].appraisalCount[_reactions[i]] = token.dailyTokenReaction[_currentDay].appraisalCount[_reactions[i]].add(1);

            _updateTodayWeightByReaction(_whitelistedNFTs[i], _tokenIds[i], whitelistedNFTTokenOwner[_whitelistedNFTs[i]][_tokenIds[i]]);
        }
    }


    function clapWhitelistedNFT( address[] memory _whitelistedNFTs, uint256[] memory _tokenIds, uint256[] memory _clapQuantity) external {
        require(canAppraise(_msgSender()), "GuildNFTStakingWeightV2.clapWhitelistedNFT: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();
        AppraiserStats storage appraiser = appraiserStats[_msgSender()];

        require(_whitelistedNFTs.length == _tokenIds.length, "Must be equal quantity of whitelisted and token ids");
        uint256 _totalSupply = guildNativeERC20Token.totalSupply();
        uint256 erc20Balance = guildNativeERC20Token.balanceOf(_msgSender());
        uint256 _clapLimit = _getMappingValue(_totalSupply, erc20Balance, clapMapping);
        for (uint256 i = 0; i < _whitelistedNFTs.length; i++) {

            require(
                appraiser.dailyClapCount[_currentDay].add(_clapQuantity[i]) <= _clapLimit,
                "WeightingContract.clapWhitelistedNFT: Limit appraisal count per day"
            );

            // AppraiserStats
            appraiser.dailyClapCount[_currentDay] = appraiser.dailyClapCount[_currentDay] + _clapQuantity[i];
            appraiser.totalClapCount = appraiser.totalClapCount + _clapQuantity[i];

            // Token
            TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFTs[i]][_tokenIds[i]];
            token.dailyTokenReaction[_currentDay].clapCount = token.dailyTokenReaction[_currentDay].clapCount.add(_clapQuantity[i]);

            _updateTodayWeightByReaction(_whitelistedNFTs[i], _tokenIds[i], whitelistedNFTTokenOwner[_whitelistedNFTs[i]][_tokenIds[i]]);

        }
    }

    function appraiseGuildMember(address[] memory _guildMembers, string[] memory _reactions) external {
        require(canAppraise(_msgSender()), "GuildNFTStakingWeightV2.appraise: Sender must stake PODE");

        uint256 _currentDay = getCurrentDay();
        AppraiserStats storage appraiser = appraiserStats[_msgSender()];

        uint256 _totalSupply = guildNativeERC20Token.totalSupply();
        uint256 erc20Balance = guildNativeERC20Token.balanceOf(_msgSender());
        uint256 _clapLimit = _getMappingValue(_totalSupply, erc20Balance, clapMapping);
        require(_guildMembers.length == _reactions.length, "Must be equal quantity of whitelisted and token ids");
        for (uint256 i = 0; i < _guildMembers.length; i++) {
            require(_msgSender() != _guildMembers[i], "GuildNFTStakingWeightV2.appraiseGuildMember: Appraiser cannot appraise themselves");
            require(_balanceOf(_guildMembers[i]) > 0, "GuildNFTStakingWeightV2.appraiseGuildMember: Appraiser cannot appraise non-pode stakers");

            require(
                appraiser.dailyGuildMemberReactionCount[_currentDay] < _clapLimit,
                "WeightingContract.appraiseGuildMember: Limit appraisal count per day"
            );
            require(
                appraiser.dailyGuildMemberAppraisalReactionCount[_currentDay][_guildMembers[i]] == 0,
                "WeightingContract.appraiseGuildMember: Reached Limit appraisal per appraisers per day"
            );

            // AppraiserStats
            appraiser.dailyGuildMemberReactionCount[_currentDay] = appraiser.dailyGuildMemberReactionCount[_currentDay] + 1;
            appraiser.totalGuildMemberReactionCount = appraiser.totalGuildMemberReactionCount + 1;
            appraiser.dailyGuildMemberAppraisalReactionCount[_currentDay][_guildMembers[i]] = appraiser.dailyGuildMemberAppraisalReactionCount[_currentDay][_guildMembers[i]] + 1;

            // Token
            TokenWeight storage _guildMemberWeight = guildMemberWeight[_guildMembers[i]];
            _guildMemberWeight.dailyTokenReaction[_currentDay].appraisalCount[_reactions[i]] = _guildMemberWeight.dailyTokenReaction[_currentDay].appraisalCount[_reactions[i]].add(1);

            _updateTodayGuildMemberWeightByReaction(_guildMembers[i]);
        }
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
         token.lastWeight = stakeWeight;
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
         totalGuildWeight = totalGuildWeight.add(token.lastWeight);

         owner.dailyGuildMemberWeight[_currentDay] =owner.dailyGuildMemberWeight[_currentDay].add(token.lastWeight);
         owner.lastGuildMemberWeight = owner.lastGuildMemberWeight.add(token.lastWeight);

         updateOwnerWeight(_tokenOwner);
         lastGuildMemberUpdateDay = _currentDay;
         owner.lastGuildMemberUpdateDay = _currentDay;
         emit StakedMembershipToken(_tokenOwner, _tokenId);
    }

    function stake(uint256 _tokenId, address _tokenOwner, uint256 _primarySalePrice) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");
        require(tokenOwner[_tokenId] == address(0) || tokenOwner[_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

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
        totalGuildWeight = totalGuildWeight.add(token.lastWeight);

        owner.dailyGuildMemberWeight[_currentDay] =owner.dailyGuildMemberWeight[_currentDay].add(token.lastWeight);
        owner.lastGuildMemberWeight = owner.lastGuildMemberWeight.add(token.lastWeight);

        updateOwnerWeight(_tokenOwner);

        owner.lastGuildMemberUpdateDay = _currentDay;
        lastGuildMemberUpdateDay = _currentDay;
        emit StakedMembershipToken(_tokenOwner, _tokenId);
    }

    function unstake(uint256 _tokenId, address _tokenOwner) external {
        require(_msgSender() == stakingContract, "Sender must be staking contract");
        require(tokenOwner[_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

       // TokenWeight storage token = tokenWeight[_tokenId];
        OwnerWeight storage owner = ownerWeight[_tokenOwner];


        owner.stakedNFTCount = owner.stakedNFTCount.sub(1);

        stakedNFTCount = stakedNFTCount.sub(1);

        // need appraiser rewards logic here if there is staked erc20 tokens
        // need appraiser rewards logic here if there is staked erc20 tokens

        TokenWeight storage token = podeTokenWeight[_tokenId];

        uint256 newWeight = owner.lastGuildMemberWeight.div(owner.stakedNFTCount.add(1));

//        if(newWeight<= totalGuildWeight){
//            totalGuildWeight = totalGuildWeight.sub(newWeight);
//        }
        owner.lastGuildMemberWeight = owner.lastGuildMemberWeight.sub(newWeight);

        updateOwnerWeight(_tokenOwner);
        owner.lastGuildMemberUpdateDay = _currentDay;
        lastGuildMemberUpdateDay = _currentDay;
        if (stakedNFTCount == 0) {
            totalGuildWeight = 0;
        }
        if (owner.stakedNFTCount == 0) {
            delete ownerWeight[_tokenOwner];
        }

        // TODO figure out if logic like this is needed.
        // owner.dailyGuildMemberWeight[_currentDay] = owner.dailyGuildMemberWeight[_currentDay].sub(newWeight);

        token.lastWeight = newWeight;

        TokenWeight storage guildMember = guildMemberWeight[_tokenOwner];

        guildMember.dailyWeight[_currentDay] = owner.dailyGuildMemberWeight[_currentDay];
        guildMember.lastWeight = owner.lastGuildMemberWeight;


        // delete podeTokenWeight[_tokenId]; // TODO look at this dont think its right action
        delete tokenOwner[_tokenId];

        // totalGuildWeight = totalGuildWeight.sub(token.lastWeight);

        emit UnstakedMembershipToken(_tokenOwner, _tokenId);
    }

    function stakeWhitelistedNFT(address _whitelistedNFT, uint256 _tokenId, address _tokenOwner) external {
        require(_msgSender() == whitelistedStakingContract, "Sender must be staking contract");
        require(whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId] == address(0) || whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

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

      //  updateOwnerWeight(_tokenOwner);

        owner.stakedWhitelistedNFTCount = owner.stakedWhitelistedNFTCount.add(1);
        owner.lastWeight = owner.lastWeight.add(token.lastWeight);

        // GuildWeight
        updateWeight();

        stakedWhitelistedNFTCount = stakedWhitelistedNFTCount.add(1);
        totalWhitelistedNFTTokenWeight = totalWhitelistedNFTTokenWeight.add(token.lastWeight);

        updateWhitelistedNFTOwnerWeight(_tokenOwner);
        owner.lastUpdateDay = _currentDay;
        lastUpdateDay = _currentDay;

        emit StakedWhitelistedNFTToken(_tokenOwner, _whitelistedNFT, _tokenId);
    }

    function unstakeWhitelistedNFT(address _whitelistedNFT,uint256 _tokenId, address _tokenOwner) external {
        require(_msgSender() == whitelistedStakingContract, "Sender must be staking contract");
        require(whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId] == _tokenOwner);

        uint256 _currentDay = getCurrentDay();

        TokenWeight storage token = whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId];
        OwnerWeight storage owner = ownerWeight[_tokenOwner];

      //  updateOwnerWeight(_tokenOwner);

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

        token.lastWeight = owner.lastWeight;

        token.dailyWeight[_currentDay] = owner.dailyWeight[_currentDay];

        updateWhitelistedNFTOwnerWeight(_tokenOwner);

        owner.lastUpdateDay = _currentDay;
        lastUpdateDay = _currentDay;

    //    delete whitelistedNFTTokenWeight[_whitelistedNFT][_tokenId]; // TODO Is this ok?
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
