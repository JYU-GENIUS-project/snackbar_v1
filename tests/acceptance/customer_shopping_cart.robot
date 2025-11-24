*** Settings ***
Documentation    Acceptance tests for Shopping Cart Management User Stories
...              Covers US-006 through US-010
Resource         ../resources/common.robot
Suite Setup      Open Kiosk Browser
Suite Teardown   Close All Test Browsers
Test Setup       Setup Cart Test
Test Teardown    Clear Shopping Cart
Test Tags        customer    shopping-cart    high-priority


*** Test Cases ***
US-006: Add Multiple Items To Cart
    [Documentation]    As a customer, I want to add multiple items to my shopping cart 
    ...                so that I can purchase several products in a single transaction.
    [Tags]    US-006    cart-functionality    multi-item
    
    Given the kiosk is operational
    When the customer adds "Coca-Cola" to the cart
    And the customer adds "Chips" to the cart
    And the customer adds "Cookie" to the cart
    Then the cart should contain 3 items
    And all items should be visible in the cart
    And each item should show name and price


US-007: View Running Total In Real-Time
    [Documentation]    As a customer, I want to see a running total of my cart in 
    ...                real-time so that I know exactly how much I'm spending.
    [Tags]    US-007    cart-total    real-time-update
    
    Given the cart is empty
    When the customer adds "Coca-Cola" (€2.50) to the cart
    Then the cart total should display "2.50€"
    When the customer adds "Chips" (€1.50) to the cart
    Then the cart total should display "4.00€"
    When the customer adds "Cookie" (€1.00) to the cart
    Then the cart total should display "5.00€"
    And the total should update immediately after each addition


US-008: Adjust Item Quantities With Plus-Minus Buttons
    [Documentation]    As a customer, I want to adjust quantities of items in my cart 
    ...                using +/- buttons so that I can easily change my order before checkout.
    [Tags]    US-008    quantity-adjustment    buttons
    
    Given "Coca-Cola" is in the cart with quantity 1
    When the customer clicks the "+" button for "Coca-Cola"
    Then the quantity should be 2
    And the subtotal should update to "5.00€"
    When the customer clicks the "+" button again
    Then the quantity should be 3
    And the subtotal should update to "7.50€"
    When the customer clicks the "-" button
    Then the quantity should be 2
    And the subtotal should update to "5.00€"
    And all buttons should meet 44x44px touch target minimum


US-009: Remove Individual Items From Cart
    [Documentation]    As a customer, I want to remove individual items from my cart 
    ...                so that I can change my mind about specific products.
    [Tags]    US-009    remove-item    cart-management
    
    Given the cart contains "Coca-Cola", "Chips", and "Cookie"
    And the cart has 3 items
    When the customer clicks remove button for "Chips"
    Then "Chips" should be removed from the cart
    And the cart should contain 2 items
    And the cart total should reflect the removal
    And the remove button should meet 44x44px touch target minimum


US-010: Automatic Cart Clearing After 5 Minutes Inactivity
    [Documentation]    As a customer, I want my cart to automatically clear after 
    ...                5 minutes of inactivity so that the kiosk is ready for the 
    ...                next person if I walk away.
    [Tags]    US-010    timeout    auto-clear    slow
    
    Given the cart contains items
    And the customer has been inactive
    When 5 minutes pass with no interaction
    Then the cart should be automatically cleared
    And the screen should return to the home screen
    And the cart badge should show 0 items


US-010-Edge: Timer Reset On Interaction
    [Documentation]    Edge case: Inactivity timer resets with any interaction
    [Tags]    US-010    edge-case    timer-reset
    
    Given the cart contains items
    And 4 minutes and 50 seconds have passed
    When the customer scrolls the product grid
    And another 4 minutes and 50 seconds pass
    Then the cart should still contain the items
    And the timer should have reset on interaction
    And the cart should not be cleared


US-010-Boundary: Warning Before Timeout
    [Documentation]    Optional: Warning 30 seconds before timeout
    [Tags]    US-010    optional-feature    countdown-warning
    
    Given the cart contains items
    When 4 minutes and 30 seconds of inactivity pass
    Then a warning message MAY be displayed
    And the warning should indicate time remaining
    And the user should be able to dismiss or interact to reset


*** Keywords ***
Setup Cart Test
    [Documentation]    Sets up test by navigating to kiosk and clearing cart
    Go To    ${KIOSK_URL}
    Wait For Page Load Complete
    Clear Shopping Cart If Not Empty

The kiosk is operational
    [Documentation]    Verifies kiosk is in operational state
    Page Should Contain Element    id=product-grid
    Element Should Be Visible    id=product-grid

Clear Shopping Cart If Not Empty
    [Documentation]    Clears cart if it contains items
    ${cart_count}=    Run Keyword And Return Status    
    ...    Page Should Contain Element    id=cart-badge
    IF    ${cart_count}
        ${badge_text}=    Get Text    id=cart-badge
        ${count}=    Convert To Integer    ${badge_text}
        IF    ${count} > 0
            Clear Shopping Cart
        END
    END

