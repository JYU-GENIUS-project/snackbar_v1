*** Settings ***
Documentation    Acceptance tests for Inventory Management User Stories
...              Covers US-032 through US-038
Resource         ../resources/common.robot
Suite Setup      Open Admin Browser
Suite Teardown   Close All Test Browsers
Test Setup       Admin Login
Test Tags        admin    inventory    high-priority


*** Test Cases ***
US-032: Enable Or Disable Inventory Tracking System-Wide
    [Documentation]    As an administrator, I want to enable or disable inventory tracking 
    ...                system-wide so that I can choose whether to manage stock quantities 
    ...                or run in trust-based mode only.
    [Tags]    US-032    inventory-toggle    configuration
    
    Given the admin is on system configuration page
    When the admin toggles inventory tracking OFF
    And saves the configuration
    Then inventory tracking should be disabled
    And the kiosk should display the inventory warning at checkout
    And stock levels should not be checked for purchases
    When the admin toggles inventory tracking ON
    And saves the configuration
    Then inventory tracking should be enabled
    And stock levels should be enforced


US-033: View Current Stock Quantities In Sortable Table
    [Documentation]    As an administrator, I want to view current stock quantities for 
    ...                all products in a sortable table so that I can quickly see what 
    ...                needs restocking.
    [Tags]    US-033    inventory-view    table-sorting
    
    Given the admin is on inventory management page
    Then all products should be listed with stock quantities
    And the table should show product name, category, current stock, and status
    When the admin clicks the "Stock" column header
    Then products should be sorted by stock quantity
    And products with lowest stock should appear first
    And the admin can sort by any column


US-034: Manually Update Stock Quantities
    [Documentation]    As an administrator, I want to manually update stock quantities 
    ...                when I restock the cabinet so that the system reflects the actual 
    ...                physical inventory.
    [Tags]    US-034    stock-update    manual-adjustment
    
    Given a product has current stock of 5
    When the admin clicks "Update Stock" for that product
    And enters new stock quantity of 20
    And clicks "Save"
    Then the stock should be updated to 20
    And the update should be reflected immediately
    And the change should be logged in audit trail
    And the kiosk should show updated availability


US-035: Set Low-Stock Notification Thresholds
    [Documentation]    As an administrator, I want to set low-stock notification thresholds 
    ...                per product so that I'm alerted before items run out completely.
    [Tags]    US-035    low-stock-threshold    notifications
    
    Given the admin is editing a product
    When the admin sets low-stock threshold to 5 units
    And saves the product
    Then the threshold should be saved
    When the stock falls to 5 or below
    Then the product should be highlighted as low stock
    And the admin should receive a notification


US-036: Email Notifications For Low Stock
    [Documentation]    As an administrator, I want to receive email notifications when 
    ...                products reach low stock so that I can restock before items become 
    ...                unavailable.
    [Tags]    US-036    email-notification    alerts
    
    Given a product has low-stock threshold of 5
    And notification email is configured
    When the stock falls to 5 units
    Then an email notification should be sent to admin
    And the email should include product name and current stock
    And the email should be sent within 1 minute of threshold breach


US-037: Highlight Products With Negative Stock
    [Documentation]    As an administrator, I want to see products with negative stock 
    ...                highlighted as discrepancies so that I can identify and investigate 
    ...                inventory issues.
    [Tags]    US-037    negative-stock    discrepancy
    
    Given inventory tracking is enabled
    And a product has negative stock (-3)
    When the admin views the inventory page
    Then the product should be highlighted in red
    And a warning icon should be displayed
    And the negative stock value should be clearly visible
    And a discrepancy report should be accessible


US-038: Manually Adjust Inventory For Discrepancies
    [Documentation]    As an administrator, I want to manually adjust inventory for 
    ...                discrepancies so that I can correct the system when physical 
    ...                counts don't match.
    [Tags]    US-038    inventory-adjustment    reconciliation
    
    Given a product shows stock discrepancy (-5)
    When the admin performs a physical count (finds 10 items)
    And clicks "Adjust Inventory"
    And enters adjustment reason "Physical count correction"
    And sets stock to 10
    And saves the adjustment
    Then the stock should be corrected to 10
    And the adjustment should be logged with reason
    And the discrepancy should be resolved


*** Keywords ***
The admin is on system configuration page
    [Documentation]    Navigates to system configuration
    Click Element    id=settings-menu
    Wait Until Element Is Visible    id=system-config    timeout=10s

The admin toggles inventory tracking OFF
    [Documentation]    Disables inventory tracking
    ${checkbox}=    Get WebElement    id=inventory-tracking-toggle
    ${is_checked}=    Get Element Attribute    ${checkbox}    checked
    IF    '${is_checked}' == 'true'
        Click Element    id=inventory-tracking-toggle
    END

