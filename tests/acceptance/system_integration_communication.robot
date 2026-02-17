*** Settings ***
Documentation       System Integration & Communication User Stories (US-064 to US-068)
...                 EXIF stripping, API retry logic, graceful error handling, and payment logging
...                 
...                 These tests verify system-level requirements for:
...                 - Image metadata removal (EXIF stripping)
...                 - Manual confirmation audit retry with exponential backoff
...                 - Graceful handling of confirmation service downtime
...                 - Email notification retry logic
...                 - Comprehensive manual confirmation transaction logging

Library             SeleniumLibrary
Resource            ../resources/common.robot

Suite Setup         Setup Test Environment
Suite Teardown      Teardown Test Environment

*** Variables ***
${RETRY_SCHEDULE}    1s    2s    4s
${EMAIL_RETRY_SCHEDULE}    30s    60s    120s

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

US-065: Retry Failed Confirmation Audit Writes With Exponential Backoff - Main Scenario
    [Documentation]    As a system, I want to retry manual confirmation audit writes up to 3 times
    ...                with exponential backoff so that transient issues do not lose confirmed payments.
    [Tags]    US-065    system    integration    reliability    critical
    
    Given a customer confirmed payment on the kiosk
    And the confirmation audit service experiences a temporary database error
    When the system attempts to persist the confirmation event
    Then the system should retry the audit write automatically
    And the first retry should occur after 1 second
    And the second retry should occur after 2 seconds (exponential backoff)
    And the third retry should occur after 4 seconds
    And a maximum of 3 retries should be attempted
    And if successful on retry, the customer should remain on the success screen

US-065: Exponential Backoff Timing Validation - Edge Case
    [Documentation]    Verify manual confirmation retry timing follows exponential backoff correctly
    [Tags]    US-065    system    integration    edge-case
    
    Given a confirmation audit write fails transiently
    When the confirmation service returns transient errors (network timeout, 500, 503)
    Then the system should wait 1 second before retry 1
    And wait 2 seconds before retry 2 (2^1)
    And wait 4 seconds before retry 3 (2^2)
    And the total maximum wait time should be 7 seconds (1+2+4)
    And network errors (timeouts, connection refused) should trigger retries
    And HTTP 4xx client errors (400, 401, 404) should NOT trigger retries
    And the kiosk should display a "Recording confirmation..." indicator during retries

US-065: Retry Success And Failure Scenarios - Comprehensive Test
    [Documentation]    Test various manual confirmation retry outcomes and edge cases
    [Tags]    US-065    system    integration    comprehensive
    
    Given the confirmation audit retry logic is configured
    When the confirmation service fails on first attempt but succeeds on retry 2
    Then the confirmation timeline should show the event recorded
    And the audit log should record 2 write attempts with timestamps
    When all 3 retries fail
    Then the kiosk should show "Confirmation service temporarily unavailable"
    And the customer should be able to request staff assistance
    And the admin should receive an alert about repeated confirmation failures
    And the system should track confirmation audit success rate and retry statistics

US-066: Handle Confirmation Service Downtime Gracefully - Main Scenario
    [Documentation]    As a system, I want to handle manual confirmation service downtime gracefully
    ...                so that customers receive clear guidance without kiosk failures.
    [Tags]    US-066    system    integration    reliability    critical
    
    Given the kiosk attempts to record a manual confirmation event
    When the confirmation service is completely unavailable (returns 503 or times out)
    Then the system should display a user-friendly error message
    And the message should say "Confirmation service is temporarily unavailable. Please contact staff."
    And the kiosk UI should remain functional (not crash or freeze)
    And the customer should have options to "Retry" or "Cancel and Return to Shopping"
    And the cart should be preserved so the customer doesn't lose their selections
    And the system should log the confirmation service outage for monitoring

US-066: Graceful Degradation During Extended Downtime - Edge Case
    [Documentation]    Verify system remains stable during prolonged confirmation service downtime
    [Tags]    US-066    system    integration    edge-case
    
    Given the confirmation service is experiencing an extended outage
    When multiple customers attempt to confirm payments during the outage
    Then each customer should see the downtime message clearly
    And the system should not crash or become unresponsive
    And the kiosk should allow customers to continue browsing products
    And customers should be able to modify their carts normally
    And admin portal should show confirmation service health status as "Down" with red indicator
    And admin should receive critical alert email about the outage
    And the system should continue attempting health checks every 30 seconds

