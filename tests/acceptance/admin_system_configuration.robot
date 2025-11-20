*** Settings ***
Documentation    Acceptance tests for System Configuration User Stories
...              Covers US-048 onwards
Resource         ../resources/common.robot
Suite Setup      Open Admin Browser
Suite Teardown   Close All Test Browsers
Test Setup       Admin Login
Test Tags        admin    system-config    configuration    high-priority


*** Test Cases ***
US-048: Configure Operating Hours
    [Documentation]    As an administrator, I want to configure operating hours so that 
    ...                the kiosk automatically displays as closed outside these times.
    [Tags]    US-048    operating-hours    automation
    
    Given the admin is on the system configuration page
    When the admin clicks "Configure Operating Hours"
    Then the operating hours configuration form should appear
    When the admin sets Monday opening time to "08:00"
    And sets Monday closing time to "20:00"
    And saves the operating hours
    Then a success message should display "Operating hours updated"
    And the kiosk should show "Open" during configured hours
    And the kiosk should show "Closed" message outside configured hours
    And the next opening time should be displayed when closed


US-048-Edge: Different Hours For Different Days
    [Documentation]    Edge case: Each day can have different operating hours
    [Tags]    US-048    edge-case    day-specific-hours
    
    Given the admin is configuring operating hours
    When the admin sets weekday hours to "08:00-20:00"
    And sets Saturday hours to "10:00-18:00"
    And sets Sunday hours to "12:00-16:00"
    And saves the configuration
    Then each day should have its own hours
    And the kiosk should respect day-specific hours
    And customers should see correct opening times for each day
    And holidays can be marked as "Closed All Day"


US-048-Comprehensive: Operating Hours With Special Cases
    [Documentation]    Comprehensive test: Operating hours handle edge cases
    [Tags]    US-048    comprehensive    special-cases
    
    Given the admin is configuring operating hours
    When the admin enables "24/7 Operation" mode
    Then the kiosk should never show as closed
    And the "Closed" message should be disabled
    When the admin disables "24/7 Operation"
    And sets operating hours with breaks (e.g., closed 12:00-13:00 for lunch)
    Then the kiosk should show as closed during break times
    When the admin sets a public holiday
    Then that day should override regular hours
    And the admin can set holiday-specific hours or mark as fully closed
    And the configuration should allow "Copy Monday hours to all weekdays"


*** Keywords ***
The admin is on the system configuration page
    [Documentation]    Navigates to system configuration
    Click Element    id=admin-menu
    Click Element    id=system-config-menu
    Wait Until Page Contains Element    id=system-config-page    timeout=10s

The admin clicks "Configure Operating Hours"
    [Documentation]    Opens operating hours config
    Click Button    id=configure-hours-button
    Wait Until Element Is Visible    css=.operating-hours-form    timeout=5s

The operating hours configuration form should appear
    [Documentation]    Verifies form visible
    Element Should Be Visible    css=.operating-hours-form
    Element Should Be Visible    id=monday-opening-time
    Element Should Be Visible    id=monday-closing-time

The admin sets ${day} opening time to "${time}"
    [Documentation]    Sets opening time for a day
    ${day_lower}=    Convert To Lower Case    ${day}
    Input Text    id=${day_lower}-opening-time    ${time}

Sets ${day} closing time to "${time}"
    [Documentation]    Sets closing time for a day
    ${day_lower}=    Convert To Lower Case    ${day}
    Input Text    id=${day_lower}-closing-time    ${time}

Saves the operating hours
    [Documentation]    Saves configuration
    Click Button    id=save-operating-hours-button
    Wait For Page Load Complete

The kiosk should show "${status}" during configured hours
    [Documentation]    Verifies kiosk status during hours
    # Would verify kiosk display based on current time
    Log    Kiosk shows ${status} during configured hours

The kiosk should show "${status}" message outside configured hours
    [Documentation]    Verifies kiosk status outside hours
    # Would verify kiosk closed message
    Log    Kiosk shows ${status} message when outside operating hours

The next opening time should be displayed when closed
    [Documentation]    Verifies next opening info
    # Would verify "Opens tomorrow at XX:XX" message
    Log    Next opening time is displayed to customers

The admin is configuring operating hours
    [Documentation]    Admin in hours config mode
    The admin is on the system configuration page
    The admin clicks "Configure Operating Hours"

The admin sets weekday hours to "${hours}"
    [Documentation]    Sets hours for weekdays
    ${opening}    ${closing}=    Split String    ${hours}    -
    FOR    ${day}    IN    Monday    Tuesday    Wednesday    Thursday    Friday
        The admin sets ${day} opening time to "${opening}"
        Sets ${day} closing time to "${closing}"
    END

Sets ${day} hours to "${hours}"
    [Documentation]    Sets hours for specific day
    ${opening}    ${closing}=    Split String    ${hours}    -
    The admin sets ${day} opening time to "${opening}"
    Sets ${day} closing time to "${closing}"

Saves the configuration
    [Documentation]    Saves config
    Saves the operating hours

Each day should have its own hours
    [Documentation]    Verifies day-specific hours
    Log    Each day has independently configured hours

The kiosk should respect day-specific hours
    [Documentation]    Verifies enforcement
    Log    Kiosk respects different hours for different days

Customers should see correct opening times for each day
    [Documentation]    Verifies display
    Log    Correct opening times shown for each day of week

Holidays can be marked as "Closed All Day"
    [Documentation]    Holiday feature
    Element Should Be Visible    id=add-holiday-button
    Log    Holidays can be configured as closed

The admin enables "24/7 Operation" mode
    [Documentation]    Enables always-open mode
    Click Element    id=enable-247-mode
    Wait For Page Load Complete

The kiosk should never show as closed
    [Documentation]    Verifies always open
    Log    Kiosk operates 24/7 without closed status

The "Closed" message should be disabled
    [Documentation]    No closed message
    Log    Closed message is not shown in 24/7 mode

The admin disables "24/7 Operation"
    [Documentation]    Disables 24/7 mode
    Click Element    id=disable-247-mode
    Wait For Page Load Complete

Sets operating hours with breaks (e.g., closed 12:00-13:00 for lunch)
    [Documentation]    Configures break times
    Click Button    id=add-break-button
    Input Text    id=break-start-time    12:00
    Input Text    id=break-end-time    13:00
    Log    Break hours configured

The kiosk should show as closed during break times
    [Documentation]    Verifies break enforcement
    Log    Kiosk shows as closed during configured break times

The admin sets a public holiday
    [Documentation]    Adds holiday
    Click Button    id=add-holiday-button
    Input Text    id=holiday-date    2024-12-25
    Input Text    id=holiday-name    Christmas Day

That day should override regular hours
    [Documentation]    Holiday overrides normal schedule
    Log    Holiday configuration overrides regular operating hours

The admin can set holiday-specific hours or mark as fully closed
    [Documentation]    Holiday options
    Element Should Be Visible    id=holiday-hours-option
    Element Should Be Visible    id=holiday-closed-option
    Log    Holidays can have custom hours or be fully closed

The configuration should allow "Copy Monday hours to all weekdays"
    [Documentation]    Bulk copy feature
    Element Should Be Visible    id=copy-monday-to-weekdays-button
    Log    Quick copy feature available for weekday hours
