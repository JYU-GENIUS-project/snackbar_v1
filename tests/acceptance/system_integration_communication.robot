*** Settings ***
Documentation       System Integration & Communication User Stories (US-064 to US-068)
...                 EXIF stripping, API retry logic, graceful error handling, and payment logging
...                 
...                 These tests verify system-level requirements for:
...                 - Image metadata removal (EXIF stripping)
...                 - MobilePay API retry with exponential backoff
...                 - Graceful handling of API unavailability
...                 - Email notification retry logic
...                 - Comprehensive payment transaction logging

Library             SeleniumLibrary
Resource            ../resources/common.robot

Suite Setup         Setup Test Environment
Suite Teardown      Teardown Test Environment

*** Test Cases ***
US-064: Strip EXIF Metadata From Uploaded Images - Main Scenario
    [Documentation]    As a system, I want to strip EXIF metadata from uploaded images
    ...                so that sensitive location and device data is not stored.
    [Tags]    US-064    system    security    privacy    critical
    
    Given an administrator is logged into the admin portal
    And the admin navigates to the Product Management section
    When the admin uploads a product image with EXIF metadata (GPS, camera model, timestamp)
    Then the uploaded image should be processed and stored without EXIF metadata
    And the GPS coordinates should not be present in the stored image
    And the camera model and device information should not be present
    And the image dimensions and quality should be preserved
    And the image timestamp metadata should be removed

US-064: EXIF Stripping Validation - Edge Case
    [Documentation]    Verify EXIF stripping works for various image formats and complex metadata
    [Tags]    US-064    system    security    edge-case
    
    Given an administrator is logged into the admin portal
    When the admin uploads JPEG, PNG, and WebP images with various EXIF tags
    Then all EXIF data should be stripped from JPEG images (including thumbnail EXIF)
    And PNG images should have all metadata chunks removed (tEXt, zTXt, iTXt)
    And WebP images should have EXIF and XMP metadata removed
    And images with malformed EXIF data should be handled without errors
    And the system should log a confirmation that EXIF stripping was successful

US-064: Privacy Compliance Verification - Comprehensive Test
    [Documentation]    Ensure EXIF stripping meets privacy requirements and handles edge cases
    [Tags]    US-064    system    security    comprehensive
    
    Given an administrator uploads images with comprehensive metadata
    And the images contain GPS coordinates, camera serial number, copyright info, and user comments
    When the images are processed and stored
    Then no personal information should be present in stored images
    And GPS coordinates should be completely removed (latitude, longitude, altitude)
    And device serial numbers and identifiers should be stripped
    And original file creation timestamps should be removed
    And the system should verify metadata removal before final storage
    And re-downloading the image should confirm zero EXIF data present

US-065: Retry Failed MobilePay API Calls With Exponential Backoff - Main Scenario
    [Documentation]    As a system, I want to retry failed MobilePay API calls up to 3 times
    ...                with exponential backoff so that temporary network issues don't cause payment failures.
    [Tags]    US-065    system    integration    reliability    critical
    
    Given a customer has completed their cart and initiated checkout
    And the MobilePay API experiences a temporary network error
    When the system attempts to initiate the payment
    Then the system should retry the API call automatically
    And the first retry should occur after 1 second
    And the second retry should occur after 2 seconds (exponential backoff)
    And the third retry should occur after 4 seconds
    And a maximum of 3 retries should be attempted
    And if successful on retry, the customer should see the QR code normally

US-065: Exponential Backoff Timing Validation - Edge Case
    [Documentation]    Verify retry timing follows exponential backoff pattern correctly
    [Tags]    US-065    system    integration    edge-case
    
    Given a customer initiates a payment
    When the MobilePay API returns transient errors (500, 503, 504)
    Then the system should wait 1 second before retry 1
    And wait 2 seconds before retry 2 (2^1)
    And wait 4 seconds before retry 3 (2^2)
    And the total maximum wait time should be 7 seconds (1+2+4)
    And network errors (timeouts, connection refused) should trigger retries
    And HTTP 4xx client errors (400, 401, 404) should NOT trigger retries
    And the customer should see a "Processing payment..." indicator during retries

US-065: Retry Success And Failure Scenarios - Comprehensive Test
    [Documentation]    Test various retry outcomes and edge cases
    [Tags]    US-065    system    integration    comprehensive
    
    Given the system has retry logic configured
    When MobilePay API fails on first attempt but succeeds on retry 2
    Then the customer should see the QR code successfully
    And the transaction log should record 2 API attempts with timestamps
    When all 3 retries fail
    Then the customer should see error message "Payment service temporarily unavailable. Please try again."
    And the customer should be able to retry their checkout
    And the admin should receive an alert about repeated API failures
    And the system should track API success rate and retry statistics

US-066: Handle MobilePay API Unavailability Gracefully - Main Scenario
    [Documentation]    As a system, I want to handle MobilePay API unavailability gracefully
    ...                so that customers receive clear error messages rather than system crashes.
    [Tags]    US-066    system    integration    reliability    critical
    
    Given a customer has items in cart and clicks checkout
    When the MobilePay API is completely unavailable (returns 503 or times out)
    Then the system should display a user-friendly error message
    And the message should say "Payment service is temporarily unavailable. Please try again in a few minutes."
    And the kiosk UI should remain functional (not crash or freeze)
    And the customer should have options to "Retry" or "Cancel and Return to Shopping"
    And the cart should be preserved so the customer doesn't lose their selections
    And the system should log the API unavailability event for monitoring

