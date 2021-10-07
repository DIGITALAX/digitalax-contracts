// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IGuildNFTRewards.sol";
import "./interfaces/IGuildNFTRewardsWhitelisted.sol";
import "./interfaces/IGuildNFTStakingWeightWhitelisted.sol";
import "./interfaces/IGuildNFTStakingWeight.sol";
import "./GuildNFTStaking.sol";
import "./GuildWhitelistedNFTStaking.sol";

/**
 * @title Digitalax Staking
 * @dev Stake whitelisted nfts and stake membership guild tokens upon them
 * @author DLTA Team
 */

contract GuildNFTStakingCalculator {
    using SafeMath for uint256;
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    IERC20 public rewardsToken;

    bool initialised;
    IGuildNFTRewards public rewardsContract;
    IGuildNFTStakingWeight public weightContract;
    GuildNFTStaking public staking;
    GuildWhitelistedNFTStaking public whitelistedStaking;

     /**
     * @dev Single gateway to initialize the staking contract after deploying
     * @dev Sets the contract with the DECO NFT and DECO reward token
     */
    function initCalculator(
        IERC20 _rewardsToken,
        IGuildNFTStakingWeight _weightContract,
        GuildWhitelistedNFTStaking _whitelistedStaking,
        GuildNFTStaking _staking,
        IGuildNFTRewards _rewardsContract
    )
        external
    {
        require(!initialised, "Already initialised");
        rewardsToken = _rewardsToken;
        weightContract = _weightContract;
        whitelistedStaking = _whitelistedStaking;
        staking = _staking;
        rewardsContract = _rewardsContract;
        initialised = true;
    }

    /// @notice Returns the about of rewards yet to be claimed
    function unclaimedRewardsPode(address _user) external view returns(uint256) {
        if (staking.stakedEthTotal() == 0) {
            return 0;
        }

        uint256 _newRewards = rewardsContract.DecoRewards(staking.lastUpdateTime(), _getNow());
        uint256 _totalRoundRewards = staking.totalRoundRewards().add(_newRewards);

        uint256 _totalWeight = weightContract.calcNewWeight();

        if (_totalWeight == 0) {
            return 0;
        }

        uint256 _ownerWeight = weightContract.calcNewOwnerWeight(_user);
        uint256 _ownerTotalRewards = _totalRoundRewards.mul(_ownerWeight)
        .div(_totalWeight);

        uint256 _payableAmount = 0;

        (,,uint256 released) = staking.stakers(_user);
        if (_ownerTotalRewards > released) {
            _payableAmount = _ownerTotalRewards.sub(released);
        } else {
            return 0;
        }

        /// @dev accounts for dust
        uint256 rewardBal = rewardsToken.balanceOf(address(staking));
        if (_payableAmount > rewardBal) {
            _payableAmount = rewardBal;
        }

        return _payableAmount;
    }


    /// @notice Returns the about of rewards yet to be claimed
    function unclaimedRewardsWhitelistNFT(address _user) external view returns(uint256) {

        uint256 newRewards = IGuildNFTRewardsWhitelisted(address(rewardsContract)).WhitelistedNFTRewards(whitelistedStaking.lastUpdateTime(), _getNow());
        uint256 _totalRoundRewards = whitelistedStaking.totalRoundRewards().add(newRewards);

        uint256 _totalWeight = weightContract.calcNewTotalWhitelistedNFTWeight();

        if (_totalWeight == 0) {
            return 0;
        }

        uint256 _ownerWeight = weightContract.calcNewWhitelistedNFTOwnerWeight(_user);
        uint256 _ownerTotalRewards = _totalRoundRewards.mul(_ownerWeight)
        .div(_totalWeight);

        uint256 _payableAmount = 0;
        (,,uint256 released) = whitelistedStaking.stakers(_user);
        if (_ownerTotalRewards > released) {
            _payableAmount = _ownerTotalRewards.sub(released);
        } else {
            return 0;
        }

        /// @dev accounts for dust
        uint256 rewardBal = rewardsToken.balanceOf(address(whitelistedStaking));
        if (_payableAmount > rewardBal) {
            _payableAmount = rewardBal;
        }

        return _payableAmount;
    }

    function _getNow() internal virtual view returns (uint256) {
        return block.timestamp;
    }
}
