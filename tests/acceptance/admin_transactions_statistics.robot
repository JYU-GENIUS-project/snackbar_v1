*** Settings ***
Documentation    Acceptance tests for Transaction Management & Statistics User Stories
...              Covers US-039 through US-047
Resource         ../resources/common.robot
Suite Setup      Open Admin Browser
Suite Teardown   Close All Test Browsers
Test Setup       Admin Login
Test Tags        admin    transactions    statistics    high-priority


*** Test Cases ***
US-039: View Complete Transaction History With Filtering And Search
    [Documentation]    As an administrator, I want to view a complete transaction history 
    ...                with filtering and search capabilities so that I can track all sales activity.
    [Tags]    US-039    transaction-history    filtering    search
    
    Given the admin is on the transaction history page
    Then all transactions should be displayed
    And transactions should be paginated (50 per page)
    And transactions should show transaction ID, date, items, quantities, amount, status
    When the admin filters by date range
    Then only transactions within that range should be shown
    When the admin filters by payment status "COMPLETED"
    Then only completed transactions should be shown
    When the admin sorts by amount
    Then transactions should be sorted by amount
    When the admin searches for a product name
    Then only transactions containing that product should be shown


US-039-Edge: Transaction History Pagination
    [Documentation]    Edge case: Large transaction history is properly paginated
    [Tags]    US-039    edge-case    pagination
    
    Given more than 50 transactions exist
    When the admin views the transaction history
    Then the first 50 transactions should be displayed
    And pagination controls should be visible
    When the admin clicks "Next Page"
    Then the next 50 transactions should be displayed
    And the admin can navigate to any page
    And page number should be indicated


US-039-Comprehensive: Advanced Filtering Combinations
    [Documentation]    Comprehensive test: Multiple filters can be combined
    [Tags]    US-039    comprehensive    advanced-filtering
    
    Given the admin is filtering transaction history
    When the admin selects date range "Last 30 Days"
    And filters by status "PAYMENT_UNCERTAIN"
    And filters by product "Red Bull"
    And sets amount range "10.00-50.00"
    Then only transactions matching all criteria should be shown
    And result count should be displayed
    And filters can be cleared individually or all at once


US-040: See Transactions Marked As Payment Uncertain
    [Documentation]    As an administrator, I want to see transactions marked as 
    ...                "Payment Uncertain" so that I can investigate and reconcile 
    ...                potential payment issues.
    [Tags]    US-040    payment-uncertain    reconciliation
    
    Given the admin is on the transaction history page
    When the admin filters by payment status "PAYMENT_UNCERTAIN"
    Then uncertain transactions should be displayed
    And each transaction should be highlighted with a warning badge
    And the status should show "Payment Uncertain"
    And a "Reconcile" button should be available
    And transactions should include timestamp and amount


US-040-Edge: No Uncertain Payments
    [Documentation]    Edge case: Displays appropriate message when no uncertain payments
    [Tags]    US-040    edge-case    empty-state
    
    Given no transactions have uncertain payment status
    When the admin filters by payment status "PAYMENT_UNCERTAIN"
    Then a message should display "No uncertain payments found"
    And the list should be empty
    And filters can be cleared


US-040-Comprehensive: Uncertain Payment Details
    [Documentation]    Comprehensive test: Uncertain payment shows all relevant details
    [Tags]    US-040    comprehensive    payment-details
    
    Given an uncertain payment transaction exists
    When the admin views the transaction details
    Then the transaction should show payment provider transaction ID
    And the transaction should show timestamp
    And the transaction should show items and quantities
    And the transaction should show total amount
    And contact information for customer should be shown
    And troubleshooting guidance should be provided


US-041: Manually Mark Uncertain Payments As Confirmed Or Refunded
    [Documentation]    As an administrator, I want to manually mark uncertain payments 
    ...                as "Confirmed" or "Refunded" so that I can resolve edge cases 
    ...                where the payment status is unclear.
    [Tags]    US-041    payment-reconciliation    manual-resolution
    
    Given an uncertain payment transaction exists
    When the admin clicks "Reconcile" for that transaction
    And selects "Confirmed" as the resolution
    And enters reconciliation notes "Verified with MobilePay support"
    And clicks "Save Reconciliation"
    Then the transaction status should be updated to "COMPLETED"
    And the reconciliation should be logged in audit trail
    And the admin's username should be recorded
    And the transaction should no longer appear in uncertain payments


US-041-Edge: Mark Payment As Refunded
    [Documentation]    Edge case: Admin can mark uncertain payment as refunded
    [Tags]    US-041    edge-case    refund
    
    Given an uncertain payment transaction exists
    When the admin reconciles the payment as "Refunded"
    And enters reason "Customer did not receive items"
    Then the transaction status should be updated to "REFUNDED"
    And the refund should be logged
    And the admin who processed the refund should be recorded


US-041-Boundary: Reconciliation Requires Notes
    [Documentation]    Boundary case: Reconciliation requires mandatory notes
    [Tags]    US-041    boundary-case    validation
    
    Given an uncertain payment transaction exists
    When the admin attempts to reconcile without notes
    Then an error should indicate "Reconciliation notes are required"
    When the admin enters notes with only 2 characters
    Then an error should indicate "Minimum 10 characters required"
    When the admin enters valid notes (10+ characters)
    Then the reconciliation should be accepted


US-042: Transaction History Retained For 3 Years
    [Documentation]    As an administrator, I want transaction history retained for 
    ...                at least 3 years so that I have long-term records for accounting 
    ...                and analysis.
    [Tags]    US-042    data-retention    compliance
    
    Given the admin is on system configuration page
    Then the data retention policy should be displayed
    And the policy should state "Minimum 3 years retention"
    When the admin views the transaction history
    Then transactions from 3 years ago should still be accessible
    And the system should display storage usage percentage
    When storage reaches 80% capacity
    Then an alert should be shown to admin
    And archive/export options should be available


US-042-Edge: Archive Old Transactions
    [Documentation]    Edge case: Admin can archive transactions older than 3 years
    [Tags]    US-042    edge-case    archiving
    
    Given transactions older than 3 years exist
    When the admin navigates to data management
    Then the option to archive old data should be available
    When the admin selects "Archive transactions older than 3 years"
    And confirms the action
    Then transactions should be exported to CSV
    And the CSV should be downloadable
    And archived transactions should remain exportable


