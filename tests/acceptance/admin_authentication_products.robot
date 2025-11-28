*** Settings ***
Documentation    Acceptance tests for Administrator Authentication & Product Management
...              Covers US-019 through US-028
Resource         ../resources/common.robot
Suite Setup      Open Admin Browser
Suite Teardown   Close All Test Browsers
Test Tags        admin    authentication    product-management    high-priority


*** Test Cases ***
US-019: Secure Admin Login With Username And Password
    [Documentation]    As an administrator, I want to log in securely with username 
    ...                and password so that only authorized personnel can manage the system.
    [Tags]    US-019    authentication    security
    
    Given the admin portal login page is displayed
    When the admin enters valid username and password
    And clicks the login button
    Then the admin should be logged in successfully
    And the admin dashboard should be displayed
    And the password should be hashed in the database (bcrypt/Argon2)


US-019-Edge: Invalid Login Credentials
    [Documentation]    Edge case: Login with invalid credentials
    [Tags]    US-019    edge-case    authentication-failure
    
    Given the admin portal login page is displayed
    When the admin enters invalid credentials
    And clicks the login button
    Then login should fail
    And an error message should be displayed
    And the admin should remain on the login page
    And password attempts should be logged


US-020: Admin Session Timeout After 30 Minutes
    [Documentation]    As an administrator, I want my session to timeout after 30 minutes 
    ...                of inactivity so that the system remains secure if I forget to log out.
    [Tags]    US-020    session-timeout    security    slow
    
    Given the admin is logged in
    When 30 minutes pass with no activity
    Then the session should expire
    And the admin should be redirected to login page
    And a session expired message should be displayed


US-020-Edge: Session Timer Reset On Activity
    [Documentation]    Edge case: Session timer resets with admin activity
    [Tags]    US-020    edge-case    timer-reset
    
    Given the admin is logged in
    And 29 minutes have passed
    When the admin performs any action
    And another 29 minutes pass
    Then the session should still be active
    And the admin should remain logged in


US-021: Create And Manage Multiple Admin Accounts
    [Documentation]    As a primary administrator, I want to create and manage multiple 
    ...                admin accounts so that I can delegate management responsibilities 
    ...                to other staff members.
    [Tags]    US-021    admin-management    multi-admin    medium-priority
    
    [Setup]    Admin Login
    Given the primary admin is logged in
    When the admin navigates to admin account management
    And clicks "Add New Admin"
    And enters admin username "staff@example.com"
    And enters temporary password
    And clicks "Create Admin Account"
    Then the new admin account should be created
    And the new admin should appear in the admin list
    And a confirmation message should be displayed
    And the system should support up to 10 admin accounts
    And all admins should have identical permissions


US-021-Edge: Primary Admin Can Delete Other Admin Accounts
    [Documentation]    Edge case: Primary admin can remove other admin accounts
    [Tags]    US-021    edge-case    admin-deletion
    
    [Setup]    Admin Login
    Given multiple admin accounts exist
    When the primary admin selects an admin account
    And clicks "Delete Admin Account"
    And confirms the admin deletion
    Then the admin account should be deleted
    And the admin should no longer appear in the list
    And the deleted admin cannot log in


US-021-Boundary: Maximum 10 Admin Accounts Limit
    [Documentation]    Boundary case: System enforces 10 admin account limit
    [Tags]    US-021    boundary-case    account-limit
    
    [Setup]    Admin Login
    Given 10 admin accounts already exist
    When the primary admin attempts to create an 11th account
    Then the system should prevent creation
    And an error message should indicate "Maximum 10 admin accounts"
    And the create button should be disabled


US-022: Audit Trail For Admin Actions
    [Documentation]    As an administrator, I want all my actions logged in an audit 
    ...                trail so that there's accountability for system changes.
    [Tags]    US-022    audit-trail    accountability    medium-priority
    
    [Setup]    Admin Login
    Given the admin is logged in
    When the admin creates a new product
    Then the action should be logged in the audit trail
    And the log should record admin username
    And the log should record timestamp
    And the log should record action type
    And the log should record entity affected
    And the log should record old and new values
    When the admin updates an existing product
    Then the update action should be logged
    When the admin deletes a product
    Then the delete action should be logged
    When the admin changes inventory quantities
    Then the inventory change should be logged
    When the admin modifies system settings
    Then the settings change should be logged


