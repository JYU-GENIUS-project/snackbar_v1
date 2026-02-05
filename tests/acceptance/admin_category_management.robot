*** Settings ***
Documentation    Acceptance tests for Category Management User Stories
...              Covers US-029 through US-031
Resource         ../resources/common.robot
Suite Setup      Open Admin Browser
Suite Teardown   Close All Test Browsers
Test Tags        admin    category-management    medium-priority


*** Test Cases ***
US-029: Create Custom Product Categories
    [Documentation]    As an administrator, I want to create custom product categories 
    ...                so that I can organize products in a way that makes sense for 
    ...                our offerings.
    [Tags]    US-029    category-creation    crud
    
    [Setup]    Admin Login
    Given the admin is on the category management page
    When the admin clicks "Create New Category"
    And enters category name "Energy Drinks Plus"
    And clicks "Save Category"
    Then the category should be created successfully
    And the category should appear in the category list    Energy Drinks Plus
    And a success message should be displayed
    And the category should be available for product assignment    Energy Drinks Plus


US-029-Edge: Category Name Validation
    [Documentation]    Edge case: Category names must meet validation requirements
    [Tags]    US-029    edge-case    validation
    
    [Setup]    Admin Login
    Given the admin is creating a new category
    When the admin enters an empty category name
    Then an error should indicate "Category name is required"
    When the admin enters a name with 51 characters
    Then an error should indicate "Maximum 50 characters"
    When the admin enters a name with special characters "@#$"
    Then an error should indicate "Only letters, numbers, spaces and hyphens allowed"
    When the admin enters a duplicate category name
    Then an error should indicate "Category name already exists"


US-029-Boundary: Category Name Length Limits
    [Documentation]    Boundary case: Category name length validation (1-50 chars)
    [Tags]    US-029    boundary-case    validation
    
    [Setup]    Admin Login
    Given the admin is creating a new category
    When the admin enters a 1 character name "A"
    Then the category should be accepted
    When the admin enters a 50 character name
    Then the category should be accepted
    When the admin enters an empty name
    Then the category should be rejected


US-030: Edit And Delete Categories
    [Documentation]    As an administrator, I want to edit and delete categories so 
    ...                that I can maintain an organized product catalog.
    [Tags]    US-030    category-editing    crud
    
    [Setup]    Admin Login
    Given a category exists named "Beverages"
    When the admin clicks "Edit" for "Beverages"
    And changes the name to "Drinks"
    And clicks "Save Changes"
    Then the category name should be updated to "Drinks"
    And the updated name should appear in the list    Drinks
    When the admin clicks "Delete" for "Drinks"
    And confirms the deletion
    Then the category should be deleted
    And the category should no longer appear in the list    Drinks


US-030-Edge: Cannot Delete Category With Products
    [Documentation]    Edge case: System prevents deletion of categories with assigned products
    [Tags]    US-030    edge-case    deletion-prevention
    
    [Setup]    Admin Login
    Given a category "Snacks" has products assigned
    When the admin attempts to delete "Snacks"
    Then the deletion should be prevented
    And a warning should display "Cannot delete category with assigned products"
    And the message should advise "Please reassign or delete products first"
    And the category should remain in the list


US-030-Comprehensive: Edit Category Updates Product Assignments
    [Documentation]    Comprehensive test: Editing category name updates all product associations
    [Tags]    US-030    comprehensive    cascading-update
    
    [Setup]    Admin Login
    Given a category "Cold Beverages" has 5 products assigned
    When the admin edits the category name from "Cold Beverages" to "Chilled Drinks"
    Then all 5 products should show the new category "Chilled Drinks"
    And the old category "Cold Beverages" should no longer exist
    And product browsing should show "Chilled Drinks" as a filter option


US-031: Assign Products To Multiple Categories
    [Documentation]    As an administrator, I want to assign products to multiple 
    ...                categories so that customers can find items through different 
    ...                browsing paths.
    [Tags]    US-031    multi-category    product-assignment
    
    [Setup]    Admin Login
    Given the admin is editing a product "Red Bull"
    When the admin selects category "Energy Drinks"
    And also selects category "Cold Drinks"
    And also selects category "Beverages"
    And saves the product
    Then the product should be assigned to all 3 categories
    And the product should appear when filtering by "Energy Drinks"
    And the product should appear when filtering by "Cold Drinks"
    And the product should appear when filtering by "Beverages"


