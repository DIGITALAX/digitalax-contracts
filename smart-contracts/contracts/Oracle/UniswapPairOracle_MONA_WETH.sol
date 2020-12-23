pragma solidity 0.6.12;

import '../uniswapv2/UniswapOracleExample.sol';

contract UniswapPairOracle_MONA_WETH is UniswapOracleExample {
    constructor(address factory, address tokenA, address tokenB) 
    UniswapOracleExample(factory, tokenA, tokenB) 
    public {}
}