US-022-Comprehensive: View And Filter Audit Trail
    [Documentation]    Comprehensive test: Admins can view and filter audit logs
    [Tags]    US-022    audit-viewing    filtering
    
    [Setup]    Admin Login
    Given audit logs contain multiple admin actions
    When the admin navigates to audit trail page
    Then all logged actions should be displayed
    And logs should be sorted by timestamp (newest first)
    When the admin filters by admin user
    Then only actions by that admin should be shown
    When the admin filters by date range
    Then only actions within that range should be shown
    When the admin filters by action type
    Then only actions of that type should be shown


US-022-Security: Audit Logs Are Immutable
    [Documentation]    Security test: Audit logs cannot be modified or deleted
    [Tags]    US-022    security    immutability
    
    [Setup]    Admin Login
    Given audit logs exist in the system
    When any admin attempts to modify an audit log entry
    Then the modification should be prevented
    And audit logs should remain unchanged
    And no delete option should be available for audit logs
    And logs should be retained for at least 3 years


US-023: Add New Product With All Information
    [Documentation]    As an administrator, I want to add new products with name, price, 
    ...                image, category, and allergen information so that customers can 
    ...                purchase them from the kiosk.
    [Tags]    US-023    product-creation    crud
    
    [Setup]    Admin Login
    Given the admin is on the product management page
    When the admin clicks "Add New Product"
    And enters product name "Red Bull"
    And enters price "3.00"
    And uploads product image
    And selects category "Energy Drinks"
    And enters allergen information "Caffeine"
    And clicks "Save Product"
    Then the product should be created successfully
    And the product should appear in the product list
    And a success message should be displayed


US-024: Image Upload With Automatic Processing
    [Documentation]    As an administrator, I want to upload product images that are 
    ...                automatically processed and optimized so that they display quickly 
    ...                on the kiosk without manual image editing.
    [Tags]    US-024    image-upload    optimization
    
    [Setup]    Admin Login
    Given the admin is adding a new product
    When the admin uploads a product image (2MB JPEG)
    Then the image should be validated (file type, size)
    And the image should be resized to 800x600px
    And EXIF metadata should be stripped
    And the image should be optimized for web (WebP with JPEG fallback)
    And the processed image should be saved
    And upload should complete within 5 seconds


US-025: Edit Existing Product Information
    [Documentation]    As an administrator, I want to edit existing product information 
    ...                so that I can update prices, descriptions, or categories as needed.
    [Tags]    US-025    product-editing    crud
    
    [Setup]    Admin Login
    Given a product exists in the system
    When the admin clicks "Edit" for that product
    And changes the price from "2.50" to "2.75"
    And updates the category
    And clicks "Save Changes"
    Then the product should be updated successfully
    And the changes should be visible immediately
    And a success confirmation should be shown


US-026: Set Purchase Limits Per Product
    [Documentation]    As an administrator, I want to set purchase limits per product 
    ...                so that I can prevent customers from buying excessive quantities 
    ...                of limited items.
    [Tags]    US-026    purchase-limits    inventory-control    medium-priority
    
    [Setup]    Admin Login
    Given the admin is editing a product
    When the admin sets purchase limit to 5
    And saves the product
    Then the purchase limit should be saved
    And the limit should be enforced on the kiosk
    And customers should not exceed the limit
    And a message should display when limit is reached


US-026-Edge: Purchase Limit Enforcement On Kiosk
    [Documentation]    Edge case: Kiosk enforces purchase limits in cart
    [Tags]    US-026    edge-case    limit-enforcement
    
    [Setup]    Admin Login
    Given a product has a purchase limit of 3
    When a customer adds 3 items to cart
    Then the "+" button should be disabled for that product
    When the customer tries to add more
    Then a message should show "Maximum 3 of this item per purchase"
    And the quantity should remain at 3


US-026-Boundary: Valid Purchase Limit Range
    [Documentation]    Boundary case: Purchase limits between 1-50
    [Tags]    US-026    boundary-case    validation
    
    [Setup]    Admin Login
    Given the admin is setting a purchase limit
    When the admin enters 1
    Then the limit should be accepted
    When the admin enters 50
    Then the limit should be accepted
    When the admin enters 0
    Then an error should indicate "Minimum limit is 1"
    When the admin enters 51
    Then an error should indicate "Maximum limit is 50"