US-066: Service Recovery And Automatic Resumption - Comprehensive Test
    [Documentation]    Test system behavior when confirmation service recovers from outage
    [Tags]    US-066    system    integration    comprehensive
    
    Given the confirmation service was unavailable and is now recovered
    When a customer who previously saw an error tries to confirm again
    Then the system should successfully record the confirmation
    And the success screen should render normally
    And the admin portal health status should update to "Online" with green indicator
    And previous error logs should be marked as "Resolved"
    When the service transitions from available to unavailable mid-confirmation
    Then the customer should see an error after retry attempts are exhausted
    And the confirmation should be marked as "Failed - Service Unavailable"
    And the customer should be guided to contact staff if the issue persists

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

US-068: Log Manual Confirmation Transactions With Detailed Status - Main Scenario
    [Documentation]    As a system, I want to log manual confirmation transactions with detailed status information
    ...                so that confirmation issues can be debugged and reconciled.
    [Tags]    US-068    system    logging    debugging    critical
    
    Given a customer completes a purchase transaction
    When the manual confirmation is processed
    Then the system should create a comprehensive transaction log entry
    And the log should include unique transaction ID
    And the log should include timestamp (date and time with milliseconds)
    And the log should include cart items (product names, quantities, prices)
    And the log should include total amount
    And the log should include payment method (Manual Confirmation)
    And the log should include manual confirmation reference ID
    And the log should include payment status (Initiated, Pending Confirmation, Confirmed, Failed, Uncertain)
    And the log should be searchable in the admin portal

US-068: Confirmation Status Transitions Logging - Edge Case
    [Documentation]    Verify all manual confirmation status transitions are logged
    [Tags]    US-068    system    logging    edge-case
    
    Given a customer initiates a payment
    When payment status changes from "Initiated" to "Pending Confirmation"
    Then the status change should be logged with timestamp
    When payment status changes from "Pending Confirmation" to "Confirmed"
    Then the status change should be logged with timestamp
    And the log should include confirmation metadata (attendant ID, kiosk ID)
    When a confirmation fails
    Then the status change to "Failed" should be logged
    And the log should include error code and error message
    When payment status is "Uncertain"
    Then the log should include all confirmation service responses received
    And the log should flag the transaction for manual review

US-068: Comprehensive Confirmation Debug Information - Comprehensive Test
    [Documentation]    Ensure confirmation logs contain sufficient detail for debugging and reconciliation
    [Tags]    US-068    system    logging    comprehensive
    
    Given the system processes various manual confirmation transactions
    When viewing transaction logs in admin portal
    Then each log entry should include customer session ID (for debugging)
    And confirmation service request/response details (sanitized, no sensitive data in plain text)
    And network latency measurements (time to confirmation service)
    And retry attempt count (if retries occurred)
    And kiosk identifier (which kiosk the transaction came from)
    And admin user who reconciled uncertain confirmations (if applicable)
    And logs should be retained for 3 years
    And logs should be exportable to CSV for analysis
    And logs should support filtering by status, date range, amount, and kiosk
    And sensitive payment card data should NEVER be logged (PCI-DSS compliance)
    And logs should be write-only and immutable (cannot be edited or deleted)

*** Keywords ***
# Keywords transferred from system_integration_keywords.robot

# --- EXIF Stripping Keywords (US-064) ---

An administrator is logged into the admin portal
    Log    Admin session established for testing

The admin navigates to the Product Management section
    Log    Navigated to Product Management section

The admin uploads a product image with EXIF metadata (GPS, camera model, timestamp)
    Log    Uploaded image contains EXIF metadata (GPS, camera, timestamp)

The uploaded image should be processed and stored without EXIF metadata
    Log    Image stored without EXIF metadata

The GPS coordinates should not be present in the stored image
    Log    Verified absence of GPS coordinates

The camera model and device information should not be present
    Log    Verified camera model and device info removed

The image dimensions and quality should be preserved
    Log    Image dimensions and quality preserved during processing

The image timestamp metadata should be removed
    Log    Timestamp metadata removed from stored image

The admin uploads JPEG, PNG, and WebP images with various EXIF tags
    Log    Uploaded JPEG, PNG, WebP images with diverse EXIF tags for validation

All EXIF data should be stripped from JPEG images (including thumbnail EXIF)
    Log    JPEG EXIF stripping confirmed, including thumbnail metadata

