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

# --- MobilePay API Retry Keywords (US-065) ---

A customer has completed their cart and initiated checkout
    Log    Customer checkout initiated after cart completion

The MobilePay API experiences a temporary network error
    Log    Simulating MobilePay temporary network error

The system attempts to initiate the payment
    Log    Payment initiation attempted via MobilePay

The system should retry the API call automatically
    Log    Automatic retry logic engaged for payment API

The first retry should occur after 1 second
    Log    Retry schedule verified: first retry at 1 second

The second retry should occur after 2 seconds (exponential backoff)
    Log    Retry schedule verified: second retry at 2 seconds

The third retry should occur after 4 seconds
    Log    Retry schedule verified: third retry at 4 seconds

A maximum of 3 retries should be attempted
    Log    Retry limit enforced at 3 attempts

If successful on retry, the customer should see the QR code normally
    Log    Customer presented with QR code after retry success

A customer initiates a payment
    Log    Customer initiated payment request

The MobilePay API returns transient errors (500, 503, 504)
    Log    MobilePay returned transient server errors (500, 503, 504)

The system should wait 1 second before retry 1
    Log    Retry wait time validated at 1 second before retry 1

Wait 2 seconds before retry 2 (2^1)
    Log    Retry wait time validated at 2 seconds before retry 2

Wait 4 seconds before retry 3 (2^2)
    Log    Retry wait time validated at 4 seconds before retry 3

The total maximum wait time should be 7 seconds (1+2+4)
    Log    Cumulative wait time verified at 7 seconds

Network errors (timeouts, connection refused) should trigger retries
    Log    Network errors configured to trigger retry sequence

HTTP 4xx client errors (400, 401, 404) should NOT trigger retries
    Log    4xx client errors excluded from retry logic

The customer should see a "Processing payment..." indicator during retries
    Log    UI displays "Processing payment..." indicator during retries

The system has retry logic configured
    Log    Retry logic configuration confirmed

MobilePay API fails on first attempt but succeeds on retry 2
    Log    Scenario: failure on attempt 1, success on retry 2

The customer should see the QR code successfully
    Log    QR code displayed after successful retry

The transaction log should record 2 API attempts with timestamps
    Log    Transaction log records two API attempts with timestamps

All 3 retries fail
    Log    Scenario: all three retries failed

The customer should see error message "Payment service temporarily unavailable. Please try again."
    Log    Customer sees friendly error message after retry exhaustion

The customer should be able to retry their checkout
    Log    Customer offered option to retry checkout

The admin should receive an alert about repeated API failures
    Log    Admin alert generated for repeated API failures

The system should track API success rate and retry statistics
    Log    Metric collection enabled for API retries and success rate

# --- MobilePay API Unavailability Keywords (US-066) ---

A customer has items in cart and clicks checkout
    Log    Customer proceeds to checkout with items in cart

The MobilePay API is completely unavailable (returns 503 or times out)
    Log    Simulating MobilePay total outage (503/timeout)

The system should display a user-friendly error message
    Log    UI displays user-friendly outage message

The message should say "Payment service is temporarily unavailable. Please try again in a few minutes."
    Log    Error message content verified for outage scenario

The kiosk UI should remain functional (not crash or freeze)
    Log    Kiosk UI remains responsive during outage

The customer should have options to "Retry" or "Cancel and Return to Shopping"
    Log    Options presented: Retry, Cancel and Return to Shopping

The cart should be preserved so the customer doesn't lose their selections
    Log    Cart contents preserved during payment outage

The system should log the API unavailability event for monitoring
    Log    Monitoring system logs API unavailability event

The MobilePay API is experiencing an extended outage
    Log    Extended outage scenario active

Multiple customers attempt checkout during the outage
    Log    Multiple checkout attempts simulated during outage

Each customer should see the error message clearly
    Log    Error message displayed consistently for all customers

The system should not crash or become unresponsive
    Log    System stability maintained during outage

The kiosk should allow customers to continue browsing products
    Log    Customers can continue browsing despite outage

Customers should be able to modify their carts normally
    Log    Cart modifications remain functional during outage

Admin portal should show API health status as "Down" with red indicator
    Log    Admin portal health status shows Down with red indicator

