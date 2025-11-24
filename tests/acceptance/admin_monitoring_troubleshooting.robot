*** Settings ***
Documentation    Acceptance tests for Monitoring & Troubleshooting User Stories
...              Covers US-053 to US-056 and system performance tests US-057 to US-058
Resource         ../resources/common.robot
Suite Setup      Open Admin Browser
Suite Teardown   Close All Test Browsers
Test Setup       Admin Login
Test Tags        admin    monitoring    troubleshooting    high-priority


*** Test Cases ***
US-053: View Error Logs Through Web Portal
    [Documentation]    As an administrator, I want to view error logs through the
    ...                web portal so that I can troubleshoot issues without needing
    ...                server access.
    [Tags]    US-053    error-logs    diagnostics
    
    Given the admin is on the system dashboard
    When the admin clicks "View Error Logs"
    Then the error logs page should appear
    And logs should display in reverse chronological order (newest first)
    And each log entry should show timestamp
    And each log entry should show error level
    And each log entry should show error message
    And each log entry should show stack trace
    And each log entry should show user context
    And logs should be paginated (100 entries per page)
    And the admin can filter by error level
    And the admin can search logs by keyword


US-053-Edge: Error Log Filtering And Export
    [Documentation]    Edge case: Advanced filtering and export capabilities
    [Tags]    US-053    edge-case    log-filtering
    
    Given the admin is viewing error logs
    When the admin filters by date range "Last 7 Days"
    And filters by error level "Error"
    And searches for keyword "payment"
    Then only matching log entries should display
    And the filter count should show "X matching entries"
    When the admin clicks "Export to CSV"
    Then a CSV file should download with filtered logs
    And CSV should include all log fields
    And filename should include date range and filters applied
    And export should complete within 10 seconds for 1000+ entries


US-053-Comprehensive: Log Analysis And Trending
    [Documentation]    Comprehensive test: Error patterns and analytics
    [Tags]    US-053    comprehensive    log-analytics
    
    Given the admin is on the error logs page
    When the admin clicks "Log Analytics"
    Then an analytics dashboard should appear
    And error frequency chart should be visible
    And most common errors should be listed
    And error distribution by level should show
    And error trends chart should be displayed
    And the admin can click any error to see all occurrences
    And related errors should be grouped automatically
    And the admin can set alerts for specific error patterns
    And critical errors should be highlighted with red badges
    And the page should auto-refresh every 30 seconds
    And the admin can clear old logs (older than 90 days)


*** Keywords ***
The admin is on the system dashboard
    [Documentation]    Navigate to dashboard
    Click Element    id=admin-menu
    Click Element    id=dashboard-menu
    Wait Until Page Contains Element    id=system-dashboard

The admin clicks "View Error Logs"
    [Documentation]    Opens error logs
    Click Button    id=view-error-logs-button
    Wait Until Element Is Visible    css=.error-logs-page    timeout=10s

The error logs page should appear
    [Documentation]    Verifies error logs page
    Element Should Be Visible    css=.error-logs-page
    Page Should Contain    System Error Logs

Logs should display in reverse chronological order (newest first)
    [Documentation]    Verifies sort order
    Log    Logs displayed with newest entries first

Each log entry should show:
    [Documentation]    Verifies log entry fields
    Element Should Be Visible    css=.log-entry-timestamp
    Element Should Be Visible    css=.log-entry-level
    Element Should Be Visible    css=.log-entry-message
    Element Should Be Visible    css=.log-entry-stacktrace

Logs should be paginated (${count} entries per page)
    [Documentation]    Verifies pagination
    Element Should Be Visible    css=.pagination-controls
    Log    Pagination set to ${count} entries per page

The admin can filter by error level
    [Documentation]    Filter capability
    Element Should Be Visible    id=error-level-filter
    Select From List By Label    id=error-level-filter    Error

The admin can search logs by keyword
    [Documentation]    Search capability
    Element Should Be Visible    id=log-search-input
    Input Text    id=log-search-input    test search

The admin is viewing error logs
    [Documentation]    Admin on error logs page
    The admin is on the system dashboard
    The admin clicks "View Error Logs"

The admin filters by date range "${range}"
    [Documentation]    Date range filter
    Click Element    id=date-range-filter
    Select From List By Label    id=date-range-filter    ${range}