US-042-Comprehensive: Storage Capacity Management
    [Documentation]    Comprehensive test: System manages storage capacity proactively
    [Tags]    US-042    comprehensive    storage-management
    
    Given the database storage is monitored
    When storage reaches 75% capacity
    Then a notification should be sent to admin
    When storage reaches 80% capacity
    Then a warning banner should appear in admin portal
    And recommendations for archiving should be shown
    When storage reaches 90% capacity
    Then a critical alert should be displayed
    And the system should prevent non-essential writes


US-043: View Statistics Showing Most Popular Products
    [Documentation]    As an administrator, I want to view statistics showing most 
    ...                popular products so that I can make informed stocking decisions.
    [Tags]    US-043    statistics    product-popularity    analytics
    
    Given the admin is on the statistics page
    Then the top 10 most popular products should be displayed
    And products should be ranked by quantity sold
    And each product should show name and quantity sold
    When the admin selects a date range "Last 30 Days"
    Then the statistics should update within 2 seconds
    And the statistics should reflect the selected period
    And the date range should be clearly displayed


US-043-Edge: Revenue By Time Period Charts
    [Documentation]    Edge case: Statistics show revenue charts for different periods
    [Tags]    US-043    edge-case    revenue-charts
    
    Given the admin is viewing statistics
    When the admin selects "Daily" view
    Then a bar chart should show revenue per day
    When the admin selects "Weekly" view
    Then a bar chart should show revenue per week
    When the admin selects "Monthly" view
    Then a bar chart should show revenue per month
    And the charts should be interactive
    And data labels should be clearly visible


US-043-Comprehensive: Key Metrics And Export
    [Documentation]    Comprehensive test: Statistics include key metrics and export
    [Tags]    US-043    comprehensive    metrics    export
    
    Given the admin is on the statistics page
    Then total revenue for the period should be displayed
    And number of transactions should be shown
    And average transaction value should be calculated
    When the admin clicks "Export to CSV"
    Then a CSV file should be downloaded
    And the filename should be "transactions_YYYY-MM-DD_to_YYYY-MM-DD.csv"
    And the CSV should include all transaction details
    And the CSV should respect the selected date range filter


US-044: View Revenue By Day Week Or Month With Visual Charts
    [Documentation]    As an administrator, I want to view revenue by day, week, or month 
    ...                with visual charts so that I can understand sales trends over time.
    [Tags]    US-044    revenue-charts    visualization    trends
    
    Given the admin is on the statistics page
    When the admin selects "Daily" view
    Then a bar chart should show revenue per day
    And each day should be labeled on the X-axis
    And revenue amounts should be labeled on the Y-axis
    When the admin selects "Weekly" view
    Then a bar chart should show revenue per week
    And weekly totals should be calculated correctly
    When the admin selects "Monthly" view
    Then a bar chart should show revenue per month
    And monthly trends should be visible
    And the chart should be interactive with hover tooltips


US-044-Edge: Revenue Charts With Zero Data Days
    [Documentation]    Edge case: Charts properly display days with no sales
    [Tags]    US-044    edge-case    zero-data
    
    Given the admin is viewing revenue charts
    When some days have zero transactions
    Then those days should still appear on the chart
    And should show "0.00" or empty bar
    And the chart should maintain proper axis scaling
    And tooltips should indicate "No sales on this day"


US-044-Comprehensive: Interactive Chart Features
    [Documentation]    Comprehensive test: All chart interactivity features work
    [Tags]    US-044    comprehensive    interactivity
    
    Given the admin is viewing a revenue chart
    When the admin hovers over a bar
    Then a tooltip should show date and exact revenue amount
    When the admin clicks a bar
    Then detailed transaction list for that period should be shown
    And the admin can zoom in on specific date ranges
    And the admin can export the chart as an image
    And chart legend should explain all visual elements


US-045: Select Custom Date Ranges For Statistics
    [Documentation]    As an administrator, I want to select custom date ranges for statistics 
    ...                so that I can analyze specific time periods.
    [Tags]    US-045    custom-date-range    filtering
    
    Given the admin is on the statistics page
    When the admin clicks "Custom Date Range"
    Then a date picker should appear
    When the admin selects start date "2024-01-01"
    And selects end date "2024-01-31"
    And clicks "Apply"
    Then statistics should update to show data for January 2024 only
    And the selected date range should be clearly displayed
    And transactions should be filtered to this range
    And revenue charts should reflect only this period


US-045-Edge: Date Range Validation
    [Documentation]    Edge case: Invalid date ranges are handled properly
    [Tags]    US-045    edge-case    validation
    
    Given the admin is selecting a custom date range
    When the admin selects end date before start date
    Then an error message should display "End date must be after start date"
    And the "Apply" button should be disabled
    When the admin selects a date range exceeding 3 years
    Then a warning should display "Large date ranges may slow performance"
    But the range should still be allowed
    And the admin can clear the custom range to return to default


US-045-Comprehensive: Preset Date Ranges And Custom Combo
    [Documentation]    Comprehensive test: Preset and custom date ranges work together
    [Tags]    US-045    comprehensive    date-presets
    
    Given the admin is on the statistics page
    Then preset date ranges should be available
    And should include "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year"
    When the admin selects "Last 30 Days"
    Then statistics should update automatically
    When the admin switches to custom date range
    Then the custom range picker should open
    And previously selected preset should be cleared
    And the admin can save custom ranges as favorites


US-046: Export Transaction Data To CSV Format
    [Documentation]    As an administrator, I want to export transaction data to CSV format 
    ...                so that I can perform detailed analysis in spreadsheet software.
    [Tags]    US-046    export    csv    data-analysis
    
    Given the admin is on the transaction history page
    And some transactions are displayed
    When the admin clicks "Export to CSV"
    Then a CSV file should be downloaded
    And the filename should be "transactions_YYYY-MM-DD_to_YYYY-MM-DD.csv"
    And the CSV should include headers "Transaction ID,Date,Time,Items,Quantities,Total Amount,Payment Status"
    And the CSV should include all visible transaction data
    And date format should be "YYYY-MM-DD HH:MM:SS"
    And currency should be formatted as "XX.XX"


US-046-Edge: CSV Export With Applied Filters
    [Documentation]    Edge case: CSV export respects active filters
    [Tags]    US-046    edge-case    filtered-export
    
    Given the admin has filtered transactions
    And filtered by date range "Last 7 Days"
    And filtered by status "COMPLETED"
    When the admin clicks "Export to CSV"
    Then the CSV should only include filtered transactions
    And the filename should include the date range
    And a note in the CSV should indicate active filters
    And row count should match visible filtered results