US-066: Graceful Degradation During Outages - Edge Case
    [Documentation]    Verify system remains stable during prolonged API outages
    [Tags]    US-066    system    integration    edge-case
    
    Given the MobilePay API is experiencing an extended outage
    When multiple customers attempt checkout during the outage
    Then each customer should see the error message clearly
    And the system should not crash or become unresponsive
    And the kiosk should allow customers to continue browsing products
    And customers should be able to modify their carts normally
    And admin portal should show API health status as "Down" with red indicator
    And admin should receive critical alert email about API outage
    And the system should continue attempting health checks every 30 seconds

US-066: API Recovery And Automatic Resumption - Comprehensive Test
    [Documentation]    Test system behavior when API recovers from outage
    [Tags]    US-066    system    integration    comprehensive
    
    Given the MobilePay API was unavailable and is now recovered
    When a customer who previously saw error tries checkout again
    Then the system should successfully process the payment
    And the QR code should be generated normally
    And the admin portal API health status should update to "Online" with green indicator
    And previous error logs should be marked as "Resolved"
    When API transitions from available to unavailable mid-transaction
    Then the customer should see error after retry attempts exhausted
    And the transaction should be marked as "Failed - API Unavailable"
    And the customer should be guided to contact staff if issue persists

US-067: Retry Failed Email Notifications Up To 3 Times - Main Scenario
    [Documentation]    As a system, I want to retry failed email notifications up to 3 times
    ...                so that important alerts reach administrators despite temporary email service issues.
    [Tags]    US-067    system    notification    reliability    critical
    
    Given the system needs to send a critical email notification (low stock alert)
    And the email SMTP server experiences a temporary connection failure
    When the system attempts to send the email
    Then the system should retry sending the email automatically
    And retry 1 should occur after 30 seconds
    And retry 2 should occur after 60 seconds
    And retry 3 should occur after 120 seconds (exponential-ish backoff)
    And a maximum of 3 retries should be attempted
    And if successful on retry, the email should be sent normally

US-067: Email Retry For Different Notification Types - Edge Case
    [Documentation]    Verify retry logic applies to all notification types
    [Tags]    US-067    system    notification    edge-case
    
    Given the email SMTP server is intermittently failing
    When the system attempts to send low stock notification
    Then the notification should be retried up to 3 times
    When the system attempts to send payment failure alert
    Then the alert should be retried up to 3 times
    When the system attempts to send backup success confirmation
    Then the confirmation should be retried up to 3 times
    When the system attempts to send system error notification
    Then the error notification should be retried up to 3 times
    And critical notifications (payment, system error) should be prioritized in retry queue
    And non-critical notifications should be retried with lower priority

US-067: Email Notification Failure Handling - Comprehensive Test
    [Documentation]    Test behavior when all email retry attempts fail
    [Tags]    US-067    system    notification    comprehensive
    
    Given the email SMTP server is completely unavailable
    When the system attempts to send a critical notification
    And all 3 retry attempts fail
    Then the failed notification should be logged in the admin portal
    And the admin should see "Email Notification Failed" in the error logs
    And the notification content should be stored for manual review
    And the system should attempt to re-queue the notification for later delivery
    When the SMTP server becomes available again
    Then queued notifications should be sent automatically
    And the admin should receive a summary of delayed notifications
    And the system should track email delivery success rate metrics

US-068: Log All Payment Transactions With Detailed Status - Main Scenario
    [Documentation]    As a system, I want to log all payment transactions with detailed status information
    ...                so that payment issues can be debugged and reconciled.
    [Tags]    US-068    system    logging    debugging    critical
    
    Given a customer completes a purchase transaction
    When the payment is processed
    Then the system should create a comprehensive transaction log entry
    And the log should include unique transaction ID
    And the log should include timestamp (date and time with milliseconds)
    And the log should include cart items (product names, quantities, prices)
    And the log should include total amount
    And the log should include payment method (MobilePay)
    And the log should include MobilePay transaction ID
    And the log should include payment status (Initiated, Pending, Confirmed, Failed, Uncertain)
    And the log should be searchable in the admin portal

US-068: Payment Status Transitions Logging - Edge Case
    [Documentation]    Verify all payment status transitions are logged
    [Tags]    US-068    system    logging    edge-case
    
    Given a customer initiates a payment
    When payment status changes from "Initiated" to "Pending"
    Then the status change should be logged with timestamp
    When payment status changes from "Pending" to "Confirmed"
    Then the status change should be logged with timestamp
    And the log should include MobilePay confirmation details
    When a payment fails
    Then the status change to "Failed" should be logged
    And the log should include error code and error message
    When payment status is "Uncertain"
    Then the log should include all MobilePay API responses received
    And the log should flag the transaction for manual review

US-068: Comprehensive Payment Debug Information - Comprehensive Test
    [Documentation]    Ensure payment logs contain sufficient detail for debugging and reconciliation
    [Tags]    US-068    system    logging    comprehensive
    
    Given the system processes various payment transactions
    When viewing transaction logs in admin portal
    Then each log entry should include customer session ID (for debugging)
    And API request/response details (sanitized, no sensitive data in plain text)
    And network latency measurements (time to MobilePay API)
    And retry attempt count (if retries occurred)
    And kiosk identifier (which kiosk the transaction came from)
    And admin user who reconciled uncertain payments (if applicable)
    And logs should be retained for 3 years
    And logs should be exportable to CSV for analysis
    And logs should support filtering by status, date range, amount, and kiosk
    And sensitive payment card data should NEVER be logged (PCI-DSS compliance)
    And logs should be write-only and immutable (cannot be edited or deleted)

*** Keywords ***
Setup Test Environment
    Log    Setting up test environment for integration and communication tests

Teardown Test Environment
    Log    Tearing down test environment for integration and communication tests
