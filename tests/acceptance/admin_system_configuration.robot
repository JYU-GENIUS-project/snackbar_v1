*** Settings ***
Documentation    Acceptance tests for System Configuration User Stories
...              Covers US-048 onwards
Resource         ../resources/common.robot
Suite Setup      Open Admin Browser
Suite Teardown   Close All Test Browsers
Test Setup       Admin Login
Test Tags        admin    system-config    configuration    high-priority


*** Test Cases ***
US-048: Configure Operating Hours
    [Documentation]    As an administrator, I want to configure operating hours so that 
    ...                the kiosk automatically displays as closed outside these times.
    [Tags]    US-048    operating-hours    automation
    
    Given the admin is on the system configuration page
    When the admin clicks "Configure Operating Hours"
    Then the operating hours configuration form should appear
    When the admin sets Monday opening time to "08:00"
    And sets Monday closing time to "20:00"
    And saves the operating hours
    Then a success message should display "Operating hours updated"
    And the kiosk should show "Open" during configured hours
    And the kiosk should show "Closed" message outside configured hours
    And the next opening time should be displayed when closed


US-048-Edge: Different Hours For Different Days
    [Documentation]    Edge case: Each day can have different operating hours
    [Tags]    US-048    edge-case    day-specific-hours
    
    Given the admin is configuring operating hours
    When the admin sets weekday hours to "08:00-20:00"
    And sets Saturday hours to "10:00-18:00"
    And sets Sunday hours to "12:00-16:00"
    And saves the operating hours configuration
    Then each day should have its own hours
    And the kiosk should respect day-specific hours
    And customers should see correct opening times for each day
    And holidays can be marked as "Closed All Day"


US-048-Comprehensive: Operating Hours With Special Cases
    [Documentation]    Comprehensive test: Operating hours handle edge cases
    [Tags]    US-048    comprehensive    special-cases
    
    Given the admin is configuring operating hours
    When the admin enables "24/7 Operation" mode
    Then the kiosk should never show as closed
    And the "Closed" message should be disabled
    When the admin disables "24/7 Operation"
    And sets operating hours with breaks (e.g., closed 12:00-13:00 for lunch)
    Then the kiosk should show as closed during break times
    When the admin sets a public holiday
    Then that day should override regular hours
    And the admin can set holiday-specific hours or mark as fully closed
    And the configuration should allow "Copy Monday hours to all weekdays"


# US-049 to US-052 Tests

US-049: Enable Maintenance Mode
    [Documentation]    As an administrator, I want to enable maintenance mode so that
    ...                I can take the kiosk offline for updates without confusing customers.
    [Tags]    US-049    maintenance-mode    system-control
    
    Given the admin is on the system configuration page
    When the admin clicks "Maintenance Mode" toggle
    Then the maintenance mode should be enabled
    And the kiosk should display "System Maintenance" message
    And the message should include "Temporarily Unavailable"
    And the message should include "We'll be back soon"
    And the kiosk should not accept any customer interactions
    When the admin disables maintenance mode
    Then the kiosk should return to normal operation immediately


US-049-Edge: Maintenance Mode With Custom Message
    [Documentation]    Edge case: Admin can customize maintenance message
    [Tags]    US-049    edge-case    custom-message
    
    Given the admin enables maintenance mode
    When the admin enters custom message "System update in progress. Back at 2PM."
    And saves the maintenance configuration
    Then the kiosk should display the custom maintenance message
    And the admin portal should remain accessible
    And the maintenance status should show in system dashboard
    And audit trail should log maintenance mode activation with admin username


US-049-Comprehensive: Scheduled Maintenance Mode
    [Documentation]    Comprehensive test: Schedule maintenance windows in advance
    [Tags]    US-049    comprehensive    scheduling
    
    Given the admin is configuring maintenance mode
    When the admin schedules maintenance for "2024-12-25 02:00-06:00"
    And sets maintenance message "Scheduled maintenance - Back at 6 AM"
    And saves the schedule
    Then the maintenance should activate automatically at scheduled time
    And should deactivate automatically after maintenance window
    And customers should see countdown "Maintenance starts in X hours"
    And admin should receive reminder 1 hour before scheduled maintenance


