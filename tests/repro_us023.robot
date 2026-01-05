*** Settings ***
Resource    resources/common.robot

*** Test Cases ***
Repro US-023 Setup
    Open Admin Browser
    Admin Login
    Click Element    id=products-menu
    Wait Until Page Contains Element    id=product-list    timeout=10s
    ${source}=    Get Source
    Log    ${source}
    Close All Browsers