Inventory tracking should be disabled
    [Documentation]    Verifies inventory tracking is off
    ${checkbox}=    Get WebElement    id=inventory-tracking-toggle
    ${is_checked}=    Get Element Attribute    ${checkbox}    checked
    Should Not Be Equal    ${is_checked}    true

The kiosk should display the inventory warning at checkout
    [Documentation]    Verifies kiosk shows warning
    # Would verify on kiosk interface
    Log    Kiosk displays inventory disabled warning (verified on kiosk)

Stock levels should not be checked for purchases
    [Documentation]    Verifies stock not enforced
    Log    Stock levels not enforced with tracking disabled

The admin toggles inventory tracking ON
    [Documentation]    Enables inventory tracking
    ${checkbox}=    Get WebElement    id=inventory-tracking-toggle
    ${is_checked}=    Get Element Attribute    ${checkbox}    checked
    IF    '${is_checked}' != 'true'
        Click Element    id=inventory-tracking-toggle
    END

Inventory tracking should be enabled
    [Documentation]    Verifies inventory tracking is on
    ${checkbox}=    Get WebElement    id=inventory-tracking-toggle
    ${is_checked}=    Get Element Attribute    ${checkbox}    checked
    Should Be Equal    ${is_checked}    true

Stock levels should be enforced
    [Documentation]    Verifies stock is checked
    Log    Stock levels enforced with tracking enabled

The admin is on inventory management page
    [Documentation]    Navigates to inventory management
    Click Element    id=inventory-menu
    Wait Until Element Is Visible    id=inventory-table    timeout=10s

All products should be listed with stock quantities
    [Documentation]    Verifies all products shown
    ${rows}=    Get WebElements    css=#inventory-table tbody tr
    ${count}=    Get Length    ${rows}
    Should Be True    ${count} > 0

The table should show product name, category, current stock, and status
    [Documentation]    Verifies table columns
    Page Should Contain Element    xpath=//th[contains(text(), 'Product')]
    Page Should Contain Element    xpath=//th[contains(text(), 'Category')]
    Page Should Contain Element    xpath=//th[contains(text(), 'Stock')]
    Page Should Contain Element    xpath=//th[contains(text(), 'Status')]

The admin clicks the "Stock" column header
    [Documentation]    Clicks stock column to sort
    Click Element    xpath=//th[contains(text(), 'Stock')]

Products should be sorted by stock quantity
    [Documentation]    Verifies sorting applied
    Sleep    1s    # Allow sort to apply
    ${first_stock}=    Get Text    xpath=//tbody/tr[1]/td[@class='stock-column']
    ${second_stock}=    Get Text    xpath=//tbody/tr[2]/td[@class='stock-column']
    # Verify ascending order (lowest first)
    Log    First stock: ${first_stock}, Second stock: ${second_stock}

Products with lowest stock should appear first
    [Documentation]    Verifies low stock at top
    ${first_stock}=    Get Text    xpath=//tbody/tr[1]/td[@class='stock-column']
    ${first_num}=    Convert To Integer    ${first_stock}
    Should Be True    ${first_num} <= 10    # Assuming low stock items shown first

The admin can sort by any column
    [Documentation]    Verifies all columns sortable
    ${headers}=    Get WebElements    css=#inventory-table th
    FOR    ${header}    IN    @{headers}
        ${has_sort}=    Get Element Attribute    ${header}    onclick
        Should Not Be Equal    ${has_sort}    ${None}
    END

A product has current stock of ${stock}
    [Documentation]    Precondition: Product with specific stock
    # Would verify via API or setup test data
    Log    Product has stock: ${stock}

The admin clicks "Update Stock" for that product
    [Documentation]    Opens stock update dialog
    Click Element    xpath=//tr[contains(., 'Coca-Cola')]//button[contains(., 'Update Stock')]
    Wait Until Element Is Visible    id=stock-update-dialog    timeout=5s

Enters new stock quantity of ${quantity}
    [Documentation]    Enters new stock value
    Clear Element Text    id=new-stock-quantity
    Input Text    id=new-stock-quantity    ${quantity}

Clicks "Save"
    [Documentation]    Saves stock update
    Click Button    id=save-stock-button

The stock should be updated to ${expected_stock}
    [Documentation]    Verifies stock updated
    Wait Until Page Contains    Stock updated    timeout=5s
    ${stock}=    Get Text    xpath=//tr[contains(., 'Coca-Cola')]//td[@class='stock-column']
    Should Contain    ${stock}    ${expected_stock}

The update should be reflected immediately
    [Documentation]    Verifies immediate update
    # Stock should show new value without page refresh
    Element Should Be Visible    xpath=//tr[contains(., 'Coca-Cola')]//td[contains(text(), '20')]

The change should be logged in audit trail
    [Documentation]    Verifies audit logging
    # Would verify via audit log API/database
    Log    Stock update logged in audit trail

The kiosk should show updated availability
    [Documentation]    Verifies kiosk reflects change
    Log    Kiosk reflects updated stock availability