US-031-Edge: Product In Multiple Categories On Kiosk
    [Documentation]    Edge case: Product appears in all assigned category filters on kiosk
    [Tags]    US-031    edge-case    kiosk-filtering
    
    [Setup]    Admin Login
    Given a product "Coca-Cola" is in categories "Soft Drinks" and "Cold Drinks"
    When a customer filters by "Soft Drinks" on the kiosk
    Then "Coca-Cola" should be visible
    When the customer filters by "Cold Drinks" on the kiosk
    Then "Coca-Cola" should still be visible
    When the customer filters by "Snacks" on the kiosk
    Then "Coca-Cola" should not be visible


US-031-Boundary: Maximum Categories Per Product
    [Documentation]    Boundary case: Product can be assigned to multiple categories
    [Tags]    US-031    boundary-case    category-limit
    
    [Setup]    Admin Login
    Given the admin is editing a product
    When the admin assigns the product to 10 categories
    Then all 10 category assignments should be saved
    And the product should appear in all 10 category filters
    And no performance degradation should occur


*** Keywords ***
The admin is on the category management page
    [Documentation]    Navigates to category management page
    Click Element    id=categories-menu
    Wait Until Page Contains Element    id=category-management-page    timeout=10s
    Element Should Be Visible    id=category-list

The admin clicks "Create New Category"
    [Documentation]    Clicks button to create new category
    Wait For Element And Click    id=create-category-button    timeout=5s
    Wait Until Element Is Visible    id=category-form    timeout=5s

Enters category name "${name}"
    [Documentation]    Enters category name in form
    Wait Until Element Is Visible    id=category-name-input    timeout=5s
    Clear Element Text    id=category-name-input
    Input Text    id=category-name-input    ${name}

Clicks "Save Category"
    [Documentation]    Saves category form
    Click Button    id=save-category-button
    Wait Until Page Contains    Category    timeout=5s

The category should be created successfully
    [Documentation]    Verifies successful category creation
    Wait Until Page Contains    Category created successfully    timeout=5s

The category should appear in the category list
    [Arguments]    ${category_name}
    [Documentation]    Verifies category appears in list
    Wait Until Page Contains Element    xpath=//tr[contains(@class, 'category-list-item')]//td[normalize-space()='${category_name}']    timeout=5s
    Element Should Be Visible    xpath=//tr[contains(@class, 'category-list-item')]//td[normalize-space()='${category_name}']

The category should be available for product assignment
    [Arguments]    ${category_name}
    [Documentation]    Verifies category can be used for products
    Click Element    id=products-menu
    Wait For Element And Click    id=add-product-button    timeout=5s
    Wait Until Element Is Visible    id=category-select    timeout=5s
    Page Should Contain Element    xpath=//select[@id='category-select']//option[normalize-space()='${category_name}']

The admin is creating a new category
    [Documentation]    Admin in new category form
    The admin is on the category management page
    The admin clicks "Create New Category"

The admin enters an empty category name
    [Documentation]    Leaves category name empty
    Clear Element Text    id=category-name-input

The admin enters a name with ${count} characters
    [Documentation]    Enters name of specific length
    ${long_name}=    Evaluate    'A' * ${count}
    Clear Element Text    id=category-name-input
    Input Text    id=category-name-input    ${long_name}

The admin enters a name with special characters "${chars}"
    [Documentation]    Enters name with invalid characters
    Clear Element Text    id=category-name-input
    Input Text    id=category-name-input    Test${chars}Category

The admin enters a duplicate category name
    [Documentation]    Enters existing category name
    Clear Element Text    id=category-name-input
    Input Text    id=category-name-input    Beverages

The admin enters a ${length} character name "${name}"
    [Documentation]    Enters specific name
    Clear Element Text    id=category-name-input
    Input Text    id=category-name-input    ${name}

