// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/proxy/UpgradeableProxy.sol";
import "../DigitalaxAccessControls.sol";

/**
 * @dev This contract implements a proxy that is upgradeable by an admin.
 * 
 * To avoid https://medium.com/nomic-labs-blog/malicious-backdoors-in-ethereum-proxies-62629adf3357[proxy selector
 * clashing], which can potentially be used in an attack, this contract uses the
 * https://blog.openzeppelin.com/the-transparent-proxy-pattern/[transparent proxy pattern]. This pattern implies two
 * things that go hand in hand:
 * 
 * 1. If any account other than the admin calls the proxy, the call will be forwarded to the implementation, even if
 * that call matches one of the admin functions exposed by the proxy itself.
 * 2. If the admin calls the proxy, it can access the admin functions, but its calls will never be forwarded to the
 * implementation. If the admin tries to call a function on the implementation it will fail with an error that says
 * "admin cannot fallback to proxy target".
 * 
 * These properties mean that the admin account can only be used for admin actions like upgrading the proxy or changing
 * the admin, so it's best if it's a dedicated account that is not used for anything else. This will avoid headaches due
 * to sudden errors when trying to call a function from the proxy implementation.
 * 
 * Our recommendation is for the dedicated account to be an instance of the {ProxyAdmin} contract. If set up this way,
 * you should think of the `ProxyAdmin` instance as the real administrative inerface of your proxy.
 */
contract DigitalaxProxy is UpgradeableProxy {
    /// @notice AccessControls address
    DigitalaxAccessControls public accessControls;

    /**
     * @dev Initializes an upgradeable proxy managed by `_admin`, backed by the implementation at `_logic`, and
     * optionally initialized with `_data` as explained in {UpgradeableProxy-constructor}.
     */
    constructor(
        address _logic,
        DigitalaxAccessControls _accessControls,
        bytes memory _data
    ) public payable UpgradeableProxy(_logic, _data) {
        require(address(_accessControls) != address(0), "DigitalaxProxy: Invalid Access Controls");
        accessControls = _accessControls;
    }

    /**
     * @dev Emitted when the access controls has changed.
     */
    event AccessControlsUpdated(address accessControls);

    /**
     * @dev Returns the current implementation.
     * 
     * NOTE: Only the admin can call this function. See {ProxyAdmin-getProxyImplementation}.
     * 
     * TIP: To get this value clients can read directly from the storage slot shown below (specified by EIP1967) using the
     * https://eth.wiki/json-rpc/API#eth_getstorageat[`eth_getStorageAt`] RPC call.
     * `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
     */
    function implementation() external returns (address) {
        require(accessControls.hasAdminRole(msg.sender), "DigitalaxProxy: Sender must be admin");
        return _implementation();
    }

    /**
     * @dev Changes the access controls of the proxy.
     * 
     * Emits an {AccessControlsUpdated} event.
     * 
     * NOTE: Only the admin can call this function. See {ProxyAdmin-changeProxyAdmin}.
     */
    function updateAccessControls(DigitalaxAccessControls _accessControls) external {
        require(accessControls.hasAdminRole(msg.sender), "DigitalaxProxy: Sender must be admin");
        accessControls = _accessControls;

        emit AccessControlsUpdated(address(_accessControls));
    }

    /**
     * @dev Upgrade the implementation of the proxy.
     * 
     * NOTE: Only the admin can call this function. See {ProxyAdmin-upgrade}.
     */
    function upgradeTo(address newImplementation) external {
        require(accessControls.hasAdminRole(msg.sender), "DigitalaxProxy: Sender must be admin");
        _upgradeTo(newImplementation);
    }

    /**
     * @dev Upgrade the implementation of the proxy, and then call a function from the new implementation as specified
     * by `data`, which should be an encoded function call. This is useful to initialize new storage variables in the
     * proxied contract.
     * 
     * NOTE: Only the admin can call this function. See {ProxyAdmin-upgradeAndCall}.
     */
    function upgradeToAndCall(address newImplementation, bytes calldata data) external payable {
        require(accessControls.hasAdminRole(msg.sender), "DigitalaxProxy: Sender must be admin");
        _upgradeTo(newImplementation);
        // solhint-disable-next-line avoid-low-level-calls
        (bool success,) = newImplementation.delegatecall(data);
        require(success);
    }

    /**
     * @dev Makes sure the admin cannot access the fallback function. See {Proxy-_beforeFallback}.
     */
    function _beforeFallback() internal override virtual {
        require(accessControls.hasAdminRole(msg.sender), "DigitalaxProxy: Sender must be admin");
        super._beforeFallback();
    }
}