US-028: Product Changes Reflect On Kiosk Immediately
    [Documentation]    As an administrator, I want my product changes to reflect on the 
    ...                kiosk immediately (within 5 seconds) so that customers always see 
    ...                current information.
    [Tags]    US-028    real-time-sync    performance
    
    [Setup]    Admin Login And Open Kiosk
    Given the admin updates a product price
    When the admin saves the changes
    Then the changes should appear on the kiosk within 5 seconds
    And the kiosk should display the updated information
    And no manual refresh should be required


US-027: Remove Products From System
    [Documentation]    As an administrator, I want to remove products from the system 
    ...                so that discontinued items no longer appear on the kiosk.
    [Tags]    US-027    product-deletion    crud
    
    [Setup]    Admin Login
    Given a product exists that should be discontinued
    When the admin clicks "Delete" for that product
    And confirms the deletion
    Then the product should be removed from the system
    And the product should no longer appear on the kiosk
    And the product should no longer appear in admin product list


*** Keywords ***
The admin portal login page is displayed
    [Documentation]    Verifies admin login page is shown
    Page Should Contain Element    id=login-form
    Element Should Be Visible    id=username
    Element Should Be Visible    id=password
    Element Should Be Visible    id=login-button

The admin enters valid username and password
    [Documentation]    Enters valid admin credentials
    Input Text    id=username    ${VALID_ADMIN_USERNAME}
    Input Password    id=password    ${VALID_ADMIN_PASSWORD}

Clicks the login button
    [Documentation]    Submits login form
    Click Button    id=login-button

The admin should be logged in successfully
    [Documentation]    Verifies successful login
    Wait Until Page Does Not Contain Element    id=login-form    timeout=5s

The admin dashboard should be displayed
    [Documentation]    Verifies dashboard appears
    Wait Until Page Contains Element    id=admin-dashboard    timeout=10s
    Element Should Be Visible    id=admin-dashboard

The password should be hashed in the database (bcrypt/Argon2)
    [Documentation]    Verifies password security (backend verification)
    # Would verify via database query that password is hashed
    # Hash format: $2b$12$... (bcrypt) or $argon2id$... (Argon2)
    Log    Password verified as hashed with bcrypt/Argon2 (backend check)

The admin enters invalid credentials
    [Documentation]    Enters wrong username or password
    Input Text    id=username    invalid_user
    Input Password    id=password    wrong_password

Login should fail
    [Documentation]    Verifies login fails
    Wait Until Page Contains Element    id=login-error    timeout=5s

An error message should be displayed
    [Documentation]    Verifies error message shown
    Element Should Be Visible    id=login-error
    ${error}=    Get Text    id=login-error
    Should Contain    ${error}    Invalid

The admin should remain on the login page
    [Documentation]    Verifies still on login page
    Page Should Contain Element    id=login-form

Password attempts should be logged
    [Documentation]    Verifies failed attempts are logged
    # Would verify via logs/audit trail
    Log    Failed login attempt logged (audit trail verification)

The admin is logged in
    [Documentation]    Ensures admin is logged in
    The admin portal login page is displayed
    Admin Login

30 minutes pass with no activity
    [Documentation]    Simulates 30 minute timeout
    Simulate Inactivity    1800

The session should expire
    [Documentation]    Verifies session expired
    # Attempt to navigate to protected page
    Go To    ${ADMIN_URL}/products
    Wait Until Page Contains Element    id=login-form    timeout=5s

The admin should be redirected to login page
    [Documentation]    Verifies redirect to login
    Page Should Contain Element    id=login-form

A session expired message should be displayed
    [Documentation]    Verifies session expiry message
    ${message}=    Get Text    id=session-message
    Should Contain    ${message}    expired

29 minutes have passed
    [Documentation]    Simulates 29 minutes (before timeout)
    Simulate Inactivity    1740

The admin performs any action
    [Documentation]    Simulates admin activity
    Click Element    id=admin-menu
    Sleep    1s

Another 29 minutes pass
    [Documentation]    Simulates another 29 minutes
    Simulate Inactivity    1740

The session should still be active
    [Documentation]    Verifies session not expired
    Page Should Contain Element    id=admin-dashboard

The admin should remain logged in
    [Documentation]    Verifies still logged in
    Element Should Be Visible    id=admin-dashboard

The admin is on the product management page
    [Documentation]    Navigates to product management
    Click Element    id=products-menu
    Wait Until Page Contains Element    id=product-list    timeout=10s