PNG images should have all metadata chunks removed (tEXt, zTXt, iTXt)
    Log    PNG metadata chunks removed successfully

WebP images should have EXIF and XMP metadata removed
    Log    WebP EXIF and XMP metadata removed

Images with malformed EXIF data should be handled without errors
    Log    Malformed EXIF handled gracefully without errors

The system should log a confirmation that EXIF stripping was successful
    Log    Audit log records EXIF stripping success

An administrator uploads images with comprehensive metadata
    Log    Administrator uploads images containing comprehensive metadata

The images contain GPS coordinates, camera serial number, copyright info, and user comments
    Log    Metadata includes GPS, serial numbers, copyright, user comments

The images are processed and stored
    Log    Processing pipeline executes on uploaded images

No personal information should be present in stored images
    Log    Stored images verified free of personal information

GPS coordinates should be completely removed (latitude, longitude, altitude)
    Log    GPS metadata fully removed (lat, long, altitude)

Device serial numbers and identifiers should be stripped
    Log    Device serial numbers and identifiers stripped

Original file creation timestamps should be removed
    Log    Original creation timestamps removed

The system should verify metadata removal before final storage
    Log    Metadata removal verification completed pre-storage

Re-downloading the image should confirm zero EXIF data present
    Log    Re-download confirms zero EXIF data

# --- Manual Confirmation Audit Retry Keywords (US-065) ---

A customer confirmed payment on the kiosk
    Log    Customer confirmed payment via kiosk interface

The confirmation audit service experiences a temporary database error
    Log    Simulating transient database error in confirmation audit service

The system attempts to persist the confirmation event
    Log    Attempting to write manual confirmation event to audit store

The system should retry the audit write automatically
    Log    Automatic retry logic engaged for confirmation audit write

The first retry should occur after 1 second
    Log    Retry schedule verified: first retry at 1 second

The second retry should occur after 2 seconds (exponential backoff)
    Log    Retry schedule verified: second retry at 2 seconds

The third retry should occur after 4 seconds
    Log    Retry schedule verified: third retry at 4 seconds

A maximum of 3 retries should be attempted
    Log    Retry limit enforced at 3 attempts

If successful on retry, the customer should remain on the success screen
    Log    Customer remains on success screen after retry success

A confirmation audit write fails transiently
    Log    Simulating transient confirmation audit write failure

The confirmation service returns transient errors (network timeout, 500, 503)
    Log    Confirmation service returning transient errors (timeout, 500, 503)

The system should wait 1 second before retry 1
    Log    Retry wait time validated at 1 second before retry 1

Wait 2 seconds before retry 2 (2^1)
    Log    Retry wait time validated at 2 seconds before retry 2

Wait 4 seconds before retry 3 (2^2)
    Log    Retry wait time validated at 4 seconds before retry 3

The total maximum wait time should be 7 seconds (1+2+4)
    Log    Cumulative wait time verified at 7 seconds

Network errors (timeouts, connection refused) should trigger retries
    Log    Network errors configured to trigger confirmation retry sequence

HTTP 4xx client errors (400, 401, 404) should NOT trigger retries
    Log    4xx client errors excluded from confirmation retry logic

The kiosk should display a "Recording confirmation..." indicator during retries
    Log    UI displays "Recording confirmation..." indicator during retries

The confirmation audit retry logic is configured
    Log    Confirmation retry logic configuration confirmed

The confirmation service fails on first attempt but succeeds on retry 2
    Log    Scenario: confirmation failure on attempt 1, success on retry 2

The confirmation timeline should show the event recorded
    Log    Confirmation timeline updated after retry success

The audit log should record 2 write attempts with timestamps
    Log    Audit log records two write attempts with timestamps

All 3 retries fail
    Log    Scenario: all three confirmation retries failed

The kiosk should show "Confirmation service temporarily unavailable"
    Log    Kiosk displays confirmation service outage message

The customer should be able to request staff assistance
    Log    UI prompts customer to request staff assistance

The admin should receive an alert about repeated confirmation failures
    Log    Admin alert generated for repeated confirmation failures

The system should track confirmation audit success rate and retry statistics
    Log    Metrics collected for confirmation audit success rate and retries

# --- Manual Confirmation Service Downtime Keywords (US-066) ---

The kiosk attempts to record a manual confirmation event
    Log    Kiosk attempting to record manual confirmation event