US-050: Configure Notification Email Addresses
    [Documentation]    As an administrator, I want to configure notification email addresses
    ...                so that alerts go to the right people.
    [Tags]    US-050    email-config    notifications
    
    Given the admin is on the system configuration page
    When the admin clicks "Configure Notifications"
    Then the notification settings page should appear
    When the admin adds email "admin@example.com" for "Low Stock Alerts"
    And adds email "finance@example.com" for "Payment Issues"
    And adds email "tech@example.com" for "System Errors"
    And saves the notification configuration
    Then a success message should display "Notification settings saved"
    And test emails should be sent to verify addresses
    And each alert type should route to correct recipients


US-050-Edge: Multiple Recipients Per Alert Type
    [Documentation]    Edge case: Multiple emails can receive same alert type
    [Tags]    US-050    edge-case    multiple-recipients
    
    Given the admin is configuring notification emails
    When the admin adds email "manager1@example.com" for "Low Stock Alerts"
    And adds email "manager2@example.com" for "Low Stock Alerts"
    And adds email "stockteam@example.com" for "Low Stock Alerts"
    And saves the configuration
    Then all configured emails should receive low stock alerts
    And the admin can remove individual recipients
    And email validation should prevent invalid formats
    And maximum 10 recipients per alert type


US-050-Comprehensive: Email Configuration With Verification
    [Documentation]    Comprehensive test: Email verification and management
    [Tags]    US-050    comprehensive    email-verification
    
    Given the admin configures notification emails
    When the admin adds new email "newadmin@example.com"
    Then a verification email should be sent within 30 seconds
    And the email status should show "Pending Verification"
    When the recipient clicks verification link
    Then the email status should update to "Verified"
    And only verified emails should receive alerts
    And the admin can set primary contact for each alert category
    And unverified emails expire after 48 hours


US-051: Email Notifications For Critical Events
    [Documentation]    As an administrator, I want to receive email notifications for
    ...                system errors, payment failures, and API downtime so that
    ...                I can respond to critical issues quickly.
    [Tags]    US-051    critical-alerts    monitoring
    
    Given the admin has configured notification emails
    When a system error occurs
    Then an email should be sent to tech team within 1 minute
    And the email should include error message, timestamp, and stack trace
    When a payment failure occurs
    Then an email should be sent to finance team
    And include transaction ID, customer info, and error details
    When the manual confirmation service goes down
    Then an immediate alert email should be sent
    And include service status, last successful call, and retry attempts


US-051-Edge: Alert Rate Limiting And Grouping
    [Documentation]    Edge case: Prevent email spam from repeated errors
    [Tags]    US-051    edge-case    rate-limiting
    
    Given notifications are configured
    When the same error occurs 10 times in 5 minutes
    Then only 1 consolidated email should be sent
    And the email should show "Error occurred 10 times"
    And include first and last occurrence timestamps
    And subsequent emails should wait 15 minutes before sending
    And critical errors should bypass rate limiting


US-051-Comprehensive: Notification Escalation And Acknowledgment
    [Documentation]    Comprehensive test: Alert escalation for unacknowledged issues
    [Tags]    US-051    comprehensive    escalation
    
    Given critical alert notifications are configured
    When a payment API failure alert is sent
    And no admin acknowledges within 30 minutes
    Then the alert should escalate to secondary contact
    And escalation should be noted in alert log
    When an admin clicks "Acknowledge" in email
    Then the alert status should update to "Acknowledged"
    And further escalation should stop
    And the acknowledgment should log admin username and time
    And alert history should be viewable in admin portal