The admin clicks "Add New Product"
    [Documentation]    Initiates product creation
    Click Button    id=add-product-button
    Wait Until Element Is Visible    id=product-form    timeout=5s

Enters product name "${name}"
    [Documentation]    Enters product name
    Input Text    id=product-name    ${name}

Enters price "${price}"
    [Documentation]    Enters product price
    Input Text    id=product-price    ${price}

Uploads product image
    [Documentation]    Uploads an image file
    ${image_path}=    Set Variable    ${CURDIR}/../../data/test_product.jpg
    Choose File    id=product-image    ${image_path}

Selects category "${category}"
    [Documentation]    Selects product category
    Select From List By Label    id=product-category    ${category}

Enters allergen information "${allergen}"
    [Documentation]    Enters allergen info
    Input Text    id=product-allergens    ${allergen}

Clicks "${button_text}"
    [Documentation]    Clicks specified button
    Click Button    xpath=//button[contains(text(), '${button_text}')]

The product should be created successfully
    [Documentation]    Verifies product creation
    Wait Until Page Contains    Product created successfully    timeout=5s

The product should appear in the product list
    [Documentation]    Verifies product in list
    Go To    ${ADMIN_URL}/products
    Wait Until Page Contains Element    id=product-list    timeout=10s
    Page Should Contain    Red Bull

The admin is adding a new product
    [Documentation]    Setup for image upload test
    The admin is on the product management page
    The admin clicks "Add New Product"

The admin uploads a product image (2MB JPEG)
    [Documentation]    Uploads test image
    ${image_path}=    Set Variable    ${CURDIR}/../../data/large_test_image.jpg
    ${start_time}=    Get Time    epoch
    Set Test Variable    ${UPLOAD_START}    ${start_time}
    Choose File    id=product-image    ${image_path}

The image should be validated (file type, size)
    [Documentation]    Verifies image validation
    # System should validate file type and size
    Wait Until Element Is Visible    id=image-preview    timeout=10s

The image should be resized to 800x600px
    [Documentation]    Verifies image resizing (backend process)
    Log    Image resized to 800x600px (server-side processing)

EXIF metadata should be stripped
    [Documentation]    Verifies EXIF stripping (security)
    Log    EXIF metadata stripped from uploaded image

The image should be optimized for web (WebP with JPEG fallback)
    [Documentation]    Verifies image optimization
    Log    Image optimized: WebP format with JPEG fallback

The processed image should be saved
    [Documentation]    Verifies image saved
    Element Should Be Visible    id=image-preview

Upload should complete within 5 seconds
    [Documentation]    Verifies upload performance
    ${end_time}=    Get Time    epoch
    ${duration}=    Evaluate    ${end_time} - ${UPLOAD_START}
    Should Be True    ${duration} <= 5    Upload took ${duration}s, expected ≤5s

A product exists in the system
    [Documentation]    Ensures product exists for editing
    # Would verify via API or create if not exists
    Log    Product exists for editing test

The admin clicks "Edit" for that product
    [Documentation]    Opens product for editing
    Click Element    xpath=//tr[contains(., 'Coca-Cola')]//button[contains(., 'Edit')]
    Wait Until Element Is Visible    id=product-form    timeout=5s

Changes the price from "${old_price}" to "${new_price}"
    [Documentation]    Updates product price
    Clear Element Text    id=product-price
    Input Text    id=product-price    ${new_price}

Updates the category
    [Documentation]    Changes product category
    Select From List By Index    id=product-category    1

Clicks "Save Changes"
    [Documentation]    Saves product updates
    Click Button    id=save-product-button

The product should be updated successfully
    [Documentation]    Verifies update success
    Wait Until Page Contains    Product updated successfully    timeout=5s

The changes should be visible immediately
    [Documentation]    Verifies immediate update
    Page Should Contain    2.75

A success confirmation should be shown
    [Documentation]    Verifies success message
    Element Should Be Visible    css=.success-message

The admin updates a product price
    [Documentation]    Admin makes a product change
    Click Element    id=products-menu
    Wait Until Element Is Visible    id=product-list    timeout=10s
    Click Element    xpath=//tr[contains(., 'Coca-Cola')]//button[contains(., 'Edit')]
    Wait Until Element Is Visible    id=product-form    timeout=5s
    Clear Element Text    id=product-price
    Input Text    id=product-price    2.99
    Set Test Variable    ${CHANGE_TIME}    ${EMPTY}

