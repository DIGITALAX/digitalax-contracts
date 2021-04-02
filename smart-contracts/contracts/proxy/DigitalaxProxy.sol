// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/proxy/TransparentUpgradeableProxy.sol";


/**
 * @notice Primary sale auction contract for Digitalax NFTs
 */
contract DigitalaxProxy is TransparentUpgradeableProxy {
     /**
     * @dev Initializes an upgradeable proxy managed by `_admin`, backed by the implementation at `_logic`, and
     * optionally initialized with `_data` as explained in {UpgradeableProxy-constructor}.
     */
    constructor(address _logic, address _admin, bytes memory _data) public payable TransparentUpgradeableProxy(_logic, _admin, _data) {
    }

}