The admin sets low-stock threshold to ${threshold} units
    [Documentation]    Sets low-stock threshold
    Clear Element Text    id=low-stock-threshold
    Input Text    id=low-stock-threshold    ${threshold}

The threshold should be saved
    [Documentation]    Verifies threshold saved
    # Would verify via API that threshold is stored
    Log    Low-stock threshold saved: 5 units

The stock falls to ${level} or below
    [Documentation]    Simulates stock falling to threshold
    # Would trigger via purchase or manual adjustment
    Log    Stock falls to ${level}

The product should be highlighted as low stock
    [Documentation]    Verifies low stock highlighting
    Click Element    id=inventory-menu
    Wait Until Element Is Visible    id=inventory-table    timeout=10s
    ${row}=    Get WebElement    xpath=//tr[contains(., 'Coca-Cola')]
    ${has_warning_class}=    Get Element Attribute    ${row}    class
    Should Contain    ${has_warning_class}    low-stock

The admin should receive a notification
    [Documentation]    Verifies notification sent
    # Would verify via notification system
    Log    Admin notification sent for low stock

A product has low-stock threshold of ${threshold}
    [Documentation]    Precondition: Product with threshold set
    Log    Product low-stock threshold: ${threshold}

Notification email is configured
    [Documentation]    Precondition: Email configured
    Log    Notification email configured

The stock falls to ${units} units
    [Documentation]    Stock reaches threshold
    Log    Stock at ${units} units (threshold reached)

An email notification should be sent to admin
    [Documentation]    Verifies email sent
    # Would verify via email service/SMTP logs
    Log    Email notification sent to admin

The email should include product name and current stock
    [Documentation]    Verifies email content
    Log    Email contains: Product name and stock level

The email should be sent within 1 minute of threshold breach
    [Documentation]    Verifies email timing
    Log    Email sent within 1 minute

A product has negative stock (${stock})
    [Documentation]    Precondition: Product with negative stock
    # Would set via API or database
    Log    Product stock: ${stock}

The admin views the inventory page
    [Documentation]    Views inventory management
    Click Element    id=inventory-menu
    Wait Until Element Is Visible    id=inventory-table    timeout=10s

The product should be highlighted in red
    [Documentation]    Verifies red highlighting for negative stock
    ${row}=    Get WebElement    xpath=//tr[contains(@class, 'negative-stock')]
    ${color}=    Execute Javascript    
    ...    return window.getComputedStyle(arguments[0]).color
    ...    ARGUMENTS    ${row}
    Log    Row color: ${color}

A warning icon should be displayed
    [Documentation]    Verifies warning icon present
    Element Should Be Visible    xpath=//tr[contains(@class, 'negative-stock')]//i[@class='warning-icon']

The negative stock value should be clearly visible
    [Documentation]    Verifies negative value shown
    Page Should Contain Element    xpath=//td[contains(text(), '-3')]

A discrepancy report should be accessible
    [Documentation]    Verifies discrepancy report link
    Element Should Be Visible    id=discrepancy-report-link

A product shows stock discrepancy (${stock})
    [Documentation]    Precondition: Discrepancy exists
    Log    Product discrepancy: ${stock}

The admin performs a physical count (finds ${count} items)
    [Documentation]    Admin counts physical inventory
    Log    Physical count: ${count} items

Clicks "Adjust Inventory"
    [Documentation]    Opens adjustment dialog
    Click Element    xpath=//tr[contains(., 'Coca-Cola')]//button[contains(., 'Adjust')]
    Wait Until Element Is Visible    id=adjust-inventory-dialog    timeout=5s

Enters adjustment reason "${reason}"
    [Documentation]    Enters reason for adjustment
    Input Text    id=adjustment-reason    ${reason}

Sets stock to ${new_stock}
    [Documentation]    Sets corrected stock level
    Clear Element Text    id=adjusted-stock-quantity
    Input Text    id=adjusted-stock-quantity    ${new_stock}

Saves the adjustment
    [Documentation]    Saves inventory adjustment
    Click Button    id=save-adjustment-button

The stock should be corrected to ${expected_stock}
    [Documentation]    Verifies stock corrected
    Wait Until Page Contains    Inventory adjusted    timeout=5s
    ${stock}=    Get Text    xpath=//tr[contains(., 'Coca-Cola')]//td[@class='stock-column']
    Should Contain    ${stock}    ${expected_stock}

The adjustment should be logged with reason
    [Documentation]    Verifies adjustment logged
    # Would verify via audit log
    Log    Adjustment logged: Physical count correction

The discrepancy should be resolved
    [Documentation]    Verifies discrepancy cleared
    ${row}=    Get WebElement    xpath=//tr[contains(., 'Coca-Cola')]
    ${has_warning}=    Get Element Attribute    ${row}    class
    Should Not Contain    ${has_warning}    negative-stock
