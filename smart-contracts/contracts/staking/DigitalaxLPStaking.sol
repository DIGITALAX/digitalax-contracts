// SPDX-License-Identifier: GPLv2

pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Utils/UniswapV2Library.sol";
import "../interfaces/IWETH9.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IDigitalaxRewards.sol";

/**
 * @title Digitalax Staking
 * @dev Stake MONA LP tokens, earn MONA on the Digitialax platform
 * @author Adrian Guerrera (deepyr)
 * @author DIGITALAX CORE TEAM
 */


contract DigitalaxLPStaking  {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public rewardsToken;
    address public lpToken; // Pool tokens for MONA/WETH pair
    IWETH public WETH;

    DigitalaxAccessControls public accessControls;
    IDigitalaxRewards public rewardsContract;

    uint256 public stakedLPTotal;
    uint256 public lastUpdateTime;
    uint256 public rewardsPerTokenPoints;
    uint256 public totalUnclaimedRewards;

    uint256 constant pointMultiplier = 10e32;

    /**
    @notice Struct to track what user is staking which tokens
    @dev balance is the current ether balance of the staker
    @dev balance is the current rewards point snapshot
    @dev rewardsEarned is the total reward for the staker till now
    @dev rewardsReleased is how much reward has been paid to the staker
    */
    struct Staker {
        uint256 balance;
        uint256 lastRewardPoints;
        uint256 rewardsEarned;
        uint256 rewardsReleased;
    }

    /// @notice mapping of a staker to its current properties
    mapping (address => Staker) public stakers;

    // Mapping from token ID to owner address
    mapping (uint256 => address) public tokenOwner;

    /// @notice sets the token to be claimable or not, cannot claim if it set to false
    bool public tokensClaimable;
    bool private initialised;

    /// @notice event emitted when a user has staked a token
    event Staked(address indexed owner, uint256 amount);

    /// @notice event emitted when a user has unstaked a token
    event Unstaked(address indexed owner, uint256 amount);

    /// @notice event emitted when a user claims reward
    event RewardPaid(address indexed user, uint256 reward);
    
    event ClaimableStatusUpdated(bool status);
    event EmergencyUnstake(address indexed user, uint256 amount);
    event RewardsTokenUpdated(address indexed oldRewardsToken, address newRewardsToken );
    event LpTokenUpdated(address indexed oldLpToken, address newLpToken );

    constructor() public {
    }

     /**
     * @dev Single gateway to intialize the staking contract after deploying
     * @dev Sets the contract with the MONA/WETH LP pair and MONA token 
     */
    function initLPStaking(
        IERC20 _rewardsToken,
        address _lpToken,
        IWETH _WETH,
        DigitalaxAccessControls _accessControls
    )
        public
    {
        require(!initialised, "Already initialised");
        rewardsToken = _rewardsToken;
        lpToken = _lpToken;
        WETH = _WETH;
        accessControls = _accessControls;
        lastUpdateTime = block.timestamp;
        initialised = true;
    }

    receive() external payable {
        if(msg.sender != address(WETH)){
            zapEth();
        }
    }

    /// @notice Wrapper function zapEth() for UI 
    function zapEth() 
        public 
        payable
    {
        uint256 startBal = IERC20(lpToken).balanceOf(address(this));
        addLiquidityETHOnly(address(this));
        uint256 endBal = IERC20(lpToken).balanceOf(address(this));

        require(
            endBal > startBal ,
            "DigitalaxLPStaking.zapEth: Zap amount must be greater than 0"
        );
        uint256 amount = endBal.sub(startBal);

        Staker storage staker = stakers[msg.sender];
        if (staker.balance == 0 && staker.lastRewardPoints == 0 ) {
          staker.lastRewardPoints = rewardsPerTokenPoints;
        }

        updateReward(msg.sender);
        staker.balance = staker.balance.add(amount);
        stakedLPTotal = stakedLPTotal.add(amount);
        emit Staked(msg.sender, amount);
    }

    /// @notice Lets admin set the Rewards Token
    function setRewardsContract(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxLPStaking.setRewardsContract: Sender must be admin"
        );
        require(_addr != address(0));
        address oldAddr = address(rewardsContract);
        rewardsContract = IDigitalaxRewards(_addr);
        emit RewardsTokenUpdated(oldAddr, _addr);
    }

    /// @notice Lets admin set the Uniswap LP Token
    function setLpToken(
        address _addr
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxLPStaking.setLpToken: Sender must be admin"
        );
        require(_addr != address(0));
        address oldAddr = lpToken;
        lpToken = _addr;
        emit LpTokenUpdated(oldAddr, _addr);
    }

    /// @notice Lets admin set when tokens are claimable
    function setTokensClaimable(
        bool _enabled
    )
        external
    {
        require(
            accessControls.hasAdminRole(msg.sender),
            "DigitalaxLPStaking.setTokensClaimable: Sender must be admin"
        );
        tokensClaimable = _enabled;
        emit ClaimableStatusUpdated(_enabled);
    }

    /// @notice Getter functions for Staking contract
    /// @dev Get the tokens staked by a user
    function getStakedBalance(
        address _user
    )
        external
        view
        returns (uint256 balance)
    {
        return stakers[_user].balance;
    }

    /// @dev Get the total ETH staked in Uniswap
    function stakedEthTotal()
        external
        view
        returns (uint256)
    {

        uint256 lpPerEth = getLPTokenPerEthUnit(1e18);
        return stakedLPTotal.mul(1e18).div(lpPerEth);
    }


    /// @notice Stake MONA LP Tokens and earn rewards.
    function stake(
        uint256 _amount
    )
        external
    {
        _stake(msg.sender, _amount);
    }

    /// @notice Stake MONA LP Tokens and earn rewards.
    function stakeAll()
        external
    {
        uint256 balance = IERC20(lpToken).balanceOf(msg.sender);
        _stake(msg.sender, balance);
    }

    /**
     * @dev All the staking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they stake the nfts based on ether price
    */
    function _stake(
        address _user,
        uint256 _amount
    )
        internal
    {
        require(
            _amount > 0 ,
            "DigitalaxLPStaking._stake: Staked amount must be greater than 0"
        );
        Staker storage staker = stakers[_user];

        if (staker.balance == 0 && staker.lastRewardPoints == 0 ) {
          staker.lastRewardPoints = rewardsPerTokenPoints;
        }

        updateReward(_user);
        staker.balance = staker.balance.add(_amount);
        stakedLPTotal = stakedLPTotal.add(_amount);
        IERC20(lpToken).safeTransferFrom(
            address(_user),
            address(this),
            _amount
        );
        emit Staked(_user, _amount);
    }

    /// @notice Unstake MONA LP Tokens. 
    function unstake(
        uint256 _amount
    ) 
        external 
    {
        _unstake(msg.sender, _amount);
    }

     /**
     * @dev All the unstaking goes through this function
     * @dev Rewards to be given out is calculated
     * @dev Balance of stakers are updated as they unstake the nfts based on ether price
    */
    function _unstake(
        address _user,
        uint256 _amount
    ) 
        internal 
    {

        require(
            stakers[_user].balance >= _amount,
            "DigitalaxLPStaking._unstake: Sender must have staked tokens"
        );
        claimReward(_user);
        Staker storage staker = stakers[_user];
        
        staker.balance = staker.balance.sub(_amount);
        stakedLPTotal = stakedLPTotal.sub(_amount);

        if (staker.balance == 0) {
            delete stakers[_user];
        }

        uint256 tokenBal = IERC20(lpToken).balanceOf(address(this));
        if (_amount > tokenBal) {
            IERC20(lpToken).safeTransfer(address(_user), tokenBal);
        } else {
            IERC20(lpToken).safeTransfer(address(_user), _amount);
        }
        emit Unstaked(_user, _amount);
    }

    /// @notice Unstake without caring about rewards. EMERGENCY ONLY.
    function emergencyUnstake() 
        external
    {
        uint256 amount = stakers[msg.sender].balance;
        stakers[msg.sender].balance = 0;
        stakers[msg.sender].rewardsEarned = 0;

        IERC20(lpToken).safeTransfer(address(msg.sender), amount);
        emit EmergencyUnstake(msg.sender, amount);
    }

    /// @dev Updates the amount of rewards owed for each user before any tokens are moved
    function updateReward(
        address _user
    ) 
        public 
    {

        rewardsContract.updateRewards();
        uint256 lpRewards = rewardsContract.LPRewards(lastUpdateTime,
                                                        block.timestamp);

        if (stakedLPTotal > 0) {
            rewardsPerTokenPoints = rewardsPerTokenPoints.add(lpRewards
                                                        .mul(1e18)
                                                        .mul(pointMultiplier)
                                                        .div(stakedLPTotal));
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


    /// @notice Returns the about of rewards yet to be claimed
    function unclaimedRewards(
        address _user
    )
        public
        view
        returns(uint256)
    {
        if (stakedLPTotal == 0) {
            return 0;
        }

        uint256 lpRewards = rewardsContract.LPRewards(lastUpdateTime,
                                                        block.timestamp);

        uint256 newRewardPerToken = rewardsPerTokenPoints.add(lpRewards
                                                                .mul(1e18)
                                                                .mul(pointMultiplier)
                                                                .div(stakedLPTotal))
                                                         .sub(stakers[_user].lastRewardPoints);

        uint256 rewards = stakers[_user].balance.mul(newRewardPerToken)
                                                .div(1e18)
                                                .div(pointMultiplier);
        return rewards.add(stakers[_user].rewardsEarned).sub(stakers[_user].rewardsReleased);
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
    }

    /* ========== Liquidity Zap ========== */
    //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    //
    // LiquidityZAP - UniswapZAP
    //   Copyright (c) 2020 deepyr.com
    //
    // UniswapZAP takes ETH and converts to a Uniswap liquidity tokens. 
    //
    // This program is free software: you can redistribute it and/or modify
    // it under the terms of the GNU General Public License as published by
    // the Free Software Foundation, either version 3 of the License
    //
    // This program is distributed in the hope that it will be useful,
    // but WITHOUT ANY WARRANTY; without even the implied warranty of
    // MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    // GNU General Public License for more details.
    //
    // You should have received a copy of the GNU General Public License
    // along with this program.  
    // If not, see <https://github.com/apguerrera/LiquidityZAP/>.
    //
    // The above copyright notice and this permission notice shall be included 
    // in all copies or substantial portions of the Software.
    //
    // Authors:
    // * Adrian Guerrera / Deepyr Pty Ltd
    // 
    // Attribution: CORE / cvault.finance
    //  https://github.com/cVault-finance/CORE-periphery/blob/master/contracts/COREv1Router.sol
    // ---------------------------------------------------------------------
    // SPDX-License-Identifier: GPL-3.0-or-later                        
    // ---------------------------------------------------------------------

    function addLiquidityETHOnly(address payable to) public payable {
        require(to != address(0), "Invalid address");

        uint256 buyAmount = msg.value.div(2);
        require(buyAmount > 0, "Insufficient ETH amount");
        WETH.deposit{value : msg.value}();

        (uint256 reserveWeth, uint256 reserveTokens) = getPairReserves();
        uint256 outTokens = UniswapV2Library.getAmountOut(buyAmount, reserveWeth, reserveTokens);
        
        WETH.transfer(lpToken, buyAmount);

        (address token0, address token1) = UniswapV2Library.sortTokens(address(WETH), address(rewardsToken));
        IUniswapV2Pair(lpToken).swap(address(rewardsToken) == token0 ? outTokens : 0, address(rewardsToken) == token1 ? outTokens : 0, address(this), "");

        _addLiquidity(outTokens, buyAmount, to);

    }

    function _addLiquidity(uint256 tokenAmount, uint256 wethAmount, address payable to) internal {
        (uint256 wethReserve, uint256 tokenReserve) = getPairReserves();

        uint256 optimalTokenAmount = UniswapV2Library.quote(wethAmount, wethReserve, tokenReserve);

        uint256 optimalWETHAmount;
        if (optimalTokenAmount > tokenAmount) {
            optimalWETHAmount = UniswapV2Library.quote(tokenAmount, tokenReserve, wethReserve);
            optimalTokenAmount = tokenAmount;
        }
        else
            optimalWETHAmount = wethAmount;

        assert(WETH.transfer(lpToken, optimalWETHAmount));
        assert(rewardsToken.transfer(lpToken, optimalTokenAmount));

        IUniswapV2Pair(lpToken).mint(to);
        
        //refund dust
        if (tokenAmount > optimalTokenAmount)
            rewardsToken.transfer(to, tokenAmount.sub(optimalTokenAmount));

        if (wethAmount > optimalWETHAmount) {
            uint256 withdrawAmount = wethAmount.sub(optimalWETHAmount);
            WETH.withdraw(withdrawAmount);
            to.transfer(withdrawAmount);
        }
    }


    function getLPTokenPerEthUnit(uint ethAmt) public view  returns (uint liquidity){
        (uint256 reserveWeth, uint256 reserveTokens) = getPairReserves();
        uint256 outTokens = UniswapV2Library.getAmountOut(ethAmt.div(2), reserveWeth, reserveTokens);
        uint _totalSupply =  IUniswapV2Pair(lpToken).totalSupply();

        (address token0, ) = UniswapV2Library.sortTokens(address(WETH), address(rewardsToken));
        (uint256 amount0, uint256 amount1) = token0 == address(rewardsToken) ? (outTokens, ethAmt.div(2)) : (ethAmt.div(2), outTokens);
        (uint256 _reserve0, uint256 _reserve1) = token0 == address(rewardsToken) ? (reserveTokens, reserveWeth) : (reserveWeth, reserveTokens);
        liquidity = min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
    }

    function getPairReserves() internal view returns (uint256 wethReserves, uint256 tokenReserves) {
        (address token0,) = UniswapV2Library.sortTokens(address(WETH), address(rewardsToken));
        (uint256 reserve0, uint reserve1,) = IUniswapV2Pair(lpToken).getReserves();
        (wethReserves, tokenReserves) = token0 == address(rewardsToken) ? (reserve1, reserve0) : (reserve0, reserve1);
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256 c) {
        c = a <= b ? a : b;
    }


}