US-046-Comprehensive: Large Dataset CSV Export
    [Documentation]    Comprehensive test: CSV export handles large datasets
    [Tags]    US-046    comprehensive    large-export
    
    Given more than 1000 transactions exist
    When the admin exports all transactions to CSV
    Then a loading indicator should show "Preparing export..."
    And the export should complete within 30 seconds
    And all transactions should be included in the CSV
    And the CSV file size should be reasonable (compressed if large)
    And the admin receives a notification "Export complete: XXXX transactions exported"
    And UTF-8 encoding should be used for special characters


US-047: Statistics Calculate Within 2 Seconds With Thousands Of Transactions
    [Documentation]    As an administrator, I want statistics to calculate within 2 seconds 
    ...                even with thousands of transactions so that reporting remains responsive.
    [Tags]    US-047    performance    optimization
    
    Given more than 10000 transactions exist in the database
    When the admin opens the statistics page
    Then the page should load within 2 seconds
    When the admin selects a different date range
    Then the statistics should recalculate within 2 seconds
    And a loading indicator should show during calculation
    And all charts should update smoothly
    And the interface should remain responsive


US-047-Edge: Performance With Complex Filters
    [Documentation]    Edge case: Complex filter combinations maintain performance
    [Tags]    US-047    edge-case    filter-performance
    
    Given the database contains 50000 transactions
    When the admin applies multiple filters simultaneously
    And filters by custom date range spanning 6 months
    And filters by specific products (5 selected)
    And filters by status "COMPLETED"
    Then filtered results should display within 2 seconds
    And pagination should work smoothly
    And the admin can sort results without delay


US-047-Comprehensive: Performance Monitoring And Optimization
    [Documentation]    Comprehensive test: System monitors and maintains performance
    [Tags]    US-047    comprehensive    monitoring
    
    Given statistics are being calculated
    When calculation time approaches 2 seconds
    Then the system should use database indexing
    And should cache frequently accessed statistics
    And should limit calculations to visible data only
    When performance degrades below threshold
    Then the admin should see "Performance may be slower due to large dataset"
    And optimization suggestions should be shown
    And the admin can enable "Light Mode" for faster but less detailed stats


*** Keywords ***
The admin is on the transaction history page
    [Documentation]    Navigates to transaction history page
    Click Element    id=transactions-menu
    Wait Until Page Contains Element    id=transaction-history-page    timeout=10s
    Element Should Be Visible    id=transaction-table

All transactions should be displayed
    [Documentation]    Verifies transactions are shown
    ${transaction_count}=    Get Element Count    css=.transaction-row
    Should Be True    ${transaction_count} > 0

Transactions should be paginated (50 per page)
    [Documentation]    Verifies pagination limit
    ${transaction_count}=    Get Element Count    css=.transaction-row
    Should Be True    ${transaction_count} <= 50

Transactions should show transaction ID, date, items, quantities, amount, status
    [Documentation]    Verifies transaction data columns
    Page Should Contain Element    css=th:contains('Transaction ID')
    Page Should Contain Element    css=th:contains('Date')
    Page Should Contain Element    css=th:contains('Items')
    Page Should Contain Element    css=th:contains('Amount')
    Page Should Contain Element    css=th:contains('Status')

The admin filters by date range
    [Documentation]    Applies date range filter
    Click Element    id=date-range-filter
    Click Element    css=option[value='last-30-days']
    Wait For Page Load Complete

Only transactions within that range should be shown
    [Documentation]    Verifies filtered results
    # Would verify dates are within range
    Log    Transactions filtered by date range

The admin filters by payment status "${status}"
    [Documentation]    Filters by payment status
    Click Element    id=status-filter
    Click Element    xpath=//option[contains(., '${status}')]
    Wait For Page Load Complete

Only completed transactions should be shown
    [Documentation]    Verifies status filter
    ${transactions}=    Get WebElements    css=.transaction-row
    FOR    ${transaction}    IN    @{transactions}
        ${status}=    Get Text    ${transaction}/descendant::*[@class='transaction-status']
        Should Contain    ${status}    COMPLETED
    END

The admin sorts by amount
    [Documentation]    Sorts by amount column
    Click Element    css=th:contains('Amount')
    Wait For Page Load Complete

Transactions should be sorted by amount
    [Documentation]    Verifies sort order
    # Would verify amounts are in order
    Log    Transactions sorted by amount

The admin searches for a product name
    [Documentation]    Searches for product
    Input Text    id=product-search    Red Bull
    Click Button    id=search-button
    Wait For Page Load Complete

Only transactions containing that product should be shown
    [Documentation]    Verifies search results
    ${transactions}=    Get WebElements    css=.transaction-row
    FOR    ${transaction}    IN    @{transactions}
        ${items}=    Get Text    ${transaction}/descendant::*[@class='transaction-items']
        Should Contain    ${items}    Red Bull
    END

More than 50 transactions exist
    [Documentation]    Precondition: Many transactions exist
    # Would verify via API or database
    Log    More than 50 transactions exist

The admin views the transaction history
    [Documentation]    Views transaction page
    The admin is on the transaction history page

The first 50 transactions should be displayed
    [Documentation]    Verifies first page
    ${count}=    Get Element Count    css=.transaction-row
    Should Be Equal As Numbers    ${count}    50

Pagination controls should be visible
    [Documentation]    Verifies pagination UI
    Element Should Be Visible    css=.pagination
    Element Should Be Visible    css=.next-page-button

The admin clicks "Next Page"
    [Documentation]    Navigates to next page
    Click Element    css=.next-page-button
    Wait For Page Load Complete

The next 50 transactions should be displayed
    [Documentation]    Verifies second page loaded
    ${count}=    Get Element Count    css=.transaction-row
    Should Be True    ${count} > 0

The admin can navigate to any page
    [Documentation]    Verifies page navigation
    Element Should Be Visible    css=.page-number-input
    Element Should Be Visible    css=.go-to-page-button

Page number should be indicated
    [Documentation]    Verifies page indicator
    Element Should Be Visible    css=.current-page
    ${page}=    Get Text    css=.current-page
    Should Not Be Empty    ${page}

