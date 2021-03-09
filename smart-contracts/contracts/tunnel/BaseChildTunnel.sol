pragma solidity 0.6.12;
import "../DigitalaxAccessControls.sol";

/**
* @notice Mock child tunnel contract to receive and send message from L2
*/
abstract contract BaseChildTunnel {
    /// Required to govern who can call certain functions
    DigitalaxAccessControls public accessControls;

    // MessageTunnel on L1 will get data from this event
    event MessageSent(bytes message);

    constructor(DigitalaxAccessControls _accessControls) public {
       //  _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
       //  _setupRole(STATE_SYNCER_ROLE, 0x0000000000000000000000000000000000001001);
       //  _setupContractId("ChildTunnel");
       accessControls = _accessControls;
    }

    /**
     * @notice Receive state sync from matic contracts
     * @dev This method will be called by Matic chain internally.
     * This is executed without transaction using a system call.
     */
    function onStateReceive(uint256, bytes memory message) public {
        require(
            accessControls.hasSmartContractRole(msg.sender) || accessControls.hasAdminRole(msg.sender),
            "BaseChildTunnel.onStateReceive: Sender must have the admin or contract role"
        );
        _processMessageFromRoot(message);
    }

    /**
     * @notice Emit message that can be received on Root Tunnel
     * @dev Call the internal function when need to emit message
     * @param message bytes message that will be sent to Root Tunnel
     * some message examples -
     *   abi.encode(tokenId);
     *   abi.encode(tokenId, tokenMetadata);
     *   abi.encode(messageType, messageData);
     */
    function _sendMessageToRoot(bytes memory message) internal {
        emit MessageSent(message);
    }

    /**
     * @notice Process message received from Root Tunnel
     * @dev function needs to be implemented to handle message as per requirement
     * This is called by onStateReceive function.
     * Since it is called via a system call, any event will not be emitted during its execution.
     * @param message bytes message that was sent from Root Tunnel
     */
    function _processMessageFromRoot(bytes memory message) virtual internal;
}