Filters by error level "${level}"
    [Documentation]    Error level filter
    Select From List By Label    id=error-level-filter    ${level}

Searches for keyword "${keyword}"
    [Documentation]    Keyword search
    Input Text    id=log-search-input    ${keyword}
    Click Button    id=search-logs-button

Only matching log entries should display
    [Documentation]    Filtered results
    Log    Only logs matching filters are displayed

The filter count should show "${text}"
    [Documentation]    Result count display
    Element Should Contain    css=.filter-result-count    ${text}

The admin clicks "Export to CSV"
    [Documentation]    Export action
    Click Button    id=export-logs-csv-button

A CSV file should download with filtered logs
    [Documentation]    CSV download
    Log    CSV file downloads with filtered log entries

CSV should include all log fields
    [Documentation]    CSV completeness
    Log    CSV includes timestamp, level, message, stack trace, context

Filename should include date range and filters applied
    [Documentation]    Filename format
    Log    CSV filename includes filters (e.g., error_logs_last7days_error.csv)

Export should complete within ${seconds} seconds for ${count}+ entries
    [Documentation]    Export performance
    Log    Export completes within ${seconds} seconds for ${count}+ entries

The admin is on the error logs page
    [Documentation]    On error logs page
    The admin is viewing error logs

The admin clicks "Log Analytics"
    [Documentation]    Opens analytics
    Click Button    id=log-analytics-button
    Wait Until Element Is Visible    css=.log-analytics-dashboard

An analytics dashboard should appear showing:
    [Documentation]    Analytics dashboard content
    Element Should Be Visible    css=.error-frequency-chart
    Element Should Be Visible    css=.common-errors-list
    Element Should Be Visible    css=.error-distribution-chart
    Element Should Be Visible    css=.error-trends-chart

The admin can click any error to see all occurrences
    [Documentation]    Error drill-down
    Element Should Be Visible    css=.error-clickable

Related errors should be grouped automatically
    [Documentation]    Error grouping
    Log    Similar errors are automatically grouped

The admin can set alerts for specific error patterns
    [Documentation]    Pattern alerts
    Element Should Be Visible    id=set-error-alert-button

Critical errors should be highlighted with red badges
    [Documentation]    Critical highlighting
    Element Should Be Visible    css=.critical-error-badge

The page should auto-refresh every ${seconds} seconds
    [Documentation]    Auto-refresh
    Log    Page auto-refreshes every ${seconds} seconds

The admin can clear old logs (older than ${days} days)
    [Documentation]    Log cleanup
    Element Should Be Visible    id=clear-old-logs-button
    Log    Admin can clear logs older than ${days} days

Each log entry should show timestamp
    [Documentation]    Timestamp field
    Element Should Be Visible    css=.log-entry-timestamp

Each log entry should show error level
    [Documentation]    Error level field
    Element Should Be Visible    css=.log-entry-level

Each log entry should show error message
    [Documentation]    Error message field
    Element Should Be Visible    css=.log-entry-message

Each log entry should show stack trace
    [Documentation]    Stack trace field
    Element Should Be Visible    css=.log-entry-stacktrace

Each log entry should show user context
    [Documentation]    User context field
    Element Should Be Visible    css=.log-entry-context

An analytics dashboard should appear
    [Documentation]    Analytics dashboard visible
    Element Should Be Visible    css=.log-analytics-dashboard

Error frequency chart should be visible
    [Documentation]    Frequency chart
    Element Should Be Visible    css=.error-frequency-chart

Most common errors should be listed
    [Documentation]    Common errors list
    Element Should Be Visible    css=.common-errors-list

Error distribution by level should show
    [Documentation]    Distribution chart
    Element Should Be Visible    css=.error-distribution-chart

Error trends chart should be displayed
    [Documentation]    Trends chart
    Element Should Be Visible    css=.error-trends-chart


US-054: Database Storage Capacity Notification
    [Documentation]    As an administrator, I want to be notified when database storage
    ...                reaches 80% capacity so that I can take action before running
    ...                out of space.
    [Tags]    US-054    database    storage    notifications
    
    Given the admin is on the system monitoring dashboard
    When the database storage reaches 80% capacity
    Then a warning notification should appear in the admin portal
    And the notification should display "Database storage at 80% capacity"
    And the notification should show current usage (XX GB of YY GB)
    And the notification should show projected days until full
    And an email alert should be sent to configured addresses
    And the email should be delivered within 1 minute
    And the notification should include cleanup recommendations
    And a "View Details" button should link to storage analytics