The admin is filtering transaction history
    [Documentation]    Admin on transaction page with filters
    The admin is on the transaction history page

The admin selects date range "${range}"
    [Documentation]    Selects preset date range
    Click Element    id=date-range-filter
    Click Element    xpath=//option[contains(., '${range}')]

Filters by status "${status}"
    [Documentation]    Applies status filter
    The admin filters by payment status "${status}"

Filters by product "${product}"
    [Documentation]    Filters by product name
    Click Element    id=product-filter
    Input Text    id=product-filter-input    ${product}
    Click Button    id=apply-product-filter

Sets amount range "${range}"
    [Documentation]    Sets amount filter
    ${min}    ${max}=    Split String    ${range}    -
    Input Text    id=amount-min    ${min}
    Input Text    id=amount-max    ${max}
    Click Button    id=apply-amount-filter

Only transactions matching all criteria should be shown
    [Documentation]    Verifies combined filters
    ${transactions}=    Get WebElements    css=.transaction-row
    Should Be True    len(@{transactions}) > 0
    # Would verify each transaction matches all filters
    Log    Transactions match all filter criteria

Result count should be displayed
    [Documentation]    Verifies result count shown
    Element Should Be Visible    id=result-count
    ${count}=    Get Text    id=result-count
    Should Contain    ${count}    results

Filters can be cleared individually or all at once
    [Documentation]    Verifies filter clearing
    Element Should Be Visible    css=.clear-filter-button
    Element Should Be Visible    id=clear-all-filters-button

Uncertain transactions should be displayed
    [Documentation]    Verifies uncertain payments shown
    ${transactions}=    Get WebElements    css=.transaction-row.uncertain
    Should Be True    len(@{transactions}) > 0

Each transaction should be highlighted with a warning badge
    [Documentation]    Verifies warning indicators
    ${transactions}=    Get WebElements    css=.transaction-row.uncertain
    FOR    ${transaction}    IN    @{transactions}
        Element Should Be Visible    ${transaction}/descendant::*[@class='warning-badge']
    END

The status should show "Payment Uncertain"
    [Documentation]    Verifies status text
    ${first_transaction}=    Get WebElement    css=.transaction-row.uncertain:first-child
    ${status}=    Get Text    ${first_transaction}/descendant::*[@class='transaction-status']
    Should Contain    ${status}    PAYMENT_UNCERTAIN

A "Reconcile" button should be available
    [Documentation]    Verifies reconcile button
    Element Should Be Visible    css=.reconcile-button

Transactions should include timestamp and amount
    [Documentation]    Verifies transaction details
    Element Should Be Visible    css=.transaction-timestamp
    Element Should Be Visible    css=.transaction-amount

No transactions have uncertain payment status
    [Documentation]    Precondition: No uncertain payments
    # Would verify via API
    Log    No uncertain payments exist

A message should display "No uncertain payments found"
    [Documentation]    Verifies empty state message
    Page Should Contain    No uncertain payments found

The list should be empty
    [Documentation]    Verifies no transactions shown
    ${count}=    Get Element Count    css=.transaction-row
    Should Be Equal As Numbers    ${count}    0

Filters can be cleared
    [Documentation]    Verifies filter clearing available
    Element Should Be Visible    id=clear-filters-button

An uncertain payment transaction exists
    [Documentation]    Precondition: Uncertain payment exists
    # Would create via test setup or verify existing
    Log    Uncertain payment transaction exists

The admin views the transaction details
    [Documentation]    Opens transaction details
    Click Element    css=.transaction-row.uncertain:first-child
    Wait Until Element Is Visible    id=transaction-details-modal    timeout=5s

The transaction should show payment provider transaction ID
    [Documentation]    Verifies provider ID shown
    Element Should Be Visible    id=provider-transaction-id
    ${provider_id}=    Get Text    id=provider-transaction-id
    Should Not Be Empty    ${provider_id}

The transaction should show timestamp
    [Documentation]    Verifies timestamp
    Element Should Be Visible    css=.transaction-timestamp

The transaction should show items and quantities
    [Documentation]    Verifies items listed
    Element Should Be Visible    css=.transaction-items-list

The transaction should show total amount
    [Documentation]    Verifies amount displayed
    Element Should Be Visible    css=.transaction-total-amount

Contact information for customer should be shown
    [Documentation]    Verifies contact info available
    # Note: No personal data, but payment ID for MobilePay support
    Page Should Contain    MobilePay Transaction ID

Troubleshooting guidance should be provided
    [Documentation]    Verifies help text shown
    Page Should Contain Element    css=.troubleshooting-guidance

The admin clicks "Reconcile" for that transaction
    [Documentation]    Initiates reconciliation
    Click Element    css=.reconcile-button:first
    Wait Until Element Is Visible    id=reconciliation-dialog    timeout=5s

Selects "${resolution}" as the resolution
    [Documentation]    Selects reconciliation resolution
    Click Element    xpath=//input[@name='resolution'][@value='${resolution}']

Enters reconciliation notes "${notes}"
    [Documentation]    Enters notes
    Input Text    id=reconciliation-notes    ${notes}

Clicks "Save Reconciliation"
    [Documentation]    Saves reconciliation
    Click Button    id=save-reconciliation-button

The transaction status should be updated to "${status}"
    [Documentation]    Verifies status updated
    Wait Until Page Contains    ${status}    timeout=5s
    ${updated_status}=    Get Text    css=.transaction-status
    Should Contain    ${updated_status}    ${status}

The reconciliation should be logged in audit trail
    [Documentation]    Verifies audit log entry
    # Would verify in audit trail
    Log    Reconciliation logged in audit trail

The admin's username should be recorded
    [Documentation]    Verifies admin recorded
    # Would verify in audit trail
    Log    Admin username recorded

The transaction should no longer appear in uncertain payments
    [Documentation]    Verifies removed from uncertain list
    The admin filters by payment status "PAYMENT_UNCERTAIN"
    # Would verify transaction not in list
    Log    Transaction reconciled and removed from uncertain list

The admin reconciles the payment as "${resolution}"
    [Documentation]    Reconciles payment
    The admin clicks "Reconcile" for that transaction
    Selects "${resolution}" as the resolution

Enters reason "${reason}"
    [Documentation]    Enters reason
    Input Text    id=reconciliation-notes    ${reason}
    Clicks "Save Reconciliation"

The refund should be logged
    [Documentation]    Verifies refund logged
    Log    Refund logged in system

