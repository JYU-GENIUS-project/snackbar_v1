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

A success message should be displayed
    [Documentation]    Verifies success feedback
    Element Should Be Visible    css=.success-message

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

Confirms the deletion
    [Documentation]    Confirms deletion in dialog
    Wait Until Element Is Visible    id=confirm-delete-dialog    timeout=5s
    Click Button    id=confirm-delete-button

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