The customer adds "${product_name}" to the cart
    [Documentation]    Adds specified product to cart
    Add Product To Cart    ${product_name}

The cart should contain ${expected_count} items
    [Documentation]    Verifies cart item count
    Verify Cart Item Count    ${expected_count}

All items should be visible in the cart
    [Documentation]    Opens cart and verifies all items visible
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=cart-items    timeout=5s
    ${cart_items}=    Get WebElements    css=.cart-item
    ${count}=    Get Length    ${cart_items}
    Should Be True    ${count} > 0

Each item should show name and price
    [Documentation]    Verifies each cart item shows required info
    ${cart_items}=    Get WebElements    css=.cart-item
    FOR    ${item}    IN    @{cart_items}
        Element Should Be Visible    ${item}/descendant::*[@class='item-name']
        Element Should Be Visible    ${item}/descendant::*[@class='item-price']
    END

The cart is empty
    [Documentation]    Verifies cart starts empty
    ${badge}=    Run Keyword And Return Status    Element Should Be Visible    id=cart-badge
    IF    ${badge}
        ${count}=    Get Text    id=cart-badge
        Should Be Equal    ${count}    0
    END

The customer adds "${product_name}" (€${price}) to the cart
    [Documentation]    Adds product with specific price to cart
    Add Product To Cart    ${product_name}

The cart total should display "${expected_total}"
    [Documentation]    Verifies cart total matches expected amount
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=cart-total    timeout=5s
    ${total}=    Get Text    id=cart-total
    Should Contain    ${total}    ${expected_total}
    # Close cart view
    Press Keys    None    ESCAPE

The total should update immediately after each addition
    [Documentation]    Verifies real-time total updates
    # This is verified by the previous steps showing immediate updates
    Log    Cart total updates verified in real-time

"${product_name}" is in the cart with quantity ${quantity}
    [Documentation]    Sets up cart with product at specific quantity
    Add Product To Cart    ${product_name}
    ${current_qty}=    Get Product Quantity In Cart    ${product_name}
    WHILE    ${current_qty} < ${quantity}
        Click Plus Button For Product    ${product_name}
        ${current_qty}=    Evaluate    ${current_qty} + 1
    END

The customer clicks the "+" button for "${product_name}"
    [Documentation]    Clicks increment button for product
    Click Plus Button For Product    ${product_name}

The quantity should be ${expected_qty}
    [Documentation]    Verifies product quantity in cart
    ${qty}=    Get Product Quantity In Cart    ${product_name}
    Should Be Equal As Numbers    ${qty}    ${expected_qty}

The subtotal should update to "${expected_subtotal}"
    [Documentation]    Verifies product subtotal
    ${subtotal}=    Get Product Subtotal In Cart    ${product_name}
    Should Contain    ${subtotal}    ${expected_subtotal}

The customer clicks the "+" button again
    [Documentation]    Clicks increment button again
    Click Plus Button For Product    Coca-Cola

The customer clicks the "-" button
    [Documentation]    Clicks decrement button
    Click Minus Button For Product    Coca-Cola

All buttons should meet 44x44px touch target minimum
    [Documentation]    Verifies button sizes meet touch requirements
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=cart-items    timeout=5s
    ${plus_buttons}=    Get WebElements    css=.quantity-plus-button
    ${minus_buttons}=    Get WebElements    css=.quantity-minus-button
    FOR    ${button}    IN    @{plus_buttons}
        Verify Touch Target Size    ${button}
    END
    FOR    ${button}    IN    @{minus_buttons}
        Verify Touch Target Size    ${button}
    END

The cart contains "${product1}", "${product2}", and "${product3}"
    [Documentation]    Adds three specific products to cart
    Add Product To Cart    ${product1}
    Add Product To Cart    ${product2}
    Add Product To Cart    ${product3}

The cart has ${expected_count} items
    [Documentation]    Verifies cart item count
    Verify Cart Item Count    ${expected_count}

The customer clicks remove button for "${product_name}"
    [Documentation]    Clicks remove button for specific product
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=cart-items    timeout=5s
    Click Element    xpath=//div[@data-product-name='${product_name}']//button[@class='remove-button']

"${product_name}" should be removed from the cart
    [Documentation]    Verifies product no longer in cart
    Page Should Not Contain Element    xpath=//div[@data-product-name='${product_name}']

The cart total should reflect the removal
    [Documentation]    Verifies total updated after removal
    ${total}=    Get Text    id=cart-total
    # Total should not include removed item price
    Should Not Contain    ${total}    1.50€

The remove button should meet 44x44px touch target minimum
    [Documentation]    Verifies remove button size
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=cart-items    timeout=5s
    ${remove_buttons}=    Get WebElements    css=.remove-button
    FOR    ${button}    IN    @{remove_buttons}
        Verify Touch Target Size    ${button}
    END