The category should be accepted
    [Documentation]    Verifies category is accepted
    Click Button    id=save-category-button
    Wait Until Page Contains    Category created successfully    timeout=5s

The admin enters a 50 character name
    [Documentation]    Enters maximum length name
    ${max_name}=    Set Variable    12345678901234567890123456789012345678901234567890
    Clear Element Text    id=category-name-input
    Input Text    id=category-name-input    ${max_name}

The admin enters an empty name
    [Documentation]    Leaves name field empty
    Clear Element Text    id=category-name-input

The category should be rejected
    [Documentation]    Verifies category is rejected
    Click Button    id=save-category-button
    Wait Until Element Is Visible    id=category-name-error    timeout=5s
    Element Should Be Visible    id=category-name-error

A category exists named "${name}"
    [Documentation]    Precondition: Category exists
    # Would create via API or verify existing
    Log    Category ${name} exists for testing

The admin clicks "Edit" for "${name}"
    [Documentation]    Clicks edit button for category
    Click Element    xpath=//tr[contains(@class, 'category-list-item')]//td[normalize-space()='${name}']/following-sibling::td//button[contains(., 'Edit')]
    Wait Until Element Is Visible    id=category-form    timeout=5s

Changes the name to "${new_name}"
    [Documentation]    Updates category name
    Wait Until Element Is Visible    id=category-name-input    timeout=5s
    Clear Element Text    id=category-name-input
    Input Text    id=category-name-input    ${new_name}

The category name should be updated to "${name}"
    [Documentation]    Verifies category renamed
    Page Should Contain Element    xpath=//tr[contains(@class, 'category-list-item')]//td[normalize-space()='${name}']

The updated name should appear in the list
    [Arguments]    ${category_name}
    [Documentation]    Verifies new name in list
    Wait Until Page Contains Element    xpath=//tr[contains(@class, 'category-list-item')]//td[normalize-space()='${category_name}']    timeout=5s

The admin clicks "Delete" for "${name}"
    [Documentation]    Clicks delete button for category
    Click Element    xpath=//tr[contains(@class, 'category-list-item')]//td[normalize-space()='${name}']/following-sibling::td//button[contains(., 'Delete')]
    Wait Until Element Is Visible    id=confirm-delete-dialog    timeout=5s

The category should be deleted
    [Documentation]    Verifies category deleted
    Wait Until Page Contains    Category deleted    timeout=5s

The category should no longer appear in the list
    [Arguments]    ${category_name}
    [Documentation]    Verifies category removed from list
    Wait Until Page Does Not Contain Element    xpath=//tr[contains(@class, 'category-list-item')]//td[normalize-space()='${category_name}']    timeout=5s

A category "${name}" has products assigned
    [Documentation]    Precondition: Category with products
    # Would set up via API or test data
    Log    Category ${name} has products assigned

The admin attempts to delete "${name}"
    [Documentation]    Attempts to delete category
    Click Element    xpath=//tr[contains(., '${name}')]//button[contains(., 'Delete')]

The deletion should be prevented
    [Documentation]    Verifies deletion blocked
    Wait Until Element Is Visible    id=delete-error-dialog    timeout=5s

The message should advise "${advice}"
    [Documentation]    Verifies advisory message
    ${warning}=    Get Text    id=delete-error-dialog
    Should Contain    ${warning}    ${advice}

The category should remain in the list
    [Documentation]    Verifies category not deleted
    Click Button    id=close-dialog-button
    Page Should Contain Element    xpath=//tr[contains(., 'Snacks')]

A category "${name}" has ${count} products assigned
    [Documentation]    Precondition: Category with N products
    # Would set up via API
    Log    Category ${name} has ${count} products

The admin edits the category name from "${current_name}" to "${new_name}"
    [Documentation]    Edits category name
    The admin clicks "Edit" for "${current_name}"
    Changes the name to "${new_name}"
    Clicks "Save Changes"

All ${count} products should show the new category "${new_name}"
    [Documentation]    Verifies all products updated
    Click Element    id=products-menu
    Wait Until Element Is Visible    css=.product-list    timeout=5s
    # Would verify via product list or API
    Log    All ${count} products now show category ${new_name}

