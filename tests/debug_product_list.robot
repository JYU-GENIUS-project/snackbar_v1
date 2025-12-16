*** Settings ***
Library    SeleniumLibrary
*** Variables ***
${ADMIN_URL}    http://localhost:3000/admin
${BROWSER}      Chrome
*** Test Cases ***
Check Product Creation Message
    Open Browser    ${ADMIN_URL}/    ${BROWSER}
    Maximize Browser Window
    Wait Until Page Contains Element    id=login-form    timeout=10s
    Input Text    id=username    admin
    Input Password    id=password    SecurePass123!
    Click Button    id=login-button
    Wait Until Page Contains Element    id=admin-dashboard    timeout=10s
    Click Element    id=products-menu
    Wait Until Page Contains Element    id=product-list    timeout=10s
    Click Button    id=add-product-button
    Wait Until Element Is Visible    id=product-form    timeout=5s
    Input Text    id=product-name    Debug Product
    Input Text    id=product-price   4.50
    Click Button    id=save-product-button
    Sleep    2s
    ${source}=    Get Source
    Close Browser
    Log    ${source}