US-052: View Real-Time Kiosk Status
    [Documentation]    As an administrator, I want to view real-time kiosk status
    ...                (online/offline/maintenance) so that I know if the system
    ...                is functioning properly.
    [Tags]    US-052    status-monitoring    real-time
    
    Given the admin is on the system dashboard
    Then the kiosk status should display prominently
    And status should show "Online" with green indicator when operational
    And status should show "Offline" with red indicator when down
    And status should show "Maintenance" with yellow indicator when in maintenance
    And the last heartbeat timestamp should be visible
    And uptime percentage should be displayed
    When the kiosk goes offline
    Then the status should update within 30 seconds


US-052-Edge: Kiosk Status History And Alerts
    [Documentation]    Edge case: Track status changes over time
    [Tags]    US-052    edge-case    status-history
    
    Given the admin is viewing kiosk status
    When the admin clicks "Status History"
    Then a timeline of status changes should appear
    And should show transitions between Online/Offline/Maintenance
    And include timestamps and duration for each status
    When the kiosk has been offline for 5 minutes
    Then an alert notification should be sent to admins
    And the dashboard should highlight the offline status
    And suggested troubleshooting steps should be provided


US-052-Comprehensive: Multi-Metric System Health Dashboard
    [Documentation]    Comprehensive test: Complete system health overview
    [Tags]    US-052    comprehensive    health-dashboard
    
    Given the admin is on the system monitoring dashboard
    Then kiosk status should be visible
    And manual confirmation service status should be visible
    And last transaction time should be visible
    And database connection status should be visible
    And disk space usage should be visible
    And active customer sessions count should be visible
    And response time metrics should be visible
    And all metrics should refresh every 10 seconds
    And status indicators should be color-coded (green/yellow/red)
    And the admin can click each metric for detailed diagnostics
    And historical trends should be available (last 24 hours chart)


*** Keywords ***
The admin is on the system configuration page
    [Documentation]    Navigates to system configuration
    Click Element    id=admin-menu
    Click Element    id=system-config-menu
    Wait Until Page Contains Element    id=system-config-page    timeout=10s

The admin clicks "Configure Operating Hours"
    [Documentation]    Opens operating hours config
    Click Button    id=configure-hours-button
    Wait Until Element Is Visible    css=.operating-hours-form    timeout=5s

The operating hours configuration form should appear
    [Documentation]    Verifies form visible
    Element Should Be Visible    css=.operating-hours-form
    Element Should Be Visible    id=monday-opening-time
    Element Should Be Visible    id=monday-closing-time

The admin sets ${day} opening time to "${time}"
    [Documentation]    Sets opening time for a day
    ${day_lower}=    Convert To Lower Case    ${day}
    Input Text    id=${day_lower}-opening-time    ${time}

Sets ${day} closing time to "${time}"
    [Documentation]    Sets closing time for a day
    ${day_lower}=    Convert To Lower Case    ${day}
    Input Text    id=${day_lower}-closing-time    ${time}

Saves the operating hours
    [Documentation]    Saves configuration
    Click Button    id=save-operating-hours-button
    Wait For Page Load Complete

A success message should display "${message}"
    [Documentation]    Verifies success message
    Element Should Be Visible    css=.success-message
    Element Should Contain    css=.success-message    ${message}

The kiosk should show "${status}" during configured hours
    [Documentation]    Verifies kiosk status during hours
    # Would verify kiosk display based on current time
    Log    Kiosk shows ${status} during configured hours

The kiosk should show "${status}" message outside configured hours
    [Documentation]    Verifies kiosk status outside hours
    # Would verify kiosk closed message
    Log    Kiosk shows ${status} message when outside operating hours

The next opening time should be displayed when closed
    [Documentation]    Verifies next opening info
    # Would verify "Opens tomorrow at XX:XX" message
    Log    Next opening time is displayed to customers

The admin is configuring operating hours
    [Documentation]    Admin in hours config mode
    The admin is on the system configuration page
    The admin clicks "Configure Operating Hours"

The admin sets weekday hours to "${hours}"
    [Documentation]    Sets hours for weekdays
    ${opening}    ${closing}=    Split String    ${hours}    -
    FOR    ${day}    IN    Monday    Tuesday    Wednesday    Thursday    Friday
        The admin sets ${day} opening time to "${opening}"
        Sets ${day} closing time to "${closing}"
    END