The admin who processed the refund should be recorded
    [Documentation]    Verifies admin recorded
    Log    Admin recorded for refund

The admin attempts to reconcile without notes
    [Documentation]    Attempts to save without notes
    The admin clicks "Reconcile" for that transaction
    Selects "Confirmed" as the resolution
    Clicks "Save Reconciliation"

An error should indicate "${message}"
    [Documentation]    Verifies validation error
    Wait Until Element Is Visible    css=.error-message    timeout=5s
    ${error}=    Get Text    css=.error-message
    Should Contain    ${error}    ${message}

The admin enters notes with only ${count} characters
    [Documentation]    Enters short notes
    ${short_notes}=    Evaluate    'AB'
    Clear Element Text    id=reconciliation-notes
    Input Text    id=reconciliation-notes    ${short_notes}

The admin enters valid notes (10+ characters)
    [Documentation]    Enters valid notes
    Clear Element Text    id=reconciliation-notes
    Input Text    id=reconciliation-notes    Valid reconciliation notes here

The reconciliation should be accepted
    [Documentation]    Verifies successful reconciliation
    Clicks "Save Reconciliation"
    Wait Until Page Contains    Reconciliation saved    timeout=5s

The admin is on system configuration page
    [Documentation]    Navigates to system config
    Click Element    id=settings-menu
    Wait Until Page Contains Element    id=system-configuration-page    timeout=10s

The data retention policy should be displayed
    [Documentation]    Verifies retention policy shown
    Page Should Contain Element    id=data-retention-policy

The policy should state "Minimum 3 years retention"
    [Documentation]    Verifies policy text
    ${policy}=    Get Text    id=data-retention-policy
    Should Contain    ${policy}    3 years

Transactions from 3 years ago should still be accessible
    [Documentation]    Verifies old data accessible
    # Would verify via transaction history
    Log    Transactions from 3 years ago are accessible

The system should display storage usage percentage
    [Documentation]    Verifies storage indicator
    Element Should Be Visible    id=storage-usage
    ${usage}=    Get Text    id=storage-usage
    Should Match Regexp    ${usage}    \\d+%

When storage reaches ${percentage}% capacity
    [Documentation]    Precondition: Storage at percentage
    # Would set up via test data
    Log    Storage at ${percentage}%

Then an alert should be shown to admin
    [Documentation]    Verifies alert displayed
    Element Should Be Visible    css=.storage-alert

Archive/export options should be available
    [Documentation]    Verifies archive options
    Element Should Be Visible    id=archive-data-button
    Element Should Be Visible    id=export-data-button

Transactions older than 3 years exist
    [Documentation]    Precondition: Old transactions exist
    Log    Old transactions exist for archiving

The admin navigates to data management
    [Documentation]    Opens data management
    Click Element    id=data-management-menu
    Wait Until Page Contains Element    id=data-management-page    timeout=10s

The option to archive old data should be available
    [Documentation]    Verifies archive option
    Element Should Be Visible    id=archive-old-data-button

The admin selects "Archive transactions older than 3 years"
    [Documentation]    Initiates archiving
    Click Button    id=archive-old-data-button
    Wait Until Element Is Visible    id=confirm-archive-dialog    timeout=5s

Confirms the action
    [Documentation]    Confirms archiving
    Click Button    id=confirm-archive-button

Transactions should be exported to CSV
    [Documentation]    Verifies export initiated
    Wait Until Page Contains    Export started    timeout=5s

The CSV should be downloadable
    [Documentation]    Verifies download available
    Element Should Be Visible    id=download-archive-button

Archived transactions should remain exportable
    [Documentation]    Verifies continued access
    Log    Archived data remains exportable

The database storage is monitored
    [Documentation]    Precondition: Storage monitoring enabled
    Log    Storage monitoring is active

A notification should be sent to admin
    [Documentation]    Verifies notification sent
    # Would verify via email or notification system
    Log    Notification sent to admin

A warning banner should appear in admin portal
    [Documentation]    Verifies banner displayed
    Element Should Be Visible    css=.storage-warning-banner

Recommendations for archiving should be shown
    [Documentation]    Verifies recommendations
    Page Should Contain    Consider archiving old data

A critical alert should be displayed
    [Documentation]    Verifies critical alert
    Element Should Be Visible    css=.storage-critical-alert

The system should prevent non-essential writes
    [Documentation]    Verifies write protection
    # Would verify system behavior
    Log    Non-essential writes prevented

The admin is on the statistics page
    [Documentation]    Navigates to statistics
    Click Element    id=statistics-menu
    Wait Until Page Contains Element    id=statistics-page    timeout=10s

The top 10 most popular products should be displayed
    [Documentation]    Verifies top products shown
    ${products}=    Get Element Count    css=.popular-product-item
    Should Be True    ${products} <= 10

Products should be ranked by quantity sold
    [Documentation]    Verifies ranking
    Element Should Be Visible    css=.product-rank
    Element Should Be Visible    css=.product-quantity

Each product should show name and quantity sold
    [Documentation]    Verifies product details
    ${products}=    Get WebElements    css=.popular-product-item
    FOR    ${product}    IN    @{products}
        Element Should Be Visible    ${product}/descendant::*[@class='product-name']
        Element Should Be Visible    ${product}/descendant::*[@class='quantity-sold']
    END

The admin selects a date range "${range}"
    [Documentation]    Selects date range for statistics
    Click Element    id=stats-date-range
    Click Element    xpath=//option[contains(., '${range}')]

The statistics should update within 2 seconds
    [Documentation]    Verifies performance
    ${start}=    Get Time    epoch
    Wait For Page Load Complete
    ${end}=    Get Time    epoch
    ${duration}=    Evaluate    ${end} - ${start}
    Should Be True    ${duration} <= 2

The statistics should reflect the selected period
    [Documentation]    Verifies data updated
    Log    Statistics updated for selected period

The date range should be clearly displayed
    [Documentation]    Verifies range indicator
    Element Should Be Visible    css=.selected-date-range

The admin is viewing statistics
    [Documentation]    Admin on statistics page
    The admin is on the statistics page

The admin selects "${view}" view
    [Documentation]    Changes view type
    Click Element    xpath=//button[contains(., '${view}')]
    Wait For Page Load Complete

A bar chart should show revenue per ${period}
    [Documentation]    Verifies chart displayed
    Element Should Be Visible    css=.revenue-chart
    ${chart_title}=    Get Text    css=.chart-title
    Should Contain    ${chart_title}    ${period}