US-054-Edge: Multiple Storage Threshold Alerts
    [Documentation]    Edge case: Escalating alerts at different thresholds
    [Tags]    US-054    edge-case    storage-alerts
    
    Given the admin is monitoring system storage
    When database storage reaches 75% capacity
    Then an "Info" level notification should appear
    When storage increases to 80% capacity
    Then notification level should upgrade to "Warning"
    And email should be sent to configured addresses
    When storage reaches 90% capacity
    Then notification level should escalate to "Critical"
    And additional emails should be sent to escalation contacts
    And critical alert banner should appear on all admin pages
    And automatic cleanup tasks should be suggested


US-054-Comprehensive: Storage Management And Cleanup
    [Documentation]    Comprehensive test: Storage analytics and management
    [Tags]    US-054    comprehensive    storage-management
    
    Given the admin receives 80% storage alert
    When the admin clicks "View Details"
    Then storage analytics dashboard should appear
    And storage usage breakdown by table should display
    And growth trend chart (last 30 days) should be visible
    And largest tables should be highlighted
    When the admin clicks "Cleanup Options"
    Then available cleanup tasks should be listed
    And estimated space recovery should be shown per task
    And the admin can archive old transactions (older than 3 years)
    And the admin can purge old logs (older than 90 days)
    And cleanup confirmation should require password
    And cleanup progress should display real-time


US-055: Automated Backup Confirmation Notifications
    [Documentation]    As an administrator, I want to receive confirmation that
    ...                automated daily backups completed successfully so that I know
    ...                my data is protected.
    [Tags]    US-055    backups    notifications    data-protection
    
    Given automated daily backup is configured
    When the daily backup task completes successfully
    Then a success notification should appear in admin portal
    And the notification should display "Daily backup completed successfully"
    And the notification should show backup timestamp
    And the notification should show backup file size
    And the notification should show backup location
    And an email confirmation should be sent to configured addresses
    And the email should be delivered within 5 minutes of completion
    And backup verification checksum should be included
    And the admin can download backup directly from notification


US-055-Edge: Backup Failure Alerts
    [Documentation]    Edge case: Alerts when backups fail
    [Tags]    US-055    edge-case    backup-failures
    
    Given automated daily backup is configured
    When the daily backup task fails
    Then a critical alert notification should appear
    And the alert should display "Daily backup FAILED"
    And the alert should show failure reason
    And the alert should show failure timestamp
    And an urgent email should be sent immediately
    And the email subject should contain "URGENT: Backup Failed"
    And retry instructions should be provided
    When the admin clicks "Retry Backup"
    Then manual backup should initiate
    And progress should display in real-time
    And success/failure should be reported upon completion


US-055-Comprehensive: Backup History And Management
    [Documentation]    Comprehensive test: Backup monitoring and management
    [Tags]    US-055    comprehensive    backup-management
    
    Given the admin is on the backup management page
    When the admin clicks "Backup History"
    Then backup history should display (last 30 days)
    And each entry should show date, time, size, status
    And successful backups should have green checkmarks
    And failed backups should have red warning icons
    And the admin can filter by status (Success/Failed)
    When the admin selects a successful backup
    Then backup details modal should appear
    And verification checksum should be displayed
    And the admin can restore from this backup
    And the admin can download backup file
    When the admin clicks "Test Restore"
    Then test restore to staging environment should initiate
    And restore progress should display
    And restore verification should confirm data integrity


US-056: Test Email Notifications On Demand
    [Documentation]    As an administrator, I want to test email notifications on
    ...                demand so that I can verify the notification system is working
    ...                correctly.
    [Tags]    US-056    email    testing    notifications
    
    Given the admin is on the notification settings page
    When the admin clicks "Test Email Notifications"
    Then a test configuration modal should appear
    And the admin can select notification types to test
    And the admin can specify recipient email addresses
    When the admin clicks "Send Test Emails"
    Then test emails should be sent for selected types
    And a confirmation message should display "Test emails sent"
    And the admin should receive test emails within 1 minute
    And each test email should be labeled "TEST NOTIFICATION"
    And test emails should contain sample data
    And test results should log in notification history