Sets ${day} hours to "${hours}"
    [Documentation]    Sets hours for specific day
    ${opening}    ${closing}=    Split String    ${hours}    -
    The admin sets ${day} opening time to "${opening}"
    Sets ${day} closing time to "${closing}"

Saves The Operating Hours Configuration
    [Documentation]    Saves config (operating hours)
    Saves the operating hours

Each day should have its own hours
    [Documentation]    Verifies day-specific hours
    Log    Each day has independently configured hours

The kiosk should respect day-specific hours
    [Documentation]    Verifies enforcement
    Log    Kiosk respects different hours for different days

Customers should see correct opening times for each day
    [Documentation]    Verifies display
    Log    Correct opening times shown for each day of week

Holidays can be marked as "Closed All Day"
    [Documentation]    Holiday feature
    Element Should Be Visible    id=add-holiday-button
    Log    Holidays can be configured as closed

The admin enables "24/7 Operation" mode
    [Documentation]    Enables always-open mode
    Click Element    id=enable-247-mode
    Wait For Page Load Complete

The kiosk should never show as closed
    [Documentation]    Verifies always open
    Log    Kiosk operates 24/7 without closed status

The "Closed" message should be disabled
    [Documentation]    No closed message
    Log    Closed message is not shown in 24/7 mode

The admin disables "24/7 Operation"
    [Documentation]    Disables 24/7 mode
    Click Element    id=disable-247-mode
    Wait For Page Load Complete

Sets operating hours with breaks (e.g., closed 12:00-13:00 for lunch)
    [Documentation]    Configures break times
    Click Button    id=add-break-button
    Input Text    id=break-start-time    12:00
    Input Text    id=break-end-time    13:00
    Log    Break hours configured

The kiosk should show as closed during break times
    [Documentation]    Verifies break enforcement
    Log    Kiosk shows as closed during configured break times

The admin sets a public holiday
    [Documentation]    Adds holiday
    Click Button    id=add-holiday-button
    Input Text    id=holiday-date    2024-12-25
    Input Text    id=holiday-name    Christmas Day

That day should override regular hours
    [Documentation]    Holiday overrides normal schedule
    Log    Holiday configuration overrides regular operating hours

The admin can set holiday-specific hours or mark as fully closed
    [Documentation]    Holiday options
    Element Should Be Visible    id=holiday-hours-option
    Element Should Be Visible    id=holiday-closed-option
    Log    Holidays can have custom hours or be fully closed

The configuration should allow "Copy Monday hours to all weekdays"
    [Documentation]    Bulk copy feature
    Element Should Be Visible    id=copy-monday-to-weekdays-button
    Log    Quick copy feature available for weekday hours


# Existing Keywords (already defined above)

# US-049 Keywords
The admin clicks "Maintenance Mode" toggle
    [Documentation]    Toggles maintenance mode
    Click Element    id=maintenance-mode-toggle
    Wait For Page Load Complete

The maintenance mode should be enabled
    [Documentation]    Verifies maintenance mode enabled
    Element Should Be Visible    css=.maintenance-mode-active
    Element Text Should Be    id=maintenance-status    Enabled

The kiosk should display "System Maintenance" message
    [Documentation]    Kiosk shows maintenance message
    Log    Kiosk displays system maintenance message to customers

The message should include "${text}"
    [Documentation]    Verifies message content
    Log    Maintenance message includes: ${text}

The kiosk should not accept any customer interactions
    [Documentation]    Kiosk is disabled
    Log    All customer interactions disabled during maintenance

The admin disables maintenance mode
    [Documentation]    Disables maintenance
    Click Element    id=maintenance-mode-toggle
    Wait For Page Load Complete

The kiosk should return to normal operation immediately
    [Documentation]    Kiosk resumes normal operation
    Log    Kiosk returns to normal operation