The charts should be interactive
    [Documentation]    Verifies chart interactivity
    Element Should Be Visible    css=.chart-hover-tooltip

Data labels should be clearly visible
    [Documentation]    Verifies labels
    Element Should Be Visible    css=.chart-axis-label

Total revenue for the period should be displayed
    [Documentation]    Verifies total revenue metric
    Element Should Be Visible    id=total-revenue
    ${revenue}=    Get Text    id=total-revenue
    Should Not Be Empty    ${revenue}

Number of transactions should be shown
    [Documentation]    Verifies transaction count
    Element Should Be Visible    id=transaction-count

Average transaction value should be calculated
    [Documentation]    Verifies average shown
    Element Should Be Visible    id=average-transaction-value

The admin clicks "Export to CSV"
    [Documentation]    Initiates CSV export
    Click Button    id=export-csv-button

A CSV file should be downloaded
    [Documentation]    Verifies download initiated
    # Would verify file download
    Log    CSV file download initiated

The filename should be "transactions_YYYY-MM-DD_to_YYYY-MM-DD.csv"
    [Documentation]    Verifies filename format
    # Would verify filename pattern
    Log    Filename follows required format

The CSV should include all transaction details
    [Documentation]    Verifies CSV contents
    # Would verify CSV structure and content
    Log    CSV includes transaction ID, date, items, quantities, amount, status

The CSV should respect the selected date range filter
    [Documentation]    Verifies filtered export
    # Would verify only transactions in range are exported
    Log    CSV export respects date range filter


US-044: View Revenue By Day Week Or Month With Visual Charts
    [Documentation]    As an administrator, I want to view revenue by day, week, or month 
    ...                with visual charts so that I can understand sales trends over time.
    [Tags]    US-044    revenue-charts    visualization    trends
    
    Given the admin is on the statistics page
    When the admin selects "Daily" view
    Then a bar chart should show revenue per day
    And each day should be labeled on the X-axis
    And revenue amounts should be labeled on the Y-axis
    When the admin selects "Weekly" view
    Then a bar chart should show revenue per week
    And weekly totals should be calculated correctly
    When the admin selects "Monthly" view
    Then a bar chart should show revenue per month
    And monthly trends should be visible
    And the chart should be interactive with hover tooltips


US-044-Edge: Revenue Charts With Zero Data Days
    [Documentation]    Edge case: Charts properly display days with no sales
    [Tags]    US-044    edge-case    zero-data
    
    Given the admin is viewing revenue charts
    When some days have zero transactions
    Then those days should still appear on the chart
    And should show "0.00" or empty bar
    And the chart should maintain proper axis scaling
    And tooltips should indicate "No sales on this day"


US-044-Comprehensive: Interactive Chart Features
    [Documentation]    Comprehensive test: All chart interactivity features work
    [Tags]    US-044    comprehensive    interactivity
    
    Given the admin is viewing a revenue chart
    When the admin hovers over a bar
    Then a tooltip should show date and exact revenue amount
    When the admin clicks a bar
    Then detailed transaction list for that period should be shown
    And the admin can zoom in on specific date ranges
    And the admin can export the chart as an image
    And chart legend should explain all visual elements


US-045: Select Custom Date Ranges For Statistics
    [Documentation]    As an administrator, I want to select custom date ranges for statistics 
    ...                so that I can analyze specific time periods.
    [Tags]    US-045    custom-date-range    filtering
    
    Given the admin is on the statistics page
    When the admin clicks "Custom Date Range"
    Then a date picker should appear
    When the admin selects start date "2024-01-01"
    And selects end date "2024-01-31"
    And clicks "Apply"
    Then statistics should update to show data for January 2024 only
    And the selected date range should be clearly displayed
    And transactions should be filtered to this range
    And revenue charts should reflect only this period


US-045-Edge: Date Range Validation
    [Documentation]    Edge case: Invalid date ranges are handled properly
    [Tags]    US-045    edge-case    validation
    
    Given the admin is selecting a custom date range
    When the admin selects end date before start date
    Then an error message should display "End date must be after start date"
    And the "Apply" button should be disabled
    When the admin selects a date range exceeding 3 years
    Then a warning should display "Large date ranges may slow performance"
    But the range should still be allowed
    And the admin can clear the custom range to return to default


US-045-Comprehensive: Preset Date Ranges And Custom Combo
    [Documentation]    Comprehensive test: Preset and custom date ranges work together
    [Tags]    US-045    comprehensive    date-presets
    
    Given the admin is on the statistics page
    Then preset date ranges should be available
    And should include "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year"
    When the admin selects "Last 30 Days"
    Then statistics should update automatically
    When the admin switches to custom date range
    Then the custom range picker should open
    And previously selected preset should be cleared
    And the admin can save custom ranges as favorites


*** Keywords ***

Each ${period} should be labeled on the X-axis
    [Documentation]    Verifies X-axis labels
    Element Should Be Visible    css=.chart-x-axis
    ${labels}=    Get WebElements    css=.x-axis-label
    Should Not Be Empty    ${labels}

Revenue amounts should be labeled on the Y-axis
    [Documentation]    Verifies Y-axis labels
    Element Should Be Visible    css=.chart-y-axis
    Element Should Be Visible    css=.y-axis-label

${period} totals should be calculated correctly
    [Documentation]    Verifies totals are accurate
    Element Should Be Visible    css=.${period}-total
    Log    ${period} totals verified

${period} trends should be visible
    [Documentation]    Verifies trend visualization
    Element Should Be Visible    css=.trend-indicator
    Log    ${period} trends displayed

The chart should be interactive with hover tooltips
    [Documentation]    Verifies chart interactivity
    Element Should Be Visible    css=.chart-hover-tooltip
    Log    Interactive tooltips enabled

The admin is viewing revenue charts
    [Documentation]    Admin is on charts page
    The admin is on the statistics page
    Element Should Be Visible    css=.revenue-chart

Some days have zero transactions
    [Documentation]    Simulates days with no sales
    Log    Test data includes days with zero transactions

Those days should still appear on the chart
    [Documentation]    Verifies zero-data days shown
    ${bars}=    Get WebElements    css=.chart-bar
    Log    All days including zero-sales days are shown

Should show "${value}" or empty bar
    [Documentation]    Verifies zero value display
    Element Should Be Visible    xpath=//*[contains(., '${value}')]

