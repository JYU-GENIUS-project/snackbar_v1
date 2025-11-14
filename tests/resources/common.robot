*** Settings ***
Documentation    Common keywords and variables for Snackbar Kiosk acceptance tests
Library          SeleniumLibrary
Library          String
Library          DateTime


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
    Open Browser    ${ADMIN_URL}    ${BROWSER}
    Maximize Browser Window
    Set Selenium Timeout    ${SELENIUM_TIMEOUT}
    Set Selenium Implicit Wait    ${SELENIUM_IMPLICIT_WAIT}

Close All Test Browsers
    [Documentation]    Closes all browsers opened during test
    Close All Browsers

Admin Login
    [Arguments]    ${username}=${VALID_ADMIN_USERNAME}    ${password}=${VALID_ADMIN_PASSWORD}
    [Documentation]    Logs into the admin portal with provided credentials
    Input Text    id=username    ${username}
    Input Password    id=password    ${password}
    Click Button    id=login-button
    Wait Until Page Contains Element    id=admin-dashboard    timeout=10s

Admin Logout
    [Documentation]    Logs out from the admin portal
    Click Element    id=logout-button
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
    Sleep    ${duration_seconds}s

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