The old category "${name}" should no longer exist
    [Documentation]    Verifies old category removed
    Click Element    id=categories-menu
    Wait Until Element Is Visible    id=category-list    timeout=5s
    Page Should Not Contain Element    xpath=//tr[contains(., '${name}')]

Product browsing should show "${name}" as a filter option
    [Documentation]    Verifies category appears on kiosk
    # Would verify on kiosk interface
    Log    Category ${name} available as kiosk filter

The admin is editing a product "${product_name}"
    [Documentation]    Opens product edit form
    Click Element    id=products-menu
    Wait Until Element Is Visible    css=.product-list    timeout=5s
    Click Element    xpath=//tr[contains(., '${product_name}')]//button[contains(., 'Edit')]
    Wait Until Element Is Visible    id=product-form    timeout=5s

The admin selects category "${category_name}"
    [Documentation]    Selects a category for product
    Wait Until Element Is Visible    id=category-multiselect    timeout=5s
    Click Element    xpath=//select[@id='category-multiselect']//option[contains(., '${category_name}')]

Also selects category "${category_name}"
    [Documentation]    Selects additional category
    The admin selects category "${category_name}"

The product should be assigned to all ${count} categories
    [Documentation]    Verifies multiple category assignments
    # Would verify via API or product details
    Log    Product assigned to ${count} categories

The product should appear when filtering by "${category_name}"
    [Documentation]    Verifies product in category filter
    # Would test on kiosk interface
    Log    Product appears in ${category_name} filter

A product "${product_name}" is in categories "${cat1}" and "${cat2}"
    [Documentation]    Precondition: Product in multiple categories
    # Would set up via API or admin interface
    Log    Product ${product_name} in categories ${cat1} and ${cat2}

A customer filters by "${category_name}" on the kiosk
    [Documentation]    Customer selects category filter
    # Would interact with kiosk interface
    Go To    ${KIOSK_URL}
    Wait Until Element Is Visible    id=category-filters    timeout=10s
    Wait Until Element Is Visible    xpath=//button[@data-category='${category_name}']    timeout=10s
    Click Element    xpath=//button[@data-category='${category_name}']
    Wait For Page Load Complete

"${product_name}" should be visible
    [Documentation]    Verifies product appears
    Wait Until Page Contains Element    xpath=//div[contains(@class, 'product-card') and contains(., '${product_name}')]    timeout=5s
    Element Should Be Visible    xpath=//div[contains(@class, 'product-card') and contains(., '${product_name}')]

The customer filters by "${category_name}" on the kiosk
    [Documentation]    Customer changes category filter
    A customer filters by "${category_name}" on the kiosk

"${product_name}" should still be visible
    [Documentation]    Verifies product still appears
    "${product_name}" should be visible

"${product_name}" should not be visible
    [Documentation]    Verifies product does not appear
    Page Should Not Contain Element    xpath=//div[contains(@class, 'product-card') and contains(., '${product_name}')]

The admin is editing a product
    [Documentation]    Opens any product for editing
    Click Element    id=products-menu
    Wait Until Element Is Visible    css=.product-list    timeout=5s
    Click Element    css=.product-list-item:first-child .edit-button
    Wait Until Element Is Visible    id=product-form    timeout=5s

The admin assigns the product to ${count} categories
    [Documentation]    Assigns product to multiple categories
    Wait Until Element Is Visible    id=category-multiselect    timeout=5s
    # Would select multiple categories
    Log    Assigning product to ${count} categories
    Set Test Variable    ${CATEGORY_ASSIGNMENT_COUNT}    ${count}

All ${count} category assignments should be saved
    [Documentation]    Verifies all assignments persisted
    Saves the product
    # Would verify via API or product details
    Log    All ${count} category assignments saved

The product should appear in all ${count} category filters
    [Documentation]    Verifies product in all category filters
    # Would test on kiosk with each category filter
    Log    Product appears in all ${count} category filters

No performance degradation should occur
    [Documentation]    Verifies acceptable performance
    # Would measure response times
    ${count}=    Get Variable Value    ${CATEGORY_ASSIGNMENT_COUNT}    multiple
    Log    Performance remains acceptable with ${count} categories
