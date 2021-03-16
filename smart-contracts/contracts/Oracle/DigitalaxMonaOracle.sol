// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../DigitalaxAccessControls.sol";
import "./IDigitalaxMonaOracle.sol";

library Select {
    using SafeMath for uint256;

    /**
     * @dev Sorts the input array up to the denoted size, and returns the median.
     * @param array Input array to compute its median.
     * @param size Number of elements in array to compute the median for.
     * @return Median of array.
     */
    function computeMedian(uint256[] memory array, uint256 size)
        internal
        pure
        returns (uint256)
    {
        require(size > 0 && array.length >= size);
        for (uint256 i = 1; i < size; i++) {
            for (uint256 j = i; j > 0 && array[j-1]  > array[j]; j--) {
                uint256 tmp = array[j];
                array[j] = array[j-1];
                array[j-1] = tmp;
            }
        }
        if (size % 2 == 1) {
            return array[size / 2];
        } else {
            return array[size / 2].add(array[size / 2 - 1]) / 2;
        }
    }
}

/**
 * @title Digitalax Mona Oracle
 *
 * @notice Provides a value onchain that's aggregated from a whitelisted set of
 *         providers.
 */
contract DigitalaxMonaOracle is IDigitalaxMonaOracle, Context {
    using SafeMath for uint256;

    struct Report {
        uint256 timestamp;
        uint256 payload;
    }

    // Addresses of providers authorized to push reports.
    address[] public providers;

    // Digitalax Access Controls
    DigitalaxAccessControls public accessControls;

    // Reports indexed by provider address. Report[0].timestamp > 0
    // indicates provider existence.
    mapping (address => Report[2]) public providerReports;

    event ProviderAdded(address provider);
    event ProviderRemoved(address provider);
    event ReportTimestampOutOfRange(address provider);
    event ProviderReportPushed(address indexed provider, uint256 payload, uint256 timestamp);

    // The number of seconds after which the report is deemed expired.
    uint256 public reportExpirationTimeSec;

    // The number of seconds since reporting that has to pass before a report
    // is usable.
    uint256 public reportDelaySec;

    // The minimum number of providers with valid reports to consider the
    // aggregate report valid.
    uint256 public minimumProviders = 1;

    // Timestamp of 1 is used to mark uninitialized and invalidated data.
    // This is needed so that timestamp of 1 is always considered expired.
    uint256 private constant MAX_REPORT_EXPIRATION_TIME = 520 weeks;

    /**
    * @param reportExpirationTimeSec_ The number of seconds after which the
    *                                 report is deemed expired.
    * @param reportDelaySec_ The number of seconds since reporting that has to
    *                        pass before a report is usable
    * @param minimumProviders_ The minimum number of providers with valid
    *                          reports to consider the aggregate report valid.
    */
    constructor(uint256 reportExpirationTimeSec_,
                uint256 reportDelaySec_,
                uint256 minimumProviders_,
                DigitalaxAccessControls accessControls_)
        public
    {
        require(reportExpirationTimeSec_ <= MAX_REPORT_EXPIRATION_TIME, "DigitalaxMonaOracle: Invalid report exipiration time");
        require(minimumProviders_ > 0, "DigitalaxMonaOracle: Minimum providers count might be greater than zero");
        require(address(accessControls_) != address(0x0), "DigitalaxMonaOracle: AccessControls is invalid");
        reportExpirationTimeSec = reportExpirationTimeSec_;
        reportDelaySec = reportDelaySec_;
        minimumProviders = minimumProviders_;
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
            "DigitalaxMonaOracle.setReportExpirationTimeSec: Sender must be admin"
        );
        require(reportExpirationTimeSec_ <= MAX_REPORT_EXPIRATION_TIME, "DigitalaxMonaOracle.setReportExpirationTimeSec: Invalid expiration time");
        reportExpirationTimeSec = reportExpirationTimeSec_;
    }

    /**
    * @notice Sets the time period since reporting that has to pass before a
    *         report is usable.
    * @param reportDelaySec_ The new delay period in seconds.
    */
    function setReportDelaySec(uint256 reportDelaySec_) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaOracle.setReportDelaySec: Sender must be admin"
        );
        reportDelaySec = reportDelaySec_;
    }

    /**
    * @notice Sets the minimum number of providers with valid reports to
    *         consider the aggregate report valid.
    * @param minimumProviders_ The new minimum number of providers.
    */
    function setMinimumProviders(uint256 minimumProviders_) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaOracle.setMinimumProviders: Sender must be admin"
        );
        require(minimumProviders_ > 0);
        minimumProviders = minimumProviders_;
    }

    /**
     * @notice Pushes a report for the calling provider.
     * @param payload is expected to be 18 decimal fixed point number.
     */
    function pushReport(uint256 payload) external
    {
        address providerAddress = msg.sender;
        Report[2] storage reports = providerReports[providerAddress];
        uint256[2] memory timestamps = [reports[0].timestamp, reports[1].timestamp];

        require(timestamps[0] > 0);

        uint8 index_recent = timestamps[0] >= timestamps[1] ? 0 : 1;
        uint8 index_past = 1 - index_recent;

        // Check that the push is not too soon after the last one.
        require(timestamps[index_recent].add(reportDelaySec) <= now);

        reports[index_past].timestamp = now;
        reports[index_past].payload = payload;

        emit ProviderReportPushed(providerAddress, payload, now);
    }

    /**
    * @notice Invalidates the reports of the calling provider.
    */
    function purgeReports() external
    {
        address providerAddress = msg.sender;
        require (providerReports[providerAddress][0].timestamp > 0);
        providerReports[providerAddress][0].timestamp=1;
        providerReports[providerAddress][1].timestamp=1;
    }

    /**
    * @notice Computes median of provider reports whose timestamps are in the
    *         valid timestamp range.
    * @return AggregatedValue: Median of providers reported values.
    *         valid: Boolean indicating an aggregated value was computed successfully.
    */
    function getData()
        external
        override
        returns (uint256, bool)
    {
        uint256 reportsCount = providers.length;
        uint256[] memory validReports = new uint256[](reportsCount);
        uint256 size = 0;
        uint256 minValidTimestamp =  now.sub(reportExpirationTimeSec);
        uint256 maxValidTimestamp =  now.sub(reportDelaySec);

        for (uint256 i = 0; i < reportsCount; i++) {
            address providerAddress = providers[i];
            Report[2] memory reports = providerReports[providerAddress];

            uint8 index_recent = reports[0].timestamp >= reports[1].timestamp ? 0 : 1;
            uint8 index_past = 1 - index_recent;
            uint256 reportTimestampRecent = reports[index_recent].timestamp;
            if (reportTimestampRecent > maxValidTimestamp) {
                // Recent report is too recent.
                uint256 reportTimestampPast = providerReports[providerAddress][index_past].timestamp;
                if (reportTimestampPast < minValidTimestamp) {
                    // Past report is too old.
                    emit ReportTimestampOutOfRange(providerAddress);
                } else if (reportTimestampPast > maxValidTimestamp) {
                    // Past report is too recent.
                    emit ReportTimestampOutOfRange(providerAddress);
                } else {
                    // Using past report.
                    validReports[size++] = providerReports[providerAddress][index_past].payload;
                }
            } else {
                // Recent report is not too recent.
                if (reportTimestampRecent < minValidTimestamp) {
                    // Recent report is too old.
                    emit ReportTimestampOutOfRange(providerAddress);
                } else {
                    // Using recent report.
                    validReports[size++] = providerReports[providerAddress][index_recent].payload;
                }
            }
        }

        if (size < minimumProviders) {
            return (0, false);
        }

        return (Select.computeMedian(validReports, size), true);
    }

    /**
     * @notice Authorizes a provider.
     * @param provider Address of the provider.
     */
    function addProvider(address provider) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaOracle.addProvider: Sender must be admin"
        );
        require(providerReports[provider][0].timestamp == 0);
        providers.push(provider);
        providerReports[provider][0].timestamp = 1;
        emit ProviderAdded(provider);
    }

    /**
     * @notice Revokes provider authorization.
     * @param provider Address of the provider.
     */
    function removeProvider(address provider) external
    {
        require(
            accessControls.hasAdminRole(_msgSender()),
            "DigitalaxMonaOracle.removeProvider: Sender must be admin"
        );
        delete providerReports[provider];
        for (uint256 i = 0; i < providers.length; i++) {
            if (providers[i] == provider) {
                if (i + 1  != providers.length) {
                    providers[i] = providers[providers.length-1];
                }
                providers.pop();
                emit ProviderRemoved(provider);
                break;
            }
        }
    }

    /**
     * @return The number of authorized providers.
     */
    function providersSize() external view returns (uint256)
    {
        return providers.length;
    }
}