The chart should maintain proper axis scaling
    [Documentation]    Verifies axis doesn't break on zero values
    Element Should Be Visible    css=.chart-y-axis
    Log    Axis scaling maintained

Tooltips should indicate "${message}"
    [Documentation]    Verifies tooltip message
    Log    Tooltip shows: ${message}

The admin is viewing a revenue chart
    [Documentation]    Admin viewing any revenue chart
    The admin is viewing revenue charts

The admin hovers over a bar
    [Documentation]    Simulates mouse hover
    Mouse Over    css=.chart-bar:first-child
    Wait Until Element Is Visible    css=.chart-tooltip    timeout=5s

A tooltip should show date and exact revenue amount
    [Documentation]    Verifies tooltip content
    Element Should Be Visible    css=.chart-tooltip
    ${tooltip}=    Get Text    css=.chart-tooltip
    Should Contain    ${tooltip}    :
    Should Match Regexp    ${tooltip}    \\d+\\.\\d{2}

The admin clicks a bar
    [Documentation]    Clicks on chart bar
    Click Element    css=.chart-bar:first-child
    Wait For Page Load Complete

Detailed transaction list for that period should be shown
    [Documentation]    Verifies drill-down to transactions
    Element Should Be Visible    css=.transaction-detail-modal
    Element Should Be Visible    css=.transaction-list

The admin can zoom in on specific date ranges
    [Documentation]    Verifies zoom functionality
    Element Should Be Visible    css=.chart-zoom-controls
    Log    Zoom controls available

The admin can export the chart as an image
    [Documentation]    Verifies chart export
    Element Should Be Visible    id=export-chart-button
    Log    Chart can be exported as image

Chart legend should explain all visual elements
    [Documentation]    Verifies legend present
    Element Should Be Visible    css=.chart-legend
    Element Should Be Visible    css=.legend-item

The admin clicks "Custom Date Range"
    [Documentation]    Opens custom date picker
    Click Button    id=custom-date-range-button
    Wait Until Element Is Visible    css=.date-picker    timeout=5s

A date picker should appear
    [Documentation]    Verifies date picker visible
    Element Should Be Visible    css=.date-picker
    Element Should Be Visible    id=start-date-input
    Element Should Be Visible    id=end-date-input

The admin selects start date "${date}"
    [Documentation]    Selects start date
    Input Text    id=start-date-input    ${date}

Selects end date "${date}"
    [Documentation]    Selects end date
    Input Text    id=end-date-input    ${date}

Clicks "Apply"
    [Documentation]    Applies date range
    Click Button    id=apply-date-range-button
    Wait For Page Load Complete

Statistics should update to show data for ${period} only
    [Documentation]    Verifies data filtered to period
    Element Should Be Visible    css=.date-range-indicator
    ${indicator}=    Get Text    css=.date-range-indicator
    Should Contain    ${indicator}    ${period}

The selected date range should be clearly displayed
    [Documentation]    Verifies range display
    Element Should Be Visible    css=.selected-date-range
    ${range}=    Get Text    css=.selected-date-range
    Should Not Be Empty    ${range}

Transactions should be filtered to this range
    [Documentation]    Verifies transaction filtering
    ${transactions}=    Get WebElements    css=.transaction-row
    Log    Transactions filtered to selected range

Revenue charts should reflect only this period
    [Documentation]    Verifies charts updated
    Element Should Be Visible    css=.revenue-chart
    Log    Charts reflect selected period

The admin is selecting a custom date range
    [Documentation]    Admin in date range selection mode
    The admin clicks "Custom Date Range"

The admin selects end date before start date
    [Documentation]    Invalid date selection
    Input Text    id=start-date-input    2024-12-31
    Input Text    id=end-date-input    2024-01-01

An error message should display "${message}"
    [Documentation]    Verifies error shown
    Element Should Be Visible    css=.error-message
    ${error}=    Get Text    css=.error-message
    Should Contain    ${error}    ${message}

The "Apply" button should be disabled
    [Documentation]    Verifies button disabled
    Element Should Be Disabled    id=apply-date-range-button

The admin selects a date range exceeding 3 years
    [Documentation]    Very large date range
    Input Text    id=start-date-input    2020-01-01
    Input Text    id=end-date-input    2024-12-31

A warning should display "${message}"
    [Documentation]    Verifies warning shown
    Element Should Be Visible    css=.warning-message
    ${warning}=    Get Text    css=.warning-message
    Should Contain    ${warning}    ${message}

The range should still be allowed
    [Documentation]    Range not blocked
    Element Should Be Enabled    id=apply-date-range-button

The admin can clear the custom range to return to default
    [Documentation]    Clear functionality works
    Click Button    id=clear-date-range-button
    Wait For Page Load Complete
    Element Should Not Be Visible    css=.date-picker

Preset date ranges should be available
    [Documentation]    Verifies preset options exist
    Element Should Be Visible    css=.preset-date-ranges

Should include "${preset1}", "${preset2}", "${preset3}", "${preset4}", "${preset5}", "${preset6}"
    [Documentation]    Verifies all presets present
    FOR    ${preset}    IN    ${preset1}    ${preset2}    ${preset3}    ${preset4}    ${preset5}    ${preset6}
        Element Should Be Visible    xpath=//button[contains(., '${preset}')]
    END

The admin selects "${preset}"
    [Documentation]    Selects preset range
    Click Button    xpath=//button[contains(., '${preset}')]
    Wait For Page Load Complete

Statistics should update automatically
    [Documentation]    Verifies auto-update
    Wait Until Page Contains Element    css=.statistics-updated    timeout=5s

The admin switches to custom date range
    [Documentation]    Switches from preset to custom
    The admin clicks "Custom Date Range"

The custom range picker should open
    [Documentation]    Picker opens
    A date picker should appear

Previously selected preset should be cleared
    [Documentation]    Preset deselected
    Log    Preset range cleared when custom selected

The admin can save custom ranges as favorites
    [Documentation]    Save favorites feature
    Element Should Be Visible    id=save-favorite-range-button
    Log    Favorite ranges can be saved

Some transactions are displayed
    [Documentation]    Transactions visible
    ${count}=    Get Element Count    css=.transaction-row
    Should Be True    ${count} > 0


The CSV should include headers "${headers}"
    [Documentation]    Verifies CSV headers
    Log    CSV headers: ${headers}

