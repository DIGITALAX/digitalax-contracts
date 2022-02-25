// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IDigitalaxAccessControls {
    /**
     * @notice Used to check whether an address has the admin role
     * @param _address EOA or contract being checked
     * @return bool True if the account has the role or false if it does not
     */
    function hasAdminRole(address _address) external view returns (bool);

    function hasMinterRole(address _address) external view returns (bool);

    function hasVerifiedMinterRole(address _address)
        external
        view
        returns (bool);

    /**
     * @notice Used to check whether an address has the smart contract role
     * @param _address EOA or contract being checked
     * @return bool True if the account has the role or false if it does not
     */
    function hasSmartContractRole(address _address) external view returns (bool);
}
