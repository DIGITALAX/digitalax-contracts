pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../DigitalaxAccessControls.sol";
//import "./interfaces/IGuildNFTStakingWeight.sol";
//import "./interfaces/IGuildNFTStakingWeightWhitelisted.sol";

import "@nomiclabs/buidler/console.sol";
import "./interfaces/IGuildNFTStakingWeightStorage.sol";

import "../EIP2771/BaseRelayRecipient.sol";
/**
 * @title Digitalax Guild NFT Staking Weight
 * @dev Calculates the weight for staking on the PODE system
 * @author DIGITALAX CORE TEAM
 * @author
 */

abstract contract GuildNFTStakingWeightV2Storage is IGuildNFTStakingWeightStorage, BaseRelayRecipient {
    using SafeMath for uint256;

    bool initialised;
    uint256 constant MULTIPLIER = 100000;
    // Important contract addresses we need to set
    DigitalaxAccessControls public accessControls;
    address weightContract;

    struct PercentageMapping {
        uint256 percentage;
        uint256 mapValue;
    }

    struct AppraisedBonusMapping {
        uint256 numberAppraised;
        uint256 bonus;
    }

    // Constants

    uint256 DECAY_POINT_DEFAULT = 75; // 7.5%
    uint256 DECAY_POINT_WITH_APPRAISAL = 25; // 2.5%

    // Overall variables
    uint256 startTime;
    uint256 stakedNFTCount;
    uint256 stakedWhitelistedNFTCount;
    uint256 totalWhitelistedNFTTokenWeight;
    uint256 totalGuildWeight;

    uint256 lastUpdateDay;
    uint256 lastGuildMemberUpdateDay;

    // Struct Arrays
    PercentageMapping[9] clapMapping;
    PercentageMapping[9] decoBonusMapping;
    AppraisedBonusMapping[13] appraisalBonusMapping;

    // Mappings
    mapping (string => uint256) reactionPoint;
    mapping (uint256 => address) tokenOwner;
    mapping (address => mapping(uint256 => address)) whitelistedNFTTokenOwner;

    mapping (uint256 => uint256) dailyWeight;

    constructor() public {
        startTime = _getNow();
        reactionPoint["Self"] = 1;
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

    modifier onlyWeightContract() {
        require(
            _msgSender() == weightContract,
            "GuildNFTStakingWeightV2Storage.onlyWeightContract: caller is not the weight contract"
        );
        _;
    }

    function init(address _weightContract, DigitalaxAccessControls _accessControls) external {
        require(!initialised, "Already initialised");

        accessControls = _accessControls;
        weightContract = _weightContract;

        initialised = true;
    }

    function setClapsMappingValue(uint256[] memory percentage, uint256[] memory mappingValue) external {
        require(percentage.length == 9, "GuildNFTStakingWeightV2.setClapsMappingValue: Must set all mapping values");
        require(percentage.length == mappingValue.length,  "GuildNFTStakingWeightV2.setClapsMappingValue: Arrays must be same length");
        for(uint256 i =0; i<9; i++){
            if(i > 0){
                require(percentage[i] > percentage[i.sub(1)], "GuildNFTStakingWeightV2.setClapsMappingValue: Must have increasing percentage");
                require(mappingValue[i] > mappingValue[i.sub(1)], "GuildNFTStakingWeightV2.setClapsMappingValue: Must have increasing mapValue");
            }
            clapMapping[i].percentage = percentage[i];
            clapMapping[i].mapValue = mappingValue[i];
        }
    }

    function getClapsMappingValues() external view returns (uint256[9] memory percentage, uint256[9] memory mapValue){
        for(uint256 i =0; i<9; i++){
            percentage[i] = clapMapping[i].percentage;
            mapValue[i] = clapMapping[i].mapValue;
        }
        return (percentage, mapValue);
    }

    function setDecoBonusValue(uint256[] memory percentage, uint256[] memory mappingValue) external {
        require(percentage.length == 9, "GuildNFTStakingWeightV2.setDecoBonusValue: Must set all mapping values");
        require(percentage.length == mappingValue.length,  "GuildNFTStakingWeightV2.setDecoBonusValue: Arrays must be same length");
        for(uint256 i =0; i<9; i++){
            if(i > 0){
                require(percentage[i] > percentage[i.sub(1)], "GuildNFTStakingWeightV2.setDecoBonusValue: Must have increasing percentage");
                require(mappingValue[i] > mappingValue[i.sub(1)], "GuildNFTStakingWeightV2.setDecoBonusValue: Must have increasing mapValue");
            }
            decoBonusMapping[i].percentage = percentage[i];
            decoBonusMapping[i].mapValue = mappingValue[i];
        }
    }

    function getDecoBonusMappingValues() external view returns (uint256[9] memory percentage, uint256[9] memory mapValue){
        for(uint256 i =0; i<9; i++){
            percentage[i] = decoBonusMapping[i].percentage;
            mapValue[i] = decoBonusMapping[i].mapValue;
        }
        return (percentage, mapValue);
    }

    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStaking.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "GuildNFTStakingWeightV2.updateAccessControls: Zero Address");
        accessControls = _accessControls;
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

    function getClapMappingValue(uint256 _totalSupply, uint256 _balance) external override view returns (uint256) {
        return _getMappingValue(_totalSupply, _balance, clapMapping);
    }

    function getDecoBonusMappingValue(uint256 _totalSupply, uint256 _balance) external override view returns (uint256) {
        return _getMappingValue(_totalSupply, _balance, decoBonusMapping);
    }

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

    function getAppraisedBonusMappingValue(uint256 _totalAppraised) external override view returns (uint256) {
        AppraisedBonusMapping[13] storage _mapping = appraisalBonusMapping;
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


    //    // Overall variables
    function setStartTime(uint256 _startTime) external returns (uint256){
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStaking.updateAccessControls: Sender must be admin"
        );
        startTime = _startTime;
        return startTime;
    }

    function setStakedNFTCount(uint256 _stakedNFTCount) onlyWeightContract external override returns (uint256){
        stakedNFTCount = _stakedNFTCount;
        return stakedNFTCount;
    }

    function setStakedWhitelistedNFTCount(uint256 _stakedWhitelistedNFTCount) onlyWeightContract external override returns (uint256){
        stakedWhitelistedNFTCount = _stakedWhitelistedNFTCount;
        return stakedWhitelistedNFTCount;
    }


    function setTotalWhitelistedNFTTokenWeight(uint256 _totalWhitelistedNFTTokenWeight) onlyWeightContract external override returns (uint256){
        totalWhitelistedNFTTokenWeight = _totalWhitelistedNFTTokenWeight;
        return totalWhitelistedNFTTokenWeight;
    }


    function setTotalGuildWeight(uint256 _totalGuildWeight) onlyWeightContract external override returns (uint256){
        totalGuildWeight = _totalGuildWeight;
        return totalGuildWeight;
    }

    function setLastUpdateDay(uint256 _lastUpdateDay) external returns (uint256){
        require(
        accessControls.hasAdminRole(_msgSender()),
        "GuildNFTStaking.setLastUpdateDay: Sender must be admin"
        );
        lastUpdateDay = _lastUpdateDay;
        return lastUpdateDay;
    }

    function setLastGuildMemberUpdateDay(uint256 _lastGuildMemberUpdateDay) external returns (uint256){
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStaking.setLastGuildMemberUpdateDay: Sender must be admin"
        );
        lastGuildMemberUpdateDay = _lastGuildMemberUpdateDay;
        return lastGuildMemberUpdateDay;
    }


    //    // Mappings
    function updateReactionPoint(string memory _reaction, uint256 _point) external returns(uint256) {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStakingWeightV2.updateReactionPoint: Sender must be admin"
        );

        reactionPoint[_reaction] = _point;
        return reactionPoint[_reaction];
    }

    function setTokenOwner(uint256 _tokenId, address _owner) onlyWeightContract external override returns (address){
        tokenOwner[_tokenId] = _owner;
        return tokenOwner[_tokenId];
    }

    function setWhitelistedNFTTokenOwner(address _whitelistedNFT, uint256 _tokenId, address _whitelistedNFTTokenOwner) onlyWeightContract external override returns (address){
        whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId] = _whitelistedNFTTokenOwner;
        return whitelistedNFTTokenOwner[_whitelistedNFT][_tokenId];
    }

    function setDailyWeight(uint256 _day, uint256 _dailyWeight) onlyWeightContract external override returns (uint256){
        dailyWeight[_day] = _dailyWeight;
        return dailyWeight[_day];
    }

    function _msgSender() internal view returns (address payable sender) {
        return BaseRelayRecipient.msgSender();
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}
