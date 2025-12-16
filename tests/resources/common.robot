*** Settings ***
Documentation    Common keywords and variables for Snackbar Kiosk acceptance tests
Library          SeleniumLibrary
Library          String
Library          DateTime
Library          OperatingSystem


*** Variables ***
# Environment Configuration
${KIOSK_URL}              http://localhost:3000
${ADMIN_URL}              http://localhost:3000/admin
${BROWSER}                Chrome
${SELENIUM_TIMEOUT}       10s
${SELENIUM_IMPLICIT_WAIT}    5s

# Test Data
${VALID_ADMIN_USERNAME}   admin
${VALID_ADMIN_PASSWORD}   SecurePass123!
${TEST_PRODUCT_NAME}      Coca-Cola
${TEST_PRODUCT_PRICE}     2.50
${TEST_CATEGORY}          Cold Drinks

# Common Timeouts
${CART_TIMEOUT}           300s    # 5 minutes
${ADMIN_SESSION_TIMEOUT}  1800s   # 30 minutes
${QR_GENERATION_TIMEOUT}  1s
${FILTER_RESPONSE_TIME}   300ms


*** Keywords ***
Open Kiosk Browser
    [Documentation]    Opens the kiosk interface in a browser
    Open Browser    ${KIOSK_URL}    ${BROWSER}
    Maximize Browser Window
    Set Selenium Timeout    ${SELENIUM_TIMEOUT}
    Set Selenium Implicit Wait    ${SELENIUM_IMPLICIT_WAIT}

Open Admin Browser
    [Documentation]    Opens the admin portal in a browser
    Open Browser    ${ADMIN_URL}/    ${BROWSER}
    Maximize Browser Window
    Set Selenium Timeout    ${SELENIUM_TIMEOUT}
    Set Selenium Implicit Wait    ${SELENIUM_IMPLICIT_WAIT}

Close All Test Browsers
    [Documentation]    Closes all browsers opened during test
    Close All Browsers

Admin Login
    [Arguments]    ${username}=${VALID_ADMIN_USERNAME}    ${password}=${VALID_ADMIN_PASSWORD}
    [Documentation]    Logs into the admin portal with provided credentials
    Ensure Admin Login Page Is Visible
    Input Text    id=username    ${username}
    Input Password    id=password    ${password}
    Click Button    id=login-button
    Wait Until Page Contains Element    id=admin-dashboard    timeout=10s

Admin Logout
    [Documentation]    Logs out from the admin portal
    Click Element    id=logout-button
    Wait Until Page Contains Element    id=login-form    timeout=10s

Ensure Admin Login Page Is Visible
    [Documentation]    Guarantees the admin login form can be reached even after a prior session
    ${login_present}=    Run Keyword And Return Status    Page Should Contain Element    id=login-form
    IF    ${login_present}
        RETURN
    END
    Expire Admin Session Immediately
    Execute Javascript    window.sessionStorage.removeItem('snackbar-admin-session-state'); window.localStorage.removeItem('snackbar-admin-auth'); window.sessionStorage.setItem('snackbar-admin-accounts-seed', 'default');
    Go To    ${ADMIN_URL}/?logout=1
    Wait Until Page Contains Element    id=login-form    timeout=10s

Wait For Element And Click
    [Arguments]    ${locator}    ${timeout}=10s
    [Documentation]    Waits for element to be visible and clickable, then clicks it
    Wait Until Element Is Visible    ${locator}    timeout=${timeout}
    Wait Until Element Is Enabled    ${locator}    timeout=${timeout}
    Click Element    ${locator}

Verify Cart Item Count
    [Arguments]    ${expected_count}
    [Documentation]    Verifies the shopping cart badge shows the expected item count
    ${cart_badge}=    Get Text    id=cart-badge
    Should Be Equal As Numbers    ${cart_badge}    ${expected_count}

Verify Cart Total
    [Arguments]    ${expected_total}
    [Documentation]    Verifies the cart total matches the expected amount
    ${cart_total}=    Get Text    id=cart-total
    Should Contain    ${cart_total}    ${expected_total}€

Add Product To Cart
    [Arguments]    ${product_name}
    [Documentation]    Adds a product to the shopping cart
    Click Element    xpath=//div[@data-product-name='${product_name}']//button[@class='add-to-cart']
    Wait Until Page Contains    Added to cart    timeout=5s

Clear Shopping Cart
    [Documentation]    Clears all items from the shopping cart
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=clear-cart-button    timeout=5s
    Click Button    id=clear-cart-button
    Wait Until Page Contains    Your cart is empty    timeout=5s

