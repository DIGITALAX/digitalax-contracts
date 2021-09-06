pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../EIP2771/BaseRelayRecipient.sol";
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

abstract contract GuildNFTStakingWeightV2Structs is BaseRelayRecipient{
    using SafeMath for uint256;

    bool initialised;
    // Important contract addresses we need to set
    DigitalaxAccessControls public accessControls;
    address weightContract;

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

    mapping (address => mapping(uint256 => TokenWeight)) public whitelistedNFTTokenWeight;
    mapping(uint256 => TokenWeight) public podeTokenWeight;
    mapping(address => TokenWeight) public guildMemberWeight;
    mapping (address => OwnerWeight) public ownerWeight;
    mapping (address => AppraiserStats) public appraiserStats;


    constructor() public {

    }

    function init(address _weightContract, DigitalaxAccessControls _accessControls, IGuildNFTStakingWeightStorage _store) external {
        require(!initialised, "Already initialised");

        accessControls = _accessControls;
        weightContract = _weightContract;

        initialised = true;
    }

    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "GuildNFTStaking.updateAccessControls: Sender must be admin"
        );
        require(address(_accessControls) != address(0), "GuildNFTStakingWeightV2.updateAccessControls: Zero Address");
        accessControls = _accessControls;
    }

    function _msgSender() internal view returns (address payable sender) {
        return BaseRelayRecipient.msgSender();
    }
}
