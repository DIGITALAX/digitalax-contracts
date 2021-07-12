// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "./IDripOracle.sol";

/**
 * @title Drip Oracle
 *
 * @notice Provides a value onchain that's aggregated from a whitelisted set of
 *         providers.
 */
contract DripOracle is IDripOracle, Context, Initializable {
    using SafeMath for uint256;

    // Payable tokens
    mapping(address => uint256) payableTokensIndex;
    address[] payableTokens;

    event AddPayableTokens(
        address[] payableTokens
    );

    event RemovePayableTokens(
        address[] payableTokens
    );

    uint256 constant MAX_TOKENS = 20;

    struct Report {
        uint256 timestamp;
        uint256 payload;
    }

    mapping (address => Report) tokenReports;

    // Digitalax Access Controls
    DigitalaxAccessControls public accessControls;

    // Only one whitelisted provider can do modifications to exchange rates, or an admin
    address public whitelistedProvider = address(0);

    event ProviderAdded(address provider);
    event ProviderRemoved(address provider);

    event ProviderReportsPushed(address[] payableTokens, uint256[] payloads, uint256 timestamp);

    // The number of seconds after which the report is deemed expired.
    uint256 public reportExpirationTimeSec;

    modifier onlyWhitelisted() {
        require(
            _msgSender() == whitelistedProvider || accessControls.hasAdminRole(_msgSender()) ,
            "DripOracle: Only whitelisted accounts permitted"
        );
        _;
    }

    /**
    * @param reportExpirationTimeSec_ The number of seconds after which the
    *                                 report is deemed expired.
    * @param accessControls_ the access controls to administer
    */
    function initialize(uint256 reportExpirationTimeSec_,
                DigitalaxAccessControls accessControls_
                )
        public initializer {
            require(address(accessControls_) != address(0x0), "DripOracle: AccessControls is invalid");
            reportExpirationTimeSec = reportExpirationTimeSec_;
            accessControls = accessControls_;
    }

     /**
     * @notice Sets the report expiration period.
     * @param reportExpirationTimeSec_ The number of seconds after which the
     *        report is deemed expired.
     */
    function setReportExpirationTimeSec(uint256 reportExpirationTimeSec_) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DecoOracle.setReportExpirationTimeSec: Sender must be admin"
        );
        reportExpirationTimeSec = reportExpirationTimeSec_;
    }


    /**
     * @notice Pushes a report for the calling provider.
     * @param _payableTokens is expected to be array of tokens acceptable as means of payment
     * @param _payloads is expected to be array 18 decimal fixed point number.
     */
    function pushReports(address[] memory _payableTokens, uint256[] memory _payloads) external onlyWhitelisted
    {
        for (uint256 i = 0; i < _payableTokens.length; i++) {
            tokenReports[_payableTokens[i]] = Report(now, _payloads[i]);
        }

        emit ProviderReportsPushed(_payableTokens, _payloads, now);
    }


    /**
    * @notice Computes median of provider reports whose timestamps are in the
    *         valid timestamp range.
    * @return AggregatedValue: Median of providers reported values.
    *         valid: Boolean indicating an aggregated value was computed successfully.
    */
    function getData(address _payableToken)
        external
        override
        returns (uint256, bool)
    {
        if(
            (payableTokens.length == 0)
            || !checkInPayableTokens(_payableToken)
            || (tokenReports[_payableToken].payload == 0) ) {
                return (0, false);
        }
        bool validTimestamp = now.sub(tokenReports[_payableToken].timestamp) < reportExpirationTimeSec;
        return (tokenReports[_payableToken].payload, validTimestamp);
    }

    /**
     * @notice Authorizes a provider.
     * @param provider Address of the provider.
     */
    function addProvider(address provider) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DripOracle.addProvider: Sender must be admin"
        );
        whitelistedProvider = provider;
        emit ProviderAdded(provider);
    }

    /**
     * @return The number of authorized providers.
     */
    function payableTokenListSize() external view returns (uint256)
    {
        return payableTokens.length;
    }

    function addPayableTokens(address[] memory _payableTokens) public onlyWhitelisted{
        require((_payableTokens.length) > 0, "DripOracle.addPayableTokens: Empty array not supported");
        for (uint i = 0; i < _payableTokens.length; i++) {
            if(!checkInPayableTokens(_payableTokens[i])) {
                uint256 index = payableTokens.length;
                payableTokens.push(_payableTokens[i]);
                payableTokensIndex[_payableTokens[i]] = index;
            }
        }
        emit AddPayableTokens(_payableTokens);
    }

    function addPayableTokensWithReports(address[] memory _payableTokens, uint256[] memory _payloads) public onlyWhitelisted{
        require((_payableTokens.length) > 0, "DripOracle.addPayableTokens: Empty array not supported");
        for (uint i = 0; i < _payableTokens.length; i++) {
            if(!checkInPayableTokens(_payableTokens[i])) {
                uint256 index = payableTokens.length;
                payableTokens.push(_payableTokens[i]);
                payableTokensIndex[_payableTokens[i]] = index;
                tokenReports[_payableTokens[i]] = Report(now, _payloads[i]);
            }
        }
        emit AddPayableTokens(_payableTokens);
        emit ProviderReportsPushed(_payableTokens, _payloads, now);
    }

    function removePayableTokens(address[] memory _payableTokens) public onlyWhitelisted{
        require((payableTokens.length) > 0, "DripOracle.removePayableTokens: No payable tokens instantiated");
        require((_payableTokens.length) > 0, "DripOracle.removePayableTokens: Empty array not supported");

        for (uint i = 0; i < _payableTokens.length; i++) {
            if(checkInPayableTokens(_payableTokens[i])) {
                uint256 rowToDelete = payableTokensIndex[_payableTokens[i]];
                address keyToMove = payableTokens[payableTokens.length-1];
                payableTokens[rowToDelete] = keyToMove;
                payableTokensIndex[keyToMove] = rowToDelete;
                payableTokens.pop();
                delete(payableTokensIndex[_payableTokens[i]]);
                delete(tokenReports[_payableTokens[i]]);
            }
        }

        emit RemovePayableTokens(_payableTokens);
    }

    function checkInPayableTokens(address _payableToken) public view returns (bool isAddress) {
        if(payableTokens.length == 0) return false;
        return (payableTokens[payableTokensIndex[_payableToken]] == _payableToken);
    }

    function checkForTokens(address[] calldata _payableTokens) external view returns (bool[] memory returnPayableTokens){
        bool[] memory a = new bool[](_payableTokens.length);
        for (uint i=0; i < _payableTokens.length; i++) {
            a[i] = checkInPayableTokens(_payableTokens[i]);
        }

        return a;
    }

    function checkForTokensLastUpdate(address[] memory _payableTokens) external view returns (uint256[] memory timestamps){
        uint256[] memory a = new uint256[](_payableTokens.length);
        for (uint i=0; i < _payableTokens.length; i++) {
            a[i] = tokenReports[_payableTokens[i]].timestamp;
        }
        return a;
    }

    function getPayableTokens() public view returns (address[] memory returnPayableTokens){
        address[] memory a = new address[](payableTokens.length);
        for (uint i=0; i< payableTokens.length; i++) {
            a[i] = payableTokens[i];
        }

        return a;
    }

    function checkReportsBatch(address[] calldata _payableTokens) external view returns (uint256[] memory values, bool[] memory valids){
        if(
            payableTokens.length == 0) {
            uint256[] memory a = new uint256[](1);
            bool[] memory b = new bool[](1);
            a[0] = 0;
            b[0] = false;
            return (a,b);
        }

        uint256[] memory a = new uint256[](_payableTokens.length);
        bool[] memory b = new bool[](_payableTokens.length);
        for (uint i=0; i < _payableTokens.length; i++) {
            a[i] = tokenReports[_payableTokens[i]].payload;

            b[i] = (tokenReports[_payableTokens[i]].timestamp != 0)
                && checkInPayableTokens(_payableTokens[i])
                && !(a[i] == 0);
        }

        return (a,b);
    }
}