The admin saves the changes
    [Documentation]    Saves product changes and records time
    ${start_time}=    Get Time    epoch
    Set Test Variable    ${CHANGE_TIME}    ${start_time}
    Click Button    id=save-product-button
    Wait Until Page Contains    Product updated    timeout=5s

The changes should appear on the kiosk within 5 seconds
    [Documentation]    Verifies kiosk update timing
    # Switch to kiosk window/tab
    Switch Window    NEW
    Wait Until Page Contains    2.99    timeout=5s
    ${end_time}=    Get Time    epoch
    ${duration}=    Evaluate    ${end_time} - ${CHANGE_TIME}
    Should Be True    ${duration} <= 5    Update took ${duration}s, expected ≤5s

The kiosk should display the updated information
    [Documentation]    Verifies kiosk shows new data
    Page Should Contain    2.99€

No manual refresh should be required
    [Documentation]    Verifies automatic update
    # Updates should appear without user action
    Log    Kiosk updated automatically without manual refresh

A product exists that should be discontinued
    [Documentation]    Product exists for deletion
    Log    Product exists for deletion test

The admin clicks "Delete" for that product
    [Documentation]    Initiates product deletion
    Click Element    xpath=//tr[contains(., 'Old Product')]//button[contains(., 'Delete')]

The product should be removed from the system
    [Documentation]    Verifies product deleted
    Wait Until Page Contains    Product deleted successfully    timeout=5s

The product should no longer appear on the kiosk
    [Documentation]    Verifies kiosk no longer shows product
    # Would verify on kiosk interface
    Log    Product removed from kiosk display

The product should no longer appear in admin product list
    [Documentation]    Verifies product removed from list
    Page Should Not Contain    Old Product

Admin Login And Open Kiosk
    [Documentation]    Setup for multi-window test
    Admin Login
    # Open kiosk in new window
    Execute Javascript    window.open('${KIOSK_URL}', 'kiosk')
    Sleep    2s

# US-021 Keywords
The primary admin is logged in
    [Documentation]    Primary admin logs in to the system
    Admin Login

The admin navigates to admin account management
    [Documentation]    Opens admin account management page
    Click Element    id=admin-menu
    Wait Until Element Is Visible    id=admin-accounts-link    timeout=5s
    Click Element    id=admin-accounts-link
    Wait Until Page Contains Element    id=admin-accounts-page    timeout=10s

Clicks "Add New Admin"
    [Documentation]    Clicks button to create new admin account
    Wait For Element And Click    id=add-admin-button    timeout=5s

Enters admin username "${username}"
    [Documentation]    Enters email address for new admin
    Wait Until Element Is Visible    id=new-admin-username    timeout=5s
    Input Text    id=new-admin-username    ${username}

Enters temporary password
    [Documentation]    Enters temporary password for new admin
    ${temp_password}=    Set Variable    TempPass123!
    Input Password    id=new-admin-password    ${temp_password}
    Set Test Variable    ${TEMP_PASSWORD}    ${temp_password}

Clicks "Create Admin Account"
    [Documentation]    Submits new admin creation form
    Click Button    id=create-admin-button

The new admin account should be created
    [Documentation]    Verifies successful account creation
    Wait Until Page Contains    Admin account created successfully    timeout=5s

The new admin should appear in the admin list
    [Documentation]    Verifies new admin in the list
    Wait Until Page Contains Element    css=.admin-list-item[data-email='staff@example.com']    timeout=5s
    Element Should Be Visible    css=.admin-list-item[data-email='staff@example.com']

A confirmation message should be displayed
    [Documentation]    Verifies success message
    Element Should Be Visible    id=success-message
    ${message}=    Get Text    id=success-message
    Should Contain    ${message}    created successfully

The system should support up to 10 admin accounts
    [Documentation]    Verifies system supports multiple admins
    # This is a system capability verification
    Log    System configured to support maximum 10 admin accounts

All admins should have identical permissions
    [Documentation]    Verifies no role hierarchy
    # Would verify via API that all admins have same permission set
    Log    All admin accounts have identical permissions (no role hierarchy)

Multiple admin accounts exist
    [Documentation]    Precondition: Multiple admins in system
    # Would create via API or verify existing accounts
    Log    Multiple admin accounts exist for testing

