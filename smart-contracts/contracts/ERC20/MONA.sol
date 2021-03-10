pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "../EIP712/NativeMetaTransaction.sol";
import "../common/ContextMixin.sol";

// SPDX-License-Identifier: GPLv2
contract MONA is Context, IERC20, NativeMetaTransaction, ContextMixin  {
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
        uint256 output1
    );

    event Withdraw(
        address indexed token,
        address indexed from,
        uint256 amount,
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
        _initializeEIP712(name_);
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
    function burn(uint tokens) public returns (bool success) {
        balances[_msgSender()] = balances[_msgSender()].sub(tokens);
        _totalSupply = _totalSupply.sub(tokens);
        emit Transfer(_msgSender(), address(0), tokens);
        return true;
    }

    // This is to support Native meta transactions
    // never use msg.sender directly, use _msgSender() instead
    function _msgSender()
    internal
    override
    view
    returns (address payable sender)
    {
        return ContextMixin.msgSender();
    }

    /**
    * Deposit tokens
    *
    * ChildChainManagerProxy -
    * Mumbai - 0xb5505a6d998549090530911180f38aC5130101c6
    * MainNet - 0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa
     * @notice called when token is deposited on root chain
   * @dev Should be callable only by ChildChainManager
   * Should handle deposit by minting the required amount for user
   * Make sure minting is done only by this function
   * @param user user address for whom deposit is being done
   * @param depositData abi encoded amount
    */
    function deposit(address user, bytes calldata depositData) external onlyChildChain {
        uint256 amount = abi.decode(depositData, (uint256));
        mint(user, amount);
        emit Deposit(address(this), user, amount, balanceOf(user));
    }

   /**
   * Withdraw tokens
   *
   * @param amount tokens
   */
    function withdraw(uint256 amount) public payable {
         burn(amount);
        emit Withdraw(address(this), _msgSender(), amount, balanceOf(_msgSender()));
    }
}