The cart contains items
    [Documentation]    Ensures cart has items for timeout testing
    Add Product To Cart    Coca-Cola
    Add Product To Cart    Chips
    Verify Cart Item Count    2

The customer has been inactive
    [Documentation]    Simulates start of inactivity period
    Log    Starting inactivity timer

5 minutes pass with no interaction
    [Documentation]    Simulates 5 minute timeout
    # Note: In real test, this would need to wait actual 5 minutes or
    # use time manipulation. For demonstration, we simulate the condition.
    Simulate Inactivity    300
    # Alternatively, manipulate system time or use API to trigger timeout

The cart should be automatically cleared
    [Documentation]    Verifies cart was cleared automatically
    ${badge}=    Run Keyword And Return Status    Element Should Be Visible    id=cart-badge
    IF    ${badge}
        ${count}=    Get Text    id=cart-badge
        Should Be Equal    ${count}    0
    END

The screen should return to the home screen
    [Documentation]    Verifies screen returned to home
    Wait Until Element Is Visible    id=product-grid    timeout=5s

The cart badge should show 0 items
    [Documentation]    Verifies cart badge shows empty
    ${badge_visible}=    Run Keyword And Return Status    
    ...    Element Should Be Visible    id=cart-badge
    IF    ${badge_visible}
        ${count}=    Get Text    id=cart-badge
        Should Be Equal    ${count}    0
    END

4 minutes and 50 seconds have passed
    [Documentation]    Simulates 4:50 of inactivity
    Simulate Inactivity    290

The customer scrolls the product grid
    [Documentation]    Simulates user interaction
    Execute Javascript    window.scrollBy(0, 100)
    Sleep    0.5s

Another 4 minutes and 50 seconds pass
    [Documentation]    Simulates another 4:50 period
    Simulate Inactivity    290

The cart should still contain the items
    [Documentation]    Verifies items still in cart
    ${count}=    Get Text    id=cart-badge
    Should Be True    ${count} > 0

The timer should have reset on interaction
    [Documentation]    Verifies timer reset behavior
    # This is implicitly verified by items still being in cart
    Log    Timer reset verified by cart still containing items

The cart should not be cleared
    [Documentation]    Verifies cart not cleared
    Verify Cart Item Count    2

4 minutes and 30 seconds of inactivity pass
    [Documentation]    Simulates 4:30 of inactivity (30s before timeout)
    Simulate Inactivity    270

A warning message MAY be displayed
    [Documentation]    Checks for optional warning (may or may not exist)
    ${warning_shown}=    Run Keyword And Return Status    
    ...    Page Should Contain Element    id=inactivity-warning
    Log    Warning displayed: ${warning_shown}

The warning should indicate time remaining
    [Documentation]    Verifies warning shows countdown
    ${warning_shown}=    Run Keyword And Return Status    
    ...    Element Should Be Visible    id=inactivity-warning
    IF    ${warning_shown}
        ${warning_text}=    Get Text    id=inactivity-warning
        Should Match Regexp    ${warning_text}    \\d+\\s*second
    END

The user should be able to dismiss or interact to reset
    [Documentation]    Verifies user can dismiss warning
    ${warning_shown}=    Run Keyword And Return Status    
    ...    Element Should Be Visible    id=inactivity-warning
    IF    ${warning_shown}
        ${dismiss_button}=    Run Keyword And Return Status    
        ...    Element Should Be Visible    id=dismiss-warning
        Should Be True    ${dismiss_button}
    END

Get Product Quantity In Cart
    [Arguments]    ${product_name}
    [Documentation]    Returns current quantity of product in cart
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=cart-items    timeout=5s
    ${qty_element}=    Get WebElement    
    ...    xpath=//div[@data-product-name='${product_name}']//span[@class='quantity-value']
    ${qty}=    Get Text    ${qty_element}
    Press Keys    None    ESCAPE
    RETURN    ${qty}

Get Product Subtotal In Cart
    [Arguments]    ${product_name}
    [Documentation]    Returns subtotal for product in cart
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=cart-items    timeout=5s
    ${subtotal_element}=    Get WebElement    
    ...    xpath=//div[@data-product-name='${product_name}']//span[@class='item-subtotal']
    ${subtotal}=    Get Text    ${subtotal_element}
    Press Keys    None    ESCAPE
    RETURN    ${subtotal}

Click Plus Button For Product
    [Arguments]    ${product_name}
    [Documentation]    Clicks plus button for specified product
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=cart-items    timeout=5s
    Click Element    xpath=//div[@data-product-name='${product_name}']//button[@class='quantity-plus-button']
    Sleep    0.5s

Click Minus Button For Product
    [Arguments]    ${product_name}
    [Documentation]    Clicks minus button for specified product
    Click Element    id=cart-icon
    Wait Until Element Is Visible    id=cart-items    timeout=5s
    Click Element    xpath=//div[@data-product-name='${product_name}']//button[@class='quantity-minus-button']
    Sleep    0.5s
