pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "../DigitalaxAccessControls.sol";
import "../EIP712/NativeMetaTransaction.sol";

// SPDX-License-Identifier: GPLv2
contract MONA is Context, IERC20, NativeMetaTransaction  {
    using SafeMath for uint;

    string _symbol;
    string  _name;
    uint8 _decimals;
    uint _totalSupply;
    mapping(address => uint) balances;

    mapping(address => mapping(address => uint)) allowed;
    uint public cap;
    bool public freezeCap;

    DigitalaxAccessControls public accessControls;

    event CapUpdated(uint256 cap, bool freezeCap);

    event Deposit(
        address indexed token,
        address indexed from,
        uint256 amount,
        uint256 input1,
        uint256 output1
    );

    event Withdraw(
        address indexed token,
        address indexed from,
        uint256 amount,
        uint256 input1,
        uint256 output1
    );

    address public childChain;

    modifier onlyChildChain() {
        require(
            msg.sender == childChain,
            "Child token: caller is not the child chain contract"
        );
        _;
    }


    constructor(
        string memory symbol_,
        string memory name_,
        uint8 decimals_,
        DigitalaxAccessControls accessControls_,
        address tokenOwner,
        uint256 initialSupply,
        address childChain_
    ) 
        public 
    {
        _symbol = symbol_;
        _name = name_;
        _decimals = decimals_;
        accessControls = accessControls_;
        balances[tokenOwner] = initialSupply;
        _totalSupply = initialSupply;
        childChain = childChain_;
        emit Transfer(address(0), tokenOwner, _totalSupply);
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }
    function name() external view returns (string memory) {
        return _name;
    }
    function decimals() external view returns (uint8) {
        return _decimals;
    }
    function totalSupply() override external view returns (uint) {
        return _totalSupply.sub(balances[address(0)]);
    }
    function balanceOf(address tokenOwner) override public view returns (uint balance) {
        return balances[tokenOwner];
    }
    function transfer(address to, uint tokens) override external returns (bool success) {
        balances[_msgSender()] = balances[_msgSender()].sub(tokens);
        balances[to] = balances[to].add(tokens);
        emit Transfer(_msgSender(), to, tokens);
        return true;
    }
    function approve(address spender, uint tokens) override external returns (bool success) {
        allowed[_msgSender()][spender] = tokens;
        emit Approval(_msgSender(), spender, tokens);
        return true;
    }
    function transferFrom(address from, address to, uint tokens) override external returns (bool success) {
        balances[from] = balances[from].sub(tokens);
        allowed[from][_msgSender()] = allowed[from][_msgSender()].sub(tokens);
        balances[to] = balances[to].add(tokens);
        emit Transfer(from, to, tokens);
        return true;
    }
    function allowance(address tokenOwner, address spender) override external view returns (uint remaining) {
        return allowed[tokenOwner][spender];
    }

    function setCap(uint _cap, bool _freezeCap) external  {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "MONA.setCap: Sender must be admin"
        );
        require(_freezeCap || _cap >= _totalSupply, "Cap less than totalSupply");
        require(!freezeCap, "Cap frozen");
        (cap, freezeCap) = (_cap, _freezeCap);
        emit CapUpdated(cap, freezeCap);
    }

    function availableToMint() external view returns (uint tokens) {
        if (accessControls.hasMinterRole(_msgSender())) {
            if (cap > 0) {
                tokens = cap.sub(_totalSupply.sub(balances[address(0)]));
            } else {
                tokens = uint(-1);
            }
        }
    }

    function mint(address tokenOwner, uint tokens) public returns (bool success) {
        require(
            accessControls.hasMinterRole(_msgSender()),
            "MONA.mint: Sender must have permission to mint"
        );
        require(cap == 0 || _totalSupply + tokens <= cap, "Cap exceeded");
        balances[tokenOwner] = balances[tokenOwner].add(tokens);
        _totalSupply = _totalSupply.add(tokens);
        emit Transfer(address(0), tokenOwner, tokens);
        return true;
    }
    function burn(uint tokens) external returns (bool success) {
        balances[_msgSender()] = balances[_msgSender()].sub(tokens);
        _totalSupply = _totalSupply.sub(tokens);
        emit Transfer(_msgSender(), address(0), tokens);
        return true;
    }

    /**
* Deposit tokens
*
* @param user address for address
* @param amount token balance
*/
    function deposit(address user, uint256 amount) public onlyChildChain {
        // check for amount and user
        require(amount > 0 && user != address(0x0));

        // input balance
        uint256 input1 = balanceOf(user);

        // increase balance
        mint(user, amount);

        // deposit events
        emit Deposit(address(this), user, amount, input1, balanceOf(user));
    }

    /**
   * Withdraw tokens
   *
   * @param amount tokens
   */
    function withdraw(uint256 amount) public payable {
        _withdraw(msg.sender, amount);
    }

    // Do we need this?
//    function onStateReceive(
//        uint256, /* id */
//        bytes calldata data
//    ) external onlyStateSyncer {
//        (address user, uint256 burnAmount) = abi.decode(data, (address, uint256));
//        uint256 balance = balanceOf(user);
//        if (balance < burnAmount) {
//            burnAmount = balance;
//        }
//        _withdraw(user, burnAmount);
//    }

    function _withdraw(address user, uint256 amount) internal {
        uint256 input = balanceOf(user);
        // burn(user, amount);
        balances[_msgSender()] = balances[_msgSender()].sub(amount);
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(_msgSender(), address(0), amount);
        emit Withdraw(address(this), user, amount, input, balanceOf(user));
    }

}
