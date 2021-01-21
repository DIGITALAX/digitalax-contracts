pragma solidity ^0.6.12;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "../DigitalaxAccessControls.sol";

// SPDX-License-Identifier: GPLv2
contract MONA is Context, IERC20  {
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

    constructor(
        string memory symbol_,
        string memory name_,
        uint8 decimals_,
        DigitalaxAccessControls accessControls_,
        address tokenOwner,
        uint256 initialSupply
    ) 
        public 
    {
        _symbol = symbol_;
        _name = name_;
        _decimals = decimals_;
        accessControls = accessControls_;
        balances[tokenOwner] = initialSupply;
        _totalSupply = initialSupply;
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
    function balanceOf(address tokenOwner) override external view returns (uint balance) {
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

    function mint(address tokenOwner, uint tokens) external returns (bool success) {
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
}