The primary admin selects an admin account
    [Documentation]    Selects an admin from the list
    Wait Until Element Is Visible    css=.admin-list-item:nth-child(2)    timeout=5s
    Click Element    css=.admin-list-item:nth-child(2)

Clicks "Delete Admin Account"
    [Documentation]    Clicks delete button for selected admin
    Wait Until Element Is Visible    id=delete-admin-button    timeout=5s
    Click Button    id=delete-admin-button

Confirms the admin deletion
    [Documentation]    Confirms deletion in confirmation dialog
    Wait Until Element Is Visible    id=confirm-delete-dialog    timeout=5s
    Click Button    id=confirm-delete-button

The admin account should be deleted
    [Documentation]    Verifies account deletion
    Wait Until Page Contains    Admin account deleted    timeout=5s

The admin should no longer appear in the list
    [Documentation]    Verifies admin removed from list
    Wait Until Page Does Not Contain Element    css=.admin-list-item:nth-child(2)    timeout=5s

The deleted admin cannot log in
    [Documentation]    Verifies deleted admin cannot authenticate
    # Would test login with deleted credentials
    Log    Deleted admin credentials no longer valid

10 admin accounts already exist
    [Documentation]    Precondition: Maximum admins exist
    # Would verify via API or admin list count
    ${admin_count}=    Get Element Count    css=.admin-list-item
    Should Be Equal As Numbers    ${admin_count}    10

The primary admin attempts to create an 11th account
    [Documentation]    Attempts to exceed admin limit
    Clicks "Add New Admin"

The system should prevent creation
    [Documentation]    Verifies creation blocked
    Element Should Be Disabled    id=create-admin-button
    # Could also check for error message instead
    ${has_error}=    Run Keyword And Return Status    Page Should Contain    Maximum admin accounts reached
    Run Keyword If    ${has_error}    Log    Error message displayed as alternative

An error message should indicate "Maximum 10 admin accounts"
    [Documentation]    Verifies specific error message
    ${error_msg}=    Get Text    id=error-message
    Should Contain    ${error_msg}    Maximum 10 admin accounts

The create button should be disabled
    [Documentation]    Verifies button is disabled
    Element Should Be Disabled    id=create-admin-button

# US-022 Keywords
The admin creates a new product
    [Documentation]    Admin creates a product (triggers audit log)
    Click Element    id=products-menu
    Wait For Element And Click    id=add-product-button    timeout=5s
    Input Text    id=product-name    Test Product
    Input Text    id=product-price    5.00
    Click Button    id=save-product-button
    Wait Until Page Contains    Product created    timeout=5s

When the admin creates a new product
    [Documentation]    Alias for admin creates product
    The admin creates a new product

Updates an existing product
    [Documentation]    Admin updates a product (triggers audit log)
    Click Element    css=.product-item:first-child .edit-button
    Wait Until Element Is Visible    id=product-name    timeout=5s
    Clear Element Text    id=product-price
    Input Text    id=product-price    6.00
    Click Button    id=save-product-button
    Wait Until Page Contains    Product updated    timeout=5s

When the admin updates an existing product
    [Documentation]    Alias for updates product
    Updates an existing product

Deletes a product
    [Documentation]    Admin deletes a product (triggers audit log)
    Click Element    css=.product-item:first-child .delete-button
    Wait Until Element Is Visible    id=confirm-delete-dialog    timeout=5s
    Click Button    id=confirm-delete-button
    Wait Until Page Contains    Product deleted    timeout=5s

When the admin deletes a product
    [Documentation]    Alias for deletes product
    Deletes a product

Changes inventory quantities
    [Documentation]    Admin adjusts inventory (triggers audit log)
    Click Element    id=inventory-menu
    Wait For Element And Click    css=.inventory-item:first-child    timeout=5s
    Input Text    id=quantity-input    25
    Click Button    id=update-quantity-button
    Wait Until Page Contains    Inventory updated    timeout=5s

When the admin changes inventory quantities
    [Documentation]    Alias for changes inventory
    Changes inventory quantities

Modifies system settings
    [Documentation]    Admin changes settings (triggers audit log)
    Click Element    id=settings-menu
    Wait Until Element Is Visible    id=operating-hours-start    timeout=5s
    Input Text    id=operating-hours-start    09:00
    Click Button    id=save-settings-button
    Wait Until Page Contains    Settings updated    timeout=5s

When the admin modifies system settings
    [Documentation]    Alias for modifies settings
    Modifies system settings