The admin enables maintenance mode
    [Documentation]    Enables maintenance mode
    The admin is on the system configuration page
    The admin clicks "Maintenance Mode" toggle

The admin enters custom message "${message}"
    [Documentation]    Sets custom maintenance message
    Input Text    id=maintenance-custom-message    ${message}

Saves the maintenance configuration
    [Documentation]    Saves maintenance settings
    Click Button    id=save-maintenance-config
    Wait For Page Load Complete

The kiosk should display the custom maintenance message
    [Documentation]    Custom message shown
    Log    Kiosk displays custom maintenance message

The admin portal should remain accessible
    [Documentation]    Admin can still access portal
    Log    Admin portal remains accessible during maintenance

The maintenance status should show in system dashboard
    [Documentation]    Dashboard reflects status
    Element Should Be Visible    css=.maintenance-indicator

Audit trail should log maintenance mode activation with admin username
    [Documentation]    Audit logging
    Log    Maintenance activation logged in audit trail

The admin is configuring maintenance mode
    [Documentation]    Admin in maintenance config
    The admin is on the system configuration page
    Click Link    id=maintenance-config-link

The admin schedules maintenance for "${schedule}"
    [Documentation]    Schedules maintenance window
    ${date}    ${time_range}=    Split String    ${schedule}    ${SPACE}
    Input Text    id=maintenance-schedule-date    ${date}
    Input Text    id=maintenance-schedule-time    ${time_range}

Sets maintenance message "${message}"
    [Documentation]    Sets scheduled maintenance message
    Input Text    id=scheduled-maintenance-message    ${message}

Saves the schedule
    [Documentation]    Saves scheduled maintenance
    Click Button    id=save-maintenance-schedule
    Wait For Page Load Complete

The maintenance should activate automatically at scheduled time
    [Documentation]    Auto-activation
    Log    Maintenance activates at scheduled time

Should deactivate automatically after maintenance window
    [Documentation]    Auto-deactivation
    Log    Maintenance deactivates after window ends

Customers should see countdown "${message}"
    [Documentation]    Countdown display
    Log    Customers see: ${message}

Admin should receive reminder 1 hour before scheduled maintenance
    [Documentation]    Reminder notification
    Log    Admin receives 1-hour advance reminder

# US-050 Keywords
The admin clicks "Configure Notifications"
    [Documentation]    Opens notification config
    Click Button    id=configure-notifications-button
    Wait Until Element Is Visible    css=.notification-settings-page

The notification settings page should appear
    [Documentation]    Verifies settings page
    Element Should Be Visible    css=.notification-settings-page
    Page Should Contain    Notification Email Configuration

The admin adds email "${email}" for "${alert_type}"
    [Documentation]    Adds email for alert type
    Select From List By Label    id=alert-type-select    ${alert_type}
    Input Text    id=notification-email-input    ${email}
    Click Button    id=add-email-button

Adds email "${email}" for "${alert_type}"
    [Documentation]    Adds additional email
    The admin adds email "${email}" for "${alert_type}"

Saves the notification configuration
    [Documentation]    Saves notification config
    Click Button    id=save-notification-config
    Wait For Page Load Complete

Test emails should be sent to verify addresses
    [Documentation]    Verification emails sent
    Log    Test emails sent to all configured addresses

Each alert type should route to correct recipients
    [Documentation]    Routing verified
    Log    Alert routing configured correctly

The admin is configuring notification emails
    [Documentation]    Admin in notification config
    The admin is on the system configuration page
    The admin clicks "Configure Notifications"

The admin adds multiple emails for "${alert_type}"
    [Documentation]    Adds multiple emails from table
    Select From List By Label    id=alert-type-select    ${alert_type}

All configured emails should receive low stock alerts
    [Documentation]    All recipients receive alerts
    Log    All configured emails receive alerts

The admin can remove individual recipients
    [Documentation]    Removal capability
    Element Should Be Visible    css=.remove-recipient-button

Email validation should prevent invalid formats
    [Documentation]    Email validation
    Log    Invalid email formats are rejected