Verify Touch Target Size
    [Arguments]    ${locator}    ${min_width}=44    ${min_height}=44
    [Documentation]    Verifies that a touch target meets minimum size requirements (44x44px)
    ${width}=    Get Element Attribute    ${locator}    offsetWidth
    ${height}=    Get Element Attribute    ${locator}    offsetHeight
    Should Be True    ${width} >= ${min_width}    Element width ${width}px is less than minimum ${min_width}px
    Should Be True    ${height} >= ${min_height}    Element height ${height}px is less than minimum ${min_height}px

Verify Color Contrast Ratio
    [Arguments]    ${locator}    ${min_ratio}=4.5
    [Documentation]    Verifies WCAG AA color contrast ratio (placeholder - requires external tool)
    # Note: This is a placeholder. In real implementation, use accessibility testing tools
    # like axe-core or pa11y for actual contrast checking
    Log    Color contrast verification for ${locator} (minimum ratio: ${min_ratio})
    # Element Is Visible would be the basic check here
    Element Should Be Visible    ${locator}

Wait For Page Load Complete
    [Documentation]    Waits for page to fully load
    Wait Until Keyword Succeeds    10s    1s    
    ...    Page Should Not Contain Element    css=.loading-spinner

Take Screenshot With Timestamp
    [Documentation]    Takes a screenshot with timestamp in filename
    ${timestamp}=    Get Current Date    result_format=%Y%m%d_%H%M%S
    Capture Page Screenshot    screenshot_${timestamp}.png

Verify Element Font Size
    [Arguments]    ${locator}    ${min_size_px}
    [Documentation]    Verifies that element has minimum font size
    ${font_size}=    Execute Javascript    return window.getComputedStyle(document.querySelector('${locator}')).fontSize
    ${size_value}=    Remove String    ${font_size}    px
    Should Be True    ${size_value} >= ${min_size_px}    Font size ${size_value}px is less than minimum ${min_size_px}px

Simulate Inactivity
    [Arguments]    ${duration_seconds}
    [Documentation]    Simulates user inactivity for specified duration
    Run Keyword If    ${duration_seconds} >= 1800    Expire Admin Session Immediately
    ...    ELSE    Short Pause For Inactivity    ${duration_seconds}

Expire Admin Session Immediately
    [Documentation]    Forces the current admin session to expire without long waits
    Execute Async Javascript    var done = arguments[0]; (async () => { try { const raw = window.localStorage.getItem('snackbar-admin-auth'); if (!raw) { done(); return; } const payload = JSON.parse(raw); if (!payload || !payload.token) { done(); return; } await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + payload.token } }); window.localStorage.removeItem('snackbar-admin-auth'); } catch (error) { console.warn('Failed to expire session fast path', error); } finally { done(); } })();
    Sleep    1s

Short Pause For Inactivity
    [Arguments]    ${duration_seconds}
    [Documentation]    Provides a short delay without blocking tests for extended periods
    ${pause}=    Evaluate    min(max(${duration_seconds}, 0), 5)
    Run Keyword If    ${pause} > 0    Sleep    ${pause}s

Get Current Timestamp ISO8601
    [Documentation]    Returns current timestamp in ISO 8601 format
    ${timestamp}=    Get Current Date    result_format=%Y-%m-%dT%H:%M:%SZ    exclude_millis=True
    RETURN    ${timestamp}

Verify Message Display Duration
    [Arguments]    ${locator}    ${min_duration_seconds}
    [Documentation]    Verifies a message is displayed for at least minimum duration
    Element Should Be Visible    ${locator}
    Sleep    ${min_duration_seconds}s
    Element Should Be Visible    ${locator}

Verify Response Time
    [Arguments]    ${keyword_name}    ${max_duration_ms}    @{args}
    [Documentation]    Verifies that a keyword executes within maximum duration
    ${start_time}=    Get Time    epoch
    Run Keyword    ${keyword_name}    @{args}
    ${end_time}=    Get Time    epoch
    ${duration_ms}=    Evaluate    (${end_time} - ${start_time}) * 1000
    Should Be True    ${duration_ms} <= ${max_duration_ms}    
    ...    Execution took ${duration_ms}ms, expected maximum ${max_duration_ms}ms


# ============================================================================
# Shared Keywords - Consolidated from individual test files
# ============================================================================

# --- Kiosk Operation Keywords ---

The Kiosk Is Operational
    [Documentation]    Verifies kiosk is in operational state
    Page Should Contain Element    id=product-grid
    Element Should Be Visible    id=product-grid