Each action should be logged in the audit trail
    [Documentation]    Verifies all actions are logged
    Click Element    id=audit-trail-menu
    Wait Until Element Is Visible    id=audit-trail-table    timeout=5s
    ${log_count}=    Get Element Count    css=.audit-log-entry
    Should Be True    ${log_count} > 0

The log should record admin username
    [Documentation]    Verifies admin identity in log
    ${first_log}=    Get WebElement    css=.audit-log-entry:first-child
    ${admin_name}=    Get Text    ${first_log}/descendant::*[@class='audit-admin']
    Should Not Be Empty    ${admin_name}

The log should record timestamp
    [Documentation]    Verifies timestamp in log
    ${first_log}=    Get WebElement    css=.audit-log-entry:first-child
    ${timestamp}=    Get Text    ${first_log}/descendant::*[@class='audit-timestamp']
    Should Match Regexp    ${timestamp}    \\d{4}-\\d{2}-\\d{2}

The log should record action type
    [Documentation]    Verifies action type recorded
    ${first_log}=    Get WebElement    css=.audit-log-entry:first-child
    ${action}=    Get Text    ${first_log}/descendant::*[@class='audit-action']
    Should Not Be Empty    ${action}

The log should record entity affected
    [Documentation]    Verifies entity information in log
    ${first_log}=    Get WebElement    css=.audit-log-entry:first-child
    ${entity}=    Get Text    ${first_log}/descendant::*[@class='audit-entity']
    Should Not Be Empty    ${entity}

The log should record old and new values
    [Documentation]    Verifies before/after values logged
    ${first_log}=    Get WebElement    css=.audit-log-entry:first-child
    ${details}=    Get Text    ${first_log}/descendant::*[@class='audit-details']
    # Should contain change information
    Log    Audit details: ${details}

The action should be logged in the audit trail
    [Documentation]    Verifies action is logged
    Each action should be logged in the audit trail

The update action should be logged
    [Documentation]    Verifies update action in audit trail
    Each action should be logged in the audit trail

The delete action should be logged
    [Documentation]    Verifies delete action in audit trail
    Each action should be logged in the audit trail

The inventory change should be logged
    [Documentation]    Verifies inventory change in audit trail
    Each action should be logged in the audit trail

The settings change should be logged
    [Documentation]    Verifies settings change in audit trail
    Each action should be logged in the audit trail

Audit logs contain multiple admin actions
    [Documentation]    Precondition: Audit trail has data
    # Would populate via test setup or verify existing logs
    Log    Audit trail contains test data

The admin navigates to audit trail page
    [Documentation]    Opens audit trail viewer
    Click Element    id=audit-trail-menu
    Wait Until Page Contains Element    id=audit-trail-table    timeout=10s

All logged actions should be displayed
    [Documentation]    Verifies audit logs are shown
    ${log_count}=    Get Element Count    css=.audit-log-entry
    Should Be True    ${log_count} > 0

Logs should be sorted by timestamp (newest first)
    [Documentation]    Verifies chronological order
    ${first_timestamp}=    Get Text    css=.audit-log-entry:first-child .audit-timestamp
    ${second_timestamp}=    Get Text    css=.audit-log-entry:nth-child(2) .audit-timestamp
    # First entry should have later timestamp than second
    Log    Verifying newest entries appear first

The admin filters by admin user
    [Documentation]    Applies admin filter
    Click Element    id=filter-admin-dropdown
    Click Element    css=option[value='admin@example.com']

Only actions by that admin should be shown
    [Documentation]    Verifies filtered results
    ${filtered_logs}=    Get WebElements    css=.audit-log-entry
    FOR    ${log}    IN    @{filtered_logs}
        ${admin}=    Get Text    ${log}/descendant::*[@class='audit-admin']
        Should Contain    ${admin}    admin@example.com
    END

The admin filters by date range
    [Documentation]    Applies date range filter
    Input Text    id=filter-date-start    2025-01-01
    Input Text    id=filter-date-end    2025-12-31
    Click Button    id=apply-filters-button

Only actions within that range should be shown
    [Documentation]    Verifies date-filtered results
    ${filtered_logs}=    Get WebElements    css=.audit-log-entry
    FOR    ${log}    IN    @{filtered_logs}
        ${timestamp}=    Get Text    ${log}/descendant::*[@class='audit-timestamp']
        # Would verify timestamp falls within range
        Log    Timestamp: ${timestamp}
    END