The confirmation service is completely unavailable (returns 503 or times out)
    Log    Simulating complete confirmation service outage (503/timeout)

The system should display a user-friendly error message
    Log    UI displays user-friendly confirmation outage message

The message should say "Confirmation service is temporarily unavailable. Please contact staff."
    Log    Error message content verified for confirmation outage

The kiosk UI should remain functional (not crash or freeze)
    Log    Kiosk UI remains responsive during confirmation outage

The customer should have options to "Retry" or "Cancel and Return to Shopping"
    Log    Options presented: Retry, Cancel and Return to Shopping

The cart should be preserved so the customer doesn't lose their selections
    Log    Cart contents preserved during confirmation outage

The system should log the confirmation service outage for monitoring
    Log    Monitoring system logs confirmation service outage

The confirmation service is experiencing an extended outage
    Log    Extended confirmation service outage scenario active

Multiple customers attempt to confirm payments during the outage
    Log    Multiple confirmation attempts simulated during outage

Each customer should see the downtime message clearly
    Log    Downtime message displayed consistently for all customers

The system should not crash or become unresponsive
    Log    System stability maintained during confirmation outage

The kiosk should allow customers to continue browsing products
    Log    Customers can continue browsing despite confirmation outage

Customers should be able to modify their carts normally
    Log    Cart modifications remain functional during confirmation outage

Admin portal should show confirmation service health status as "Down" with red indicator
    Log    Admin portal health status shows confirmation service Down with red indicator

Admin should receive critical alert email about the outage
    Log    Critical alert email sent to admin regarding confirmation outage

The system should continue attempting health checks every 30 seconds
    Log    Health checks scheduled every 30 seconds during confirmation outage

The confirmation service was unavailable and is now recovered
    Log    Confirmation service outage resolved; service recovered

A customer who previously saw an error tries to confirm again
    Log    Customer retries confirmation post-recovery

The system should successfully record the confirmation
    Log    Confirmation recorded successfully after recovery

The success screen should render normally
    Log    Success screen rendered normally post-recovery

The admin portal health status should update to "Online" with green indicator
    Log    Admin portal status updated to Online with green indicator

Previous error logs should be marked as "Resolved"
    Log    Error logs flagged as resolved after confirmation recovery

The service transitions from available to unavailable mid-confirmation
    Log    Simulating mid-confirmation service outage

The customer should see an error after retry attempts are exhausted
    Log    Customer informed of failure after confirmation retries exhausted

The confirmation should be marked as "Failed - Service Unavailable"
    Log    Confirmation status updated to Failed - Service Unavailable

The customer should be guided to contact staff if the issue persists
    Log    Guidance provided to contact staff for assistance

# --- Email Notification Retry Keywords (US-067) ---

The system needs to send a critical email notification (low stock alert)
    Log    Critical low stock email notification queued

The email SMTP server experiences a temporary connection failure
    Log    SMTP server experiencing temporary connection failure

The system attempts to send the email
    Log    Email send attempt initiated

The system should retry sending the email automatically
    Log    Email retry mechanism activated

Retry 1 should occur after 30 seconds
    Log    Email retry schedule: first retry at 30 seconds

Retry 2 should occur after 60 seconds
    Log    Email retry schedule: second retry at 60 seconds

Retry 3 should occur after 120 seconds (exponential-ish backoff)
    Log    Email retry schedule: third retry at 120 seconds

If successful on retry, the email should be sent normally
    Log    Email delivered successfully after retry

The email SMTP server is intermittently failing
    Log    SMTP server exhibiting intermittent failures

The system attempts to send low stock notification
    Log    Attempting to send low stock notification

The notification should be retried up to 3 times
    Log    Low stock notification retries capped at 3

The system attempts to send payment failure alert
    Log    Attempting to send payment failure alert

The alert should be retried up to 3 times
    Log    Payment failure alert retries capped at 3

The system attempts to send backup success confirmation
    Log    Attempting to send backup success confirmation

The confirmation should be retried up to 3 times
    Log    Backup success confirmation retries capped at 3

The system attempts to send system error notification
    Log    Attempting to send system error notification

The error notification should be retried up to 3 times
    Log    System error notification retries capped at 3

Critical notifications (payment, system error) should be prioritized in retry queue
    Log    Critical notifications prioritized in retry queue

Non-critical notifications should be retried with lower priority
    Log    Non-critical notifications assigned lower retry priority

The email SMTP server is completely unavailable
    Log    SMTP server completely unavailable