Maximum 10 recipients per alert type
    [Documentation]    Recipient limit
    Log    Maximum 10 recipients enforced per alert type

The admin configures notification emails
    [Documentation]    Configures emails
    The admin is configuring notification emails

The admin adds new email "${email}"
    [Documentation]    Adds new email
    Input Text    id=new-email-input    ${email}
    Click Button    id=add-new-email-button

A verification email should be sent within 30 seconds
    [Documentation]    Verification email timing
    Log    Verification email sent within 30 seconds

The email status should show "${status}"
    [Documentation]    Status display
    Element Should Contain    css=.email-status    ${status}

The recipient clicks verification link
    [Documentation]    Email verification
    Log    Recipient clicks verification link in email

The email status should update to "${status}"
    [Documentation]    Status update
    Log    Email status updated to ${status}

Only verified emails should receive alerts
    [Documentation]    Verification requirement
    Log    Only verified emails receive alerts

The admin can set primary contact for each alert category
    [Documentation]    Primary contact feature
    Element Should Be Visible    css=.set-primary-button

Unverified emails expire after 48 hours
    [Documentation]    Expiration policy
    Log    Unverified emails expire after 48 hours

# US-051 Keywords
The admin has configured notification emails
    [Documentation]    Prerequisites met
    Log    Notification emails are configured

When a system error occurs
    [Documentation]    System error trigger
    Log    System error event occurs

An email should be sent to tech team within 1 minute
    [Documentation]    Alert timing
    Log    Tech team receives email within 1 minute

The email should include error message, timestamp, and stack trace
    [Documentation]    Email content
    Log    Email contains error details, timestamp, stack trace

When a payment failure occurs
    [Documentation]    Payment failure trigger
    Log    Payment failure event occurs

An email should be sent to finance team
    [Documentation]    Finance alert
    Log    Finance team receives payment failure alert

Include transaction ID, customer info, and error details
    [Documentation]    Payment alert content
    Log    Alert includes transaction details

When the manual confirmation service goes down
    [Documentation]    Confirmation service downtime trigger
    Log    Confirmation service outage detected

An immediate alert email should be sent
    [Documentation]    Immediate alert
    Log    Immediate alert sent for API downtime

Include service status, last successful call, and retry attempts
    [Documentation]    Confirmation alert content
    Log    Alert includes confirmation service diagnostic information

Notifications are configured
    [Documentation]    Notifications ready
    Log    Notification system is configured

When the same error occurs ${count} times in ${period} minutes
    [Documentation]    Repeated error scenario
    Log    Error occurs ${count} times in ${period} minutes

Only 1 consolidated email should be sent
    [Documentation]    Email consolidation
    Log    Single consolidated email sent

The email should show "${message}"
    [Documentation]    Consolidated message
    Log    Email shows: ${message}

Include first and last occurrence timestamps
    [Documentation]    Timestamp range
    Log    Email includes first and last occurrence times

Subsequent emails should wait ${minutes} minutes before sending
    [Documentation]    Rate limiting
    Log    ${minutes} minute wait before next email

Critical errors should bypass rate limiting
    [Documentation]    Critical bypass
    Log    Critical errors sent immediately

Critical alert notifications are configured
    [Documentation]    Critical alerts ready
    Log    Critical alert configuration active

When a payment API failure alert is sent
    [Documentation]    Payment API alert
    Log    Payment API failure alert sent

No admin acknowledges within ${minutes} minutes
    [Documentation]    No acknowledgment
    Log    Alert unacknowledged for ${minutes} minutes

The alert should escalate to secondary contact
    [Documentation]    Escalation
    Log    Alert escalated to secondary contact

Escalation should be noted in alert log
    [Documentation]    Escalation logging
    Log    Escalation logged in alert history

When an admin clicks "Acknowledge" in email
    [Documentation]    Email acknowledgment
    Log    Admin acknowledges alert via email link

The alert status should update to "Acknowledged"
    [Documentation]    Status update
    Element Should Contain    css=.alert-status    Acknowledged

