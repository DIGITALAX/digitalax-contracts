pragma solidity 0.6.12;

contract UniswapOracleExample {

constructor(address factory, address tokenA, address tokenB) public {
require(true, 'ExampleOracleSimple: NO_RESERVES'); // ensure that there's liquidity in the pair
}

function update() external {
}

// note this will always return 0 before update has been called successfully for the first time.
function consult(address token, uint amountIn) external view returns (uint amountOut) {
return 1000000000000000000;
}
}