US-056-Edge: Verify Email Delivery And Formatting
    [Documentation]    Edge case: Comprehensive email testing
    [Tags]    US-056    edge-case    email-verification
    
    Given the admin is testing email notifications
    When the admin sends test emails for all notification types
    Then test emails should be sent for each type:
    And test email for "Low Stock Alert"
    And test email for "Payment Failure"
    And test email for "System Error"
    And test email for "Backup Confirmation"
    And test email for "Storage Warning"
    When the admin checks received emails
    Then each email should have correct subject line
    And each email should have proper HTML formatting
    And each email should include company branding
    And links in emails should be clickable
    And email headers should include proper sender information


US-056-Comprehensive: Email Configuration And Troubleshooting
    [Documentation]    Comprehensive test: Email system diagnostics
    [Tags]    US-056    comprehensive    email-diagnostics
    
    Given the admin is on notification settings
    When the admin clicks "Test Email Configuration"
    Then email configuration should be validated
    And SMTP server connection should be tested
    And authentication credentials should be verified
    And test result should display (Success/Failed)
    When test succeeds
    Then "Email system is properly configured" should display
    And configuration details should be shown
    When test fails
    Then "Email configuration error" should display
    And specific error message should be shown
    And troubleshooting steps should be provided
    And the admin can view detailed error logs
    When the admin clicks "Send Diagnostic Report"
    Then full diagnostic report should be emailed to admin
    And report should include all test results
    And report should include configuration status


US-057: QR Code Generation Performance
    [Documentation]    As a system, I want to generate QR codes within 1 second so
    ...                that customers experience minimal wait time during checkout.
    [Tags]    US-057    performance    qr-code    system-requirement
    
    Given a customer has items in cart
    When the customer clicks "Checkout"
    Then the system should generate MobilePay QR code
    And QR code generation should complete within 1 second
    And QR code should be displayed immediately
    And QR code should be scannable
    And payment URL should be embedded in QR code
    And unique transaction ID should be included
    And QR code should use optimal error correction level
    And performance should be logged for monitoring


US-057-Edge: QR Code Generation Under Load
    [Documentation]    Edge case: Performance with multiple simultaneous requests
    [Tags]    US-057    edge-case    load-testing
    
    Given the system is under moderate load
    When 10 customers simultaneously request checkout
    Then all QR codes should generate within 1 second each
    And no generation should fail due to load
    And each QR code should be unique
    And system resources should remain stable
    When the system is under heavy load
    And 50 customers simultaneously request checkout
    Then QR code generation should still complete within 2 seconds
    And degradation should be graceful (no failures)
    And load balancing should distribute requests evenly


US-057-Comprehensive: QR Code Quality And Validation
    [Documentation]    Comprehensive test: QR code generation and validation
    [Tags]    US-057    comprehensive    qr-validation
    
    Given a customer requests checkout
    When QR code is generated
    Then QR code image should be rendered correctly
    And QR code should be 300x300 pixels minimum
    And QR code should have high contrast (black on white)
    And quiet zone should surround QR code (minimum 4 modules)
    And QR code should use error correction level M or H
    When QR code is scanned with camera
    Then payment URL should be correctly decoded
    And URL should contain valid transaction ID
    And URL should be HTTPS encrypted
    And URL should not be expired (valid for 15 minutes)
    When QR code generation fails
    Then error should be logged
    And customer should see friendly error message
    And retry button should be available


US-058: Kiosk Display Update Performance
    [Documentation]    As a system, I want to update the kiosk display within 300ms
    ...                when filters are changed so that the interface feels responsive
    ...                and immediate.
    [Tags]    US-058    performance    ui-responsiveness    system-requirement
    
    Given the customer is viewing products on kiosk
    When the customer selects "Drinks" category filter
    Then product grid should update within 300ms
    And loading spinner should not be visible
    And UI should not freeze or lag
    And filtered products should display immediately
    And product count should update
    And scroll position should reset to top
    And filter selection should be highlighted
    And performance metrics should be logged


