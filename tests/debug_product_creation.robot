*** Settings ***
Resource    resources/common.robot
Suite Setup    Open Admin Browser
Suite Teardown    Close All Test Browsers

*** Test Cases ***
Capture Banner After Product Save
    Admin Login
    Click Element    id=products-menu
    Wait Until Element Is Visible    id=add-product-button    timeout=10s
    Click Button    id=add-product-button
    Wait Until Element Is Visible    id=product-form    timeout=5s
    Input Text    id=product-name    Debug Product
    Input Text    id=product-price    4.50
    Select From List By Label    id=product-category    Cold Drinks
    Click Button    id=save-product-button
    Sleep    1s
    ${success_text}=    Execute Javascript    var el = document.getElementById('success-message'); return el ? el.textContent : '';
    Log    Success message text: ${success_text}
    ${alerts}=    Execute Javascript    return Array.from(document.querySelectorAll('.alert')).map(a => a.textContent.trim());
    Log    Alerts: ${alerts}
    ${banner_text}=    Execute Javascript    return document.body.innerText
    Log    ===BANNER=== ${banner_text}