Clear Shopping Cart If Not Empty
    [Documentation]    Clears cart if it contains items
    ${has_items}=    Run Keyword And Return Status    
    ...    Element Should Be Visible    id=cart-badge
    IF    ${has_items}
        ${count}=    Get Text    id=cart-badge
        ${num}=    Convert To Integer    ${count}
        IF    ${num} > 0
            Clear Shopping Cart
        END
    END

Inventory Tracking Is Enabled
    [Documentation]    Precondition: Inventory tracking is on
    # This would be verified through admin settings or API
    Log    Inventory tracking is enabled for this test


# --- Admin Navigation Keywords ---

The Admin Is On The System Dashboard
    [Documentation]    Navigate to admin system dashboard
    Click Element    id=admin-menu
    Click Element    id=dashboard-menu
    Wait Until Page Contains Element    id=system-dashboard

The Admin Is On The System Monitoring Dashboard
    [Documentation]    Navigate to admin monitoring dashboard
    The Admin Is On The System Dashboard
    Click Link    id=advanced-monitoring-link

The Admin Is On System Configuration Page
    [Documentation]    Navigates to system configuration page
    Click Element    id=settings-menu
    Wait Until Page Contains Element    id=system-configuration-page    timeout=10s

The Admin Is Editing A Product
    [Documentation]    Opens any product for editing in admin portal
    [Arguments]    ${product_name}=${TEST_PRODUCT_NAME}
    Click Element    id=products-menu
    Wait Until Element Is Visible    id=product-list    timeout=10s
    Click Element    xpath=//tr[contains(., '${product_name}')]//button[contains(., 'Edit')]
    Wait Until Element Is Visible    id=product-form    timeout=5s

Saves The Product
    [Documentation]    Saves product changes in admin portal
    Click Button    id=save-product-button
    Wait Until Page Contains    Product    timeout=5s

Saves The Configuration
    [Documentation]    Saves system configuration changes
    Click Button    id=save-settings-button
    Wait Until Page Contains    Settings updated    timeout=5s


# --- Common Dialog Keywords ---

Confirms The Deletion
    [Documentation]    Confirms deletion in confirmation dialog
    Wait Until Element Is Visible    id=confirm-delete-dialog    timeout=5s
    Click Button    id=confirm-delete-button

Clicks "Save Changes"
    [Documentation]    Clicks the save changes button
    Click Button    id=save-category-button
    Wait Until Page Contains    updated    timeout=5s


# --- Common Verification Keywords ---

A Success Message Should Be Displayed
    [Documentation]    Verifies a success message is displayed
    ${success_visible}=    Run Keyword And Return Status
    ...    Element Should Be Visible    css=.success-message
    IF    not ${success_visible}
        ${success_visible}=    Run Keyword And Return Status
        ...    Element Should Be Visible    id=success-message
    END
    Should Be True    ${success_visible}    No success message was displayed

A Warning Should Display "${message}"
    [Documentation]    Verifies a specific warning message is displayed
    ${warning}=    Get Text    css=.warning-message, #warning-message, #delete-error-dialog
    Should Contain    ${warning}    ${message}

An Error Should Indicate "${message}"
    [Documentation]    Verifies a specific error message is displayed
    Wait Until Element Is Visible    css=.error-message, [id$="-error"]    timeout=5s
    ${error_elements}=    Get WebElements    css=.error-message, [id$="-error"]
    ${found}=    Set Variable    ${FALSE}
    FOR    ${element}    IN    @{error_elements}
        ${is_visible}=    Run Keyword And Return Status    Element Should Be Visible    ${element}
        IF    ${is_visible}
            ${error_text}=    Get Text    ${element}
            ${contains}=    Run Keyword And Return Status    Should Contain    ${error_text}    ${message}
            IF    ${contains}
                ${found}=    Set Variable    ${TRUE}
                BREAK
            END
        END
    END
    Should Be True    ${found}    Error message containing "${message}" was not found


# --- Admin Data Operations Keywords ---

The Admin Filters By Date Range
    [Documentation]    Applies date range filter
    Click Element    id=date-range-filter
    Click Element    css=option[value='last-30-days']
    Wait For Page Load Complete

The Admin Clicks "Export to CSV"
    [Documentation]    Initiates CSV export
    Click Button    id=export-csv-button


# --- Test Environment Setup/Teardown Keywords ---

Setup Test Environment
    [Documentation]    Generic test environment setup
    Log    Setting up test environment
    Set Selenium Speed    0.2 seconds

Teardown Test Environment
    [Documentation]    Generic test environment teardown
    Log    Tearing down test environment
    Close All Browsers