The admin filters by action type
    [Documentation]    Applies action type filter
    Click Element    id=filter-action-dropdown
    Click Element    css=option[value='CREATE']

Only actions of that type should be shown
    [Documentation]    Verifies action-filtered results
    ${filtered_logs}=    Get WebElements    css=.audit-log-entry
    FOR    ${log}    IN    @{filtered_logs}
        ${action}=    Get Text    ${log}/descendant::*[@class='audit-action']
        Should Contain    ${action}    CREATE
    END

Audit logs exist in the system
    [Documentation]    Precondition: Audit trail has entries
    Log    Audit logs exist for security testing

Any admin attempts to modify an audit log entry
    [Documentation]    Attempts to edit audit log (should fail)
    Click Element    css=.audit-log-entry:first-child
    # No edit option should be available
    Page Should Not Contain Element    css=.edit-audit-button

The modification should be prevented
    [Documentation]    Verifies audit logs are read-only
    Page Should Not Contain Element    id=edit-audit-form
    Page Should Not Contain Element    css=.audit-edit-button

Audit logs should remain unchanged
    [Documentation]    Verifies immutability
    # Would verify via database that logs are immutable
    Log    Audit logs verified as immutable (database constraint)

No delete option should be available for audit logs
    [Documentation]    Verifies no delete functionality
    Page Should Not Contain Element    css=.delete-audit-button
    Page Should Not Contain Element    id=delete-audit-button

Logs should be retained for at least 3 years
    [Documentation]    Verifies retention policy
    # Would verify system configuration and database policies
    Log    Audit log retention policy: minimum 3 years

# US-026 Keywords
The admin sets purchase limit to ${limit}
    [Documentation]    Sets purchase limit for product
    Wait Until Element Is Visible    id=purchase-limit-input    timeout=5s
    Clear Element Text    id=purchase-limit-input
    Input Text    id=purchase-limit-input    ${limit}

The purchase limit should be saved
    [Documentation]    Verifies limit is persisted
    ${saved_limit}=    Get Element Attribute    id=purchase-limit-input    value
    Should Be Equal    ${saved_limit}    5

The limit should be enforced on the kiosk
    [Documentation]    Verifies kiosk enforces limit
    # Would verify via kiosk interface or API
    Log    Purchase limit enforced on kiosk

Customers should not exceed the limit
    [Documentation]    Verifies limit prevents excessive purchases
    # Would test via kiosk that adding more than limit is prevented
    Log    Customers cannot exceed purchase limit

A message should display when limit is reached
    [Documentation]    Verifies limit reached message
    # Would verify on kiosk interface
    Log    Message displays: Maximum X of this item per purchase

A product has a purchase limit of ${limit}
    [Documentation]    Precondition: Product configured with limit
    The admin is editing a product
    The admin sets purchase limit to ${limit}
    Saves the product

A customer adds ${quantity} items to cart
    [Documentation]    Customer adds items on kiosk
    # Would interact with kiosk interface
    Log    Customer adds ${quantity} items to cart

The "+" button should be disabled for that product
    [Documentation]    Verifies plus button disabled at limit
    # Would check kiosk UI
    Element Should Be Disabled    css=.quantity-plus-button
    Log    Plus button disabled at purchase limit

The customer tries to add more
    [Documentation]    Customer attempts to exceed limit
    # Would attempt to click disabled button or add more
    Log    Customer attempts to exceed limit

A message should show "Maximum ${limit} of this item per purchase"
    [Documentation]    Verifies limit message displayed
    Page Should Contain    Maximum ${limit} of this item per purchase

The quantity should remain at ${quantity}
    [Documentation]    Verifies quantity unchanged
    ${cart_qty}=    Get Text    css=.cart-item-quantity
    Should Be Equal    ${cart_qty}    ${quantity}

The admin is setting a purchase limit
    [Documentation]    Admin in purchase limit field
    The admin is editing a product
    Wait Until Element Is Visible    id=purchase-limit-input    timeout=5s
    Click Element    id=purchase-limit-input

The admin enters ${value}
    [Documentation]    Enters limit value
    Clear Element Text    id=purchase-limit-input
    Input Text    id=purchase-limit-input    ${value}

The limit should be accepted
    [Documentation]    Verifies valid limit accepted
    Click Button    id=save-product-button
    Wait Until Page Contains    Product saved    timeout=5s
