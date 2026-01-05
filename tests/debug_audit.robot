*** Settings ***
Library    SeleniumLibrary
*** Variables ***
${ADMIN_URL}    http://localhost:3000/admin
${BROWSER}      Chrome
*** Test Cases ***
Check Audit Table Markup
    Open Browser    ${ADMIN_URL}/    ${BROWSER}
    Maximize Browser Window
    Wait Until Page Contains Element    id=login-form    timeout=10s
    Input Text    id=username    admin
    Input Password    id=password    SecurePass123!
    Click Button    id=login-button
    Wait Until Page Contains Element    id=admin-dashboard    timeout=10s
    Click Element    id=audit-trail-menu
    Wait Until Page Contains Element    id=audit-trail-table    timeout=10s
    ${first_row}=    Get WebElement    css=.audit-log-entry:first-child
    ${admin_cell}=    Get Text    xpath=//*[@id='audit-trail-table']//tr[1]//td[@class='audit-admin']
    Log    First row admin cell: ${admin_cell}
    Close Browser