US-058-Edge: Filter Performance With Large Dataset
    [Documentation]    Edge case: Performance with 100+ products
    [Tags]    US-058    edge-case    performance-testing
    
    Given the system has 100+ products configured
    When the customer changes category filter
    Then display update should complete within 300ms
    And all product images should load progressively
    And product grid should remain responsive
    When the customer rapidly changes filters multiple times
    Then each filter change should complete within 300ms
    And previous filter requests should be cancelled
    And UI should remain responsive throughout
    And no duplicate requests should be made


US-058-Comprehensive: Overall Kiosk Responsiveness
    [Documentation]    Comprehensive test: Kiosk UI performance metrics
    [Tags]    US-058    comprehensive    ui-performance
    
    Given the kiosk is displaying products
    When the customer performs various interactions:
    Then clicking product card should open details within 200ms
    And adding to cart should update cart icon within 100ms
    And changing quantity with +/- should update within 150ms
    And removing item from cart should update within 200ms
    And searching products should show results within 300ms
    And sorting products should reorder within 300ms
    When performance is measured over 100 interactions
    Then 95th percentile response time should be under 300ms
    And no interaction should exceed 500ms
    And frame rate should remain above 30 FPS
    And memory usage should remain stable
    When performance degrades
    Then system should log performance metrics
    And alerts should be sent to administrators


# Additional Keywords for New Tests

The admin is on the system monitoring dashboard
    [Documentation]    Navigate to monitoring dashboard
    Click Element    id=admin-menu
    Click Element    id=monitoring-menu
    Wait Until Page Contains Element    id=monitoring-dashboard

The database storage reaches ${percentage}% capacity
    [Documentation]    Simulates storage reaching threshold
    Log    Database storage at ${percentage}% capacity

A warning notification should appear in the admin portal
    [Documentation]    Verifies warning notification
    Wait Until Element Is Visible    css=.storage-warning-notification    timeout=10s
    Element Should Contain    css=.storage-warning-notification    storage at

The notification should display "${message}"
    [Documentation]    Verifies notification message
    Element Should Contain    css=.notification-message    ${message}

The notification should show current usage (XX GB of YY GB)
    [Documentation]    Verifies storage usage display
    Element Should Be Visible    css=.storage-usage-display

Automated daily backup is configured
    [Documentation]    Verifies backup configuration
    Log    Automated daily backup configured

The daily backup task completes successfully
    [Documentation]    Simulates successful backup
    Log    Daily backup completed successfully

The daily backup task fails
    [Documentation]    Simulates backup failure
    Log    Daily backup failed

The admin is on the notification settings page
    [Documentation]    Navigate to notification settings
    Click Element    id=admin-menu
    Click Element    id=settings-menu
    Click Element    id=notifications-tab
    Wait Until Page Contains Element    id=notification-settings

The admin clicks "Test Email Notifications"
    [Documentation]    Clicks test button
    Click Button    id=test-email-button
    Wait Until Element Is Visible    css=.test-email-modal    timeout=5s

A test configuration modal should appear
    [Documentation]    Verifies test modal
    Element Should Be Visible    css=.test-email-modal
    Page Should Contain    Test Email Notifications

The admin can select notification types to test
    [Documentation]    Verifies notification type selection
    Element Should Be Visible    css=.notification-type-checkboxes

A customer has items in cart
    [Documentation]    Sets up cart with items
    Log    Customer has items in cart

The customer clicks "Checkout"
    [Documentation]    Initiates checkout
    Click Button    id=checkout-button

The system should generate MobilePay QR code
    [Documentation]    Verifies QR code generation
    Wait Until Element Is Visible    css=.qr-code-image    timeout=2s

QR code generation should complete within ${seconds} second
    [Documentation]    Verifies generation time
    Log    QR code generated within ${seconds} second

The customer is viewing products on kiosk
    [Documentation]    Customer on product browsing page
    Log    Customer viewing products

The customer selects "${category}" category filter
    [Documentation]    Selects category filter
    Click Element    css=.category-filter[data-category="${category}"]

Product grid should update within ${ms}ms
    [Documentation]    Verifies update performance
    Log    Product grid updated within ${ms}ms

The customer performs various interactions:
    [Documentation]    Performs multiple UI interactions
    Log    Testing multiple UI interactions

Clicking product card should open details within ${ms}ms
    [Documentation]    Tests product detail opening
    Log    Product details open within ${ms}ms