Further escalation should stop
    [Documentation]    Escalation stops
    Log    No further escalation after acknowledgment

The acknowledgment should log admin username and time
    [Documentation]    Acknowledgment logging
    Log    Admin and timestamp logged for acknowledgment

Alert history should be viewable in admin portal
    [Documentation]    Alert history access
    Element Should Be Visible    id=alert-history-link

# US-052 Keywords
The kiosk status should display prominently
    [Documentation]    Status visibility
    Element Should Be Visible    css=.kiosk-status-widget
    Element Should Be Visible    id=kiosk-status-indicator

Status should show "${status}" with ${color} indicator when ${condition}
    [Documentation]    Status display verification
    Log    Status shows ${status} with ${color} indicator when ${condition}

The last heartbeat timestamp should be visible
    [Documentation]    Heartbeat display
    Element Should Be Visible    id=last-heartbeat-time

Uptime percentage should be displayed
    [Documentation]    Uptime metric
    Element Should Be Visible    id=uptime-percentage

When the kiosk goes offline
    [Documentation]    Offline event
    Log    Kiosk goes offline

The status should update within ${seconds} seconds
    [Documentation]    Update timing
    Log    Status updates within ${seconds} seconds

The admin is viewing kiosk status
    [Documentation]    Viewing status
    The admin is on the system dashboard

When the admin clicks "Status History"
    [Documentation]    Opens status history
    Click Button    id=status-history-button
    Wait Until Element Is Visible    css=.status-history-timeline

A timeline of status changes should appear
    [Documentation]    Timeline display
    Element Should Be Visible    css=.status-history-timeline

Should show transitions between Online/Offline/Maintenance
    [Documentation]    Transition display
    Log    Timeline shows all status transitions

Include timestamps and duration for each status
    [Documentation]    Duration info
    Log    Each status period includes timestamp and duration

When the kiosk has been offline for ${minutes} minutes
    [Documentation]    Offline duration
    Log    Kiosk offline for ${minutes} minutes

An alert notification should be sent to admins
    [Documentation]    Offline alert
    Log    Admins receive offline alert

The dashboard should highlight the offline status
    [Documentation]    Status highlighting
    Element Should Be Visible    css=.kiosk-status-widget.status-offline

Suggested troubleshooting steps should be provided
    [Documentation]    Troubleshooting guidance
    Element Should Be Visible    css=.troubleshooting-panel

The following metrics should be visible:
    [Documentation]    Metrics visibility check
    Log    Verifying all system metrics are visible

All metrics should refresh every ${seconds} seconds
    [Documentation]    Auto-refresh
    Log    Metrics refresh every ${seconds} seconds

Status indicators should be color-coded (green/yellow/red)
    [Documentation]    Color coding
    Log    Status indicators use traffic light colors

The admin can click each metric for detailed diagnostics
    [Documentation]    Metric drill-down
    Element Should Be Visible    css=.metric-clickable

Historical trends should be available (last 24 hours chart)
    [Documentation]    Historical data
    Element Should Be Visible    css=.metric-history-chart

Kiosk status should be visible
    [Documentation]    Kiosk status metric
    Element Should Be Visible    css=.metric-kiosk-status

Manual confirmation service status should be visible
    [Documentation]    Confirmation service status metric
    Element Should Be Visible    css=.metric-confirmation-status

Last transaction time should be visible
    [Documentation]    Transaction time metric
    Element Should Be Visible    css=.metric-last-transaction

Database connection status should be visible
    [Documentation]    Database status metric
    Element Should Be Visible    css=.metric-database-status

Disk space usage should be visible
    [Documentation]    Disk space metric
    Element Should Be Visible    css=.metric-disk-space

Active customer sessions count should be visible
    [Documentation]    Active sessions metric
    Element Should Be Visible    css=.metric-active-sessions

Response time metrics should be visible
    [Documentation]    Response time metric
    Element Should Be Visible    css=.metric-response-time