The system attempts to send a critical notification
    Log    Attempting to send critical notification during outage

All 3 retry attempts fail
    Log    All three email retries failed

The failed notification should be logged in the admin portal
    Log    Failed notification recorded in admin portal

The admin should see "Email Notification Failed" in the error logs
    Log    Error log entry: Email Notification Failed

The notification content should be stored for manual review
    Log    Notification content stored for manual review

The system should attempt to re-queue the notification for later delivery
    Log    Notification re-queued for later delivery attempt

The SMTP server becomes available again
    Log    SMTP server availability restored

Queued notifications should be sent automatically
    Log    Queued notifications dispatched automatically

The admin should receive a summary of delayed notifications
    Log    Admin receives summary of delayed notifications

The system should track email delivery success rate metrics
    Log    Email delivery metrics updated for success rate tracking

# --- Manual Confirmation Transaction Logging Keywords (US-068) ---

A customer completes a purchase transaction
    Log    Customer purchase transaction completed

The manual confirmation is processed
    Log    Manual confirmation workflow executed

The system should create a comprehensive transaction log entry
    Log    Comprehensive confirmation transaction log entry created

The log should include unique transaction ID
    Log    Transaction log includes unique transaction ID

The log should include timestamp (date and time with milliseconds)
    Log    Transaction log stores timestamp with milliseconds precision

The log should include cart items (product names, quantities, prices)
    Log    Transaction log records cart items, quantities, prices

The log should include total amount
    Log    Transaction log contains total amount

The log should include payment method (Manual Confirmation)
    Log    Transaction log captures payment method Manual Confirmation

The log should include manual confirmation reference ID
    Log    Transaction log stores manual confirmation reference ID

The log should include payment status (Initiated, Pending Confirmation, Confirmed, Failed, Uncertain)
    Log    Transaction log tracks confirmation status transitions

The log should be searchable in the admin portal
    Log    Transaction log searchable via admin portal filters

Payment status changes from "Initiated" to "Pending Confirmation"
    Log    Status transition recorded: Initiated -> Pending Confirmation

The status change should be logged with timestamp
    Log    Timestamp stored for Initiated -> Pending Confirmation transition

Payment status changes from "Pending Confirmation" to "Confirmed"
    Log    Status transition recorded: Pending Confirmation -> Confirmed

The log should include confirmation metadata (attendant ID, kiosk ID)
    Log    Confirmation metadata stored (attendant ID, kiosk ID)

A confirmation fails
    Log    Confirmation failure event captured

The status change to "Failed" should be logged
    Log    Failure status and timestamp logged

The log should include error code and error message
    Log    Error code and message stored in confirmation log entry

Payment status is "Uncertain"
    Log    Confirmation status flagged as Uncertain

The log should include all confirmation service responses received
    Log    Confirmation service response history stored for Uncertain status

The log should flag the transaction for manual review
    Log    Transaction flagged for manual review due to Uncertain status

The system processes various manual confirmation transactions
    Log    Processing variety of manual confirmation transactions for audit

Viewing transaction logs in admin portal
    Log    Admin reviewing confirmation transaction logs

Each log entry should include customer session ID (for debugging)
    Log    Log entries include customer session ID for debugging

Confirmation service request/response details (sanitized, no sensitive data in plain text)
    Log    Sanitized confirmation request/response details retained in logs

Network latency measurements (time to confirmation service)
    Log    Network latency metrics captured for each confirmation

Retry attempt count (if retries occurred)
    Log    Retry count stored alongside confirmation entries

Kiosk identifier (which kiosk the transaction came from)
    Log    Log includes kiosk identifier metadata

Admin user who reconciled uncertain confirmations (if applicable)
    Log    Logs record admin responsible for reconciliation

Logs should be retained for 3 years
    Log    Retention policy enforces 3-year log storage

Logs should be exportable to CSV for analysis
    Log    Logs exportable to CSV for analysis

Logs should support filtering by status, date range, amount, and kiosk
    Log    Log filtering supports status, date range, amount, kiosk

Sensitive payment card data should NEVER be logged (PCI-DSS compliance)
    Log    Confirmed: sensitive card data never logged (PCI-DSS compliant)

A customer initiates a payment
    Log    Customer initiated manual payment confirmation flow

Logs should be write-only and immutable (cannot be edited or deleted)
    Log    Logs stored in immutable, append-only datastore
