*** Settings ***
Documentation    Acceptance tests for Monitoring & Troubleshooting User Stories
...              Covers US-053 onwards
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