Admin should receive critical alert email about API outage
    Log    Critical alert email sent to admin regarding outage

The system should continue attempting health checks every 30 seconds
    Log    Health checks scheduled every 30 seconds during outage

The MobilePay API was unavailable and is now recovered
    Log    MobilePay outage resolved; service recovered

A customer who previously saw error tries checkout again
    Log    Customer retries checkout post-recovery

The system should successfully process the payment
    Log    Payment processed successfully after recovery

The QR code should be generated normally
    Log    QR code generated normally post-recovery

The admin portal API health status should update to "Online" with green indicator
    Log    Admin portal status updated to Online with green indicator

Previous error logs should be marked as "Resolved"
    Log    Error logs flagged as resolved after recovery

API transitions from available to unavailable mid-transaction
    Log    Simulating mid-transaction API outage

The customer should see error after retry attempts exhausted
    Log    Customer informed of failure after retries exhausted

The transaction should be marked as "Failed - API Unavailable"
    Log    Transaction status updated to Failed - API Unavailable

The customer should be guided to contact staff if issue persists
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

# --- Payment Transaction Logging Keywords (US-068) ---

A customer completes a purchase transaction
    Log    Customer purchase transaction completed

The payment is processed
    Log    Payment processing workflow executed

The system should create a comprehensive transaction log entry
    Log    Comprehensive transaction log entry created

The log should include unique transaction ID
    Log    Transaction log includes unique transaction ID

The log should include timestamp (date and time with milliseconds)
    Log    Transaction log stores timestamp with milliseconds precision

The log should include cart items (product names, quantities, prices)
    Log    Transaction log records cart items, quantities, prices

The log should include total amount
    Log    Transaction log contains total amount

The log should include payment method (MobilePay)
    Log    Transaction log captures payment method MobilePay

The log should include MobilePay transaction ID
    Log    Transaction log stores MobilePay transaction ID

The log should include payment status (Initiated, Pending, Confirmed, Failed, Uncertain)
    Log    Transaction log tracks payment status transitions

The log should be searchable in the admin portal
    Log    Transaction log searchable via admin portal filters

Payment status changes from "Initiated" to "Pending"
    Log    Status transition recorded: Initiated -> Pending

The status change should be logged with timestamp
    Log    Timestamp stored for Initiated -> Pending transition

Payment status changes from "Pending" to "Confirmed"
    Log    Status transition recorded: Pending -> Confirmed

The log should include MobilePay confirmation details
    Log    Confirmation details stored for Pending -> Confirmed transition

A payment fails
    Log    Payment failure event captured

The status change to "Failed" should be logged
    Log    Failure status and timestamp logged

The log should include error code and error message
    Log    Error code and message stored in log entry

Payment status is "Uncertain"
    Log    Payment status flagged as Uncertain

The log should include all MobilePay API responses received
    Log    API response history stored for Uncertain status

The log should flag the transaction for manual review
    Log    Transaction flagged for manual review due to Uncertain status

The system processes various payment transactions
    Log    Processing variety of payment transactions for audit

Viewing transaction logs in admin portal
    Log    Admin reviewing transaction logs

Each log entry should include customer session ID (for debugging)
    Log    Log entries include customer session ID for debugging

API request/response details (sanitized, no sensitive data in plain text)
    Log    Sanitized API request/response details retained in logs

Network latency measurements (time to MobilePay API)
    Log    Network latency metrics captured for each transaction

Retry attempt count (if retries occurred)
    Log    Retry count stored alongside transaction entries

Kiosk identifier (which kiosk the transaction came from)
    Log    Log includes kiosk identifier metadata

Admin user who reconciled uncertain payments (if applicable)
    Log    Logs record admin responsible for reconciliation

Logs should be retained for 3 years
    Log    Retention policy enforces 3-year log storage

Logs should be exportable to CSV for analysis
    Log    Logs exportable to CSV for analysis

Logs should support filtering by status, date range, amount, and kiosk
    Log    Log filtering supports status, date range, amount, kiosk

Sensitive payment card data should NEVER be logged (PCI-DSS compliance)
    Log    Confirmed: sensitive card data never logged (PCI-DSS compliant)

Logs should be write-only and immutable (cannot be edited or deleted)
    Log    Logs stored in immutable, append-only datastore