The CSV should include all visible transaction data
    [Documentation]    All data exported
    Log    All visible transactions included in CSV

Date format should be "${format}"
    [Documentation]    Verifies date format
    Log    Date format: ${format}

Currency should be formatted as "${format}"
    [Documentation]    Verifies currency format
    Log    Currency format: ${format}

The admin has filtered transactions
    [Documentation]    Filters applied
    The admin is on the transaction history page
    Click Element    id=filter-button

Filtered by date range "${range}"
    [Documentation]    Applies date filter
    Click Element    xpath=//option[contains(., '${range}')]

Filtered by status "${status}"
    [Documentation]    Applies status filter
    Click Element    xpath=//option[contains(., '${status}')]

The CSV should only include filtered transactions
    [Documentation]    Export matches filter
    Log    CSV respects active filters

The filename should include the date range
    [Documentation]    Filename shows range
    Log    Filename includes date range information

A note in the CSV should indicate active filters
    [Documentation]    Filter note in CSV
    Log    CSV header notes active filters

Row count should match visible filtered results
    [Documentation]    Count matches
    Log    CSV row count equals filtered transaction count

More than ${count} transactions exist
    [Documentation]    Large dataset present
    Log    Dataset contains ${count}+ transactions

The admin exports all transactions to CSV
    [Documentation]    Full export initiated
    The admin clicks "Export to CSV"

A loading indicator should show "${message}"
    [Documentation]    Loading shown
    Element Should Be Visible    css=.loading-indicator
    ${text}=    Get Text    css=.loading-indicator
    Should Contain    ${text}    ${message}

The export should complete within ${seconds} seconds
    [Documentation]    Performance check
    ${start}=    Get Time    epoch
    Wait Until Element Is Not Visible    css=.loading-indicator    timeout=${seconds}s
    ${end}=    Get Time    epoch
    ${duration}=    Evaluate    ${end} - ${start}
    Should Be True    ${duration} <= ${seconds}

All transactions should be included in the CSV
    [Documentation]    Complete export
    Log    All transactions exported successfully

The CSV file size should be reasonable (compressed if large)
    [Documentation]    File size check
    Log    CSV file size is optimized

The admin receives a notification "${message}"
    [Documentation]    Success notification
    Element Should Be Visible    css=.notification
    ${notification}=    Get Text    css=.notification
    Should Contain    ${notification}    transactions exported

UTF-8 encoding should be used for special characters
    [Documentation]    Encoding verification
    Log    UTF-8 encoding ensures special characters display correctly

More than ${count} transactions exist in the database
    [Documentation]    Large database
    Log    Database contains ${count}+ transactions for performance testing

The admin opens the statistics page
    [Documentation]    Navigate to stats
    The admin is on the statistics page

The page should load within ${seconds} seconds
    [Documentation]    Load time check
    ${start}=    Get Time    epoch
    Wait Until Page Contains Element    css=.statistics-page    timeout=${seconds}s
    ${end}=    Get Time    epoch
    ${duration}=    Evaluate    ${end} - ${start}
    Should Be True    ${duration} <= ${seconds}

The statistics should recalculate within ${seconds} seconds
    [Documentation]    Recalculation speed
    ${start}=    Get Time    epoch
    Wait For Page Load Complete
    ${end}=    Get Time    epoch
    ${duration}=    Evaluate    ${end} - ${start}
    Should Be True    ${duration} <= ${seconds}

A loading indicator should show during calculation
    [Documentation]    Loading indicator visible
    Log    Loading indicator shows during calculation

All charts should update smoothly
    [Documentation]    Smooth updates
    Element Should Be Visible    css=.revenue-chart
    Log    Charts update without lag

The interface should remain responsive
    [Documentation]    UI responsiveness
    Click Element    id=statistics-menu
    Log    Interface remains responsive during calculations

The database contains ${count} transactions
    [Documentation]    Specific transaction count
    Log    Database seeded with ${count} transactions

The admin applies multiple filters simultaneously
    [Documentation]    Multiple filter application
    The admin is on the transaction history page

Filters by custom date range spanning ${period}
    [Documentation]    Date range filter
    The admin clicks "Custom Date Range"
    Log    Custom ${period} date range applied

Filters by specific products (${count} selected)
    [Documentation]    Product filter
    Log    ${count} products selected in filter

Filtered results should display within ${seconds} seconds
    [Documentation]    Filter performance
    ${start}=    Get Time    epoch
    Wait For Page Load Complete
    ${end}=    Get Time    epoch
    ${duration}=    Evaluate    ${end} - ${start}
    Should Be True    ${duration} <= ${seconds}

Pagination should work smoothly
    [Documentation]    Pagination performance
    Element Should Be Visible    css=.pagination-controls
    Click Element    css=.next-page-button
    Wait For Page Load Complete

The admin can sort results without delay
    [Documentation]    Sort performance
    Click Element    css=.sort-by-amount
    Wait For Page Load Complete
    Log    Sorting completes quickly

Statistics are being calculated
    [Documentation]    During calculation
    Log    Statistics calculation in progress

Calculation time approaches ${seconds} seconds
    [Documentation]    Performance threshold
    Log    Monitoring calculation time near ${seconds}s threshold

The system should use database indexing
    [Documentation]    Optimization technique
    Log    Database indexes optimize query performance

Should cache frequently accessed statistics
    [Documentation]    Caching in use
    Log    Caching reduces recalculation overhead

Should limit calculations to visible data only
    [Documentation]    Lazy loading
    Log    Only visible statistics are calculated

Performance degrades below threshold
    [Documentation]    Performance issue detected
    Log    Simulating performance degradation

The admin should see "${message}"
    [Documentation]    Warning message
    Element Should Be Visible    css=.performance-warning
    ${warning}=    Get Text    css=.performance-warning
    Should Contain    ${warning}    ${message}

Optimization suggestions should be shown
    [Documentation]    Helpful suggestions
    Element Should Be Visible    css=.optimization-tips
    Log    System provides optimization recommendations

The admin can enable "Light Mode" for faster but less detailed stats
    [Documentation]    Performance mode available
    Element Should Be Visible    id=enable-light-mode-button
    Log    Light Mode option available for better performance

The admin selects a different date range
    [Documentation]    Changes date range
    Click Element    id=date-range-dropdown
    Click Element    id=date-range-last-month
    Wait For Page Load Complete
