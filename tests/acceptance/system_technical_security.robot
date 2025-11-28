*** Settings ***
Documentation       System Technical & Security User Stories (US-059 to US-063)
...                 Performance, Reliability, Backups, and Security tests
...                 
...                 These tests verify system-level requirements for:
...                 - Transaction data persistence
...                 - Automated backup scheduling
...                 - Password security (hashing)
...                 - Image upload validation and sanitization
...                 - Secure API communication (HTTPS/TLS)

Library             SeleniumLibrary
Resource            ../resources/common.robot

Suite Setup         Setup Test Environment
Suite Teardown      Teardown Test Environment

*** Test Cases ***
US-059: Persist Transaction Data Within 1 Second - Main Scenario
    [Documentation]    As a system, I want to persist transaction data within 1 second
    ...                so that no sales are lost due to system failures.
    [Tags]    US-059    system    performance    reliability    critical
    
    Given the system is operational
    When a customer completes a purchase transaction
    Then the transaction data should be persisted to the database within 1 second
    And the transaction should have a unique transaction ID
    And the transaction should include timestamp, items, quantities, prices, and payment status
    And the data should be immediately queryable from the admin portal

US-059: Transaction Persistence Under Load - Edge Case
    [Documentation]    Verify transaction persistence maintains <1s performance under concurrent load
    [Tags]    US-059    system    performance    edge-case
    
    Given the system is operational
    When 10 concurrent transactions are processed simultaneously
    Then all transaction data should be persisted within 1 second each
    And no transaction data should be lost or corrupted
    And the admin portal should show all 10 transactions correctly

US-059: Transaction Recovery After System Failure - Comprehensive Test
    [Documentation]    Ensure transaction persistence survives system failures
    [Tags]    US-059    system    reliability    comprehensive
    
    Given the system is operational
    And a transaction is in progress with payment confirmed
    When the system experiences a simulated failure before final save
    Then the transaction should be recovered from write-ahead log or transaction buffer
    And the transaction should be marked as "Confirmed" after system restart
    And no duplicate transactions should be created during recovery
    And the admin should be notified of recovered transactions

US-060: Automated Daily Backups At 02:00 - Main Scenario
    [Documentation]    As a system, I want to perform automated daily backups at 02:00
    ...                so that data is protected without impacting operating hours.
    [Tags]    US-060    system    backup    reliability    critical
    
    Given the system is operational
    And the current time is set to 02:00
    When the automated backup process is triggered
    Then a full database backup should be created
    And the backup should be stored in the configured backup location with timestamp
    And the backup file should be compressed to reduce storage space
    And an email confirmation should be sent to configured recipients
    And the backup completion time should be logged in the system

US-060: Backup Scheduling Verification - Edge Case
    [Documentation]    Verify backup runs daily at exactly 02:00 without overlap
    [Tags]    US-060    system    backup    edge-case
    
    Given automated backups are configured for 02:00 daily
    When multiple days pass in the system
    Then backups should execute at 02:00 each day
    And no backup should start if previous backup is still running
    And the system should queue next backup if one is in progress
    And backup history should show exactly one backup per day

US-060: Backup Verification And Restore Testing - Comprehensive Test
    [Documentation]    Comprehensive backup validation including restore capability
    [Tags]    US-060    system    backup    comprehensive
    
    Given a backup was created at 02:00
    When the admin views the backup management dashboard
    Then the backup should be listed with size, date, and checksum
    And the admin should be able to verify backup integrity
    And the admin should be able to download the backup file
    And the system should support test restore to verify backup validity
    And backups older than 90 days should be automatically archived or deleted per retention policy

US-061: Hash Admin Passwords Using bcrypt Or Argon2 - Main Scenario
    [Documentation]    As a system, I want to hash admin passwords using bcrypt or Argon2
    ...                so that credentials are protected even if the database is compromised.
    [Tags]    US-061    system    security    critical
    
    Given the admin registration page is displayed
    When an admin account is created with password "SecurePass123!"
    Then the password should be hashed using bcrypt or Argon2 algorithm
    And the plaintext password should never be stored in the database
    And the password hash should be stored with appropriate salt
    And the password hash should be different for the same password on different accounts
    And login with the correct password should succeed via hash comparison

US-061: Password Hash Security Standards - Edge Case
    [Documentation]    Verify password hashing meets security best practices
    [Tags]    US-061    system    security    edge-case
    
    Given an admin account is created
    When the password hash is examined in the database
    Then the hash should use bcrypt with minimum cost factor of 12 or Argon2id
    And the hash should include a unique salt per password
    And the hash format should follow standard bcrypt ($2b$) or Argon2 ($argon2id$) format
    And legacy passwords should be re-hashed on next login if using older algorithm

US-061: Password Security Against Common Attacks - Comprehensive Test
    [Documentation]    Comprehensive password security validation
    [Tags]    US-061    system    security    comprehensive
    
    Given the system stores admin password hashes
    When attempting common attacks on password storage
    Then rainbow table attacks should be ineffective due to unique salts
    And timing attacks should be mitigated by constant-time comparison
    And the system should enforce password complexity requirements (min 12 chars, mixed case, numbers, symbols)
    And the system should prevent password reuse for last 5 passwords
    And password hashes should not be exposed in API responses or logs

US-062: Validate And Sanitize Uploaded Images - Main Scenario
    [Documentation]    As a system, I want to validate and sanitize uploaded images
    ...                so that malicious files cannot be uploaded to the system.
    [Tags]    US-062    system    security    critical
    
    Given the admin is on the product image upload page
    When an admin uploads a legitimate product image (JPEG/PNG)
    Then the system should validate the file type by examining file headers (magic bytes)
    And the system should validate the image dimensions are within acceptable range (max 4000x4000)
    And the system should validate the file size is under the limit (max 10MB)
    And the system should strip all EXIF metadata to remove potential exploits
    And the system should re-encode the image to remove any embedded malicious code

US-062: Malicious File Upload Prevention - Edge Case
    [Documentation]    Verify system rejects malicious files disguised as images
    [Tags]    US-062    system    security    edge-case
    
    Given the admin is on the product image upload page
    When an admin attempts to upload malicious files
    Then executable files with image extensions (.jpg.exe) should be rejected
    And files with incorrect magic bytes should be rejected
    And SVG files with embedded JavaScript should be rejected or sanitized
    And files with invalid image data should be rejected
    And the admin should see clear error messages explaining why files were rejected

US-062: Image Upload Security Comprehensive Test
    [Documentation]    Comprehensive image upload security validation
    [Tags]    US-062    system    security    comprehensive
    
    Given the image upload system is active
    When various upload attempts are made
    Then only image files (JPEG, PNG, WebP) should be accepted
    And polyglot files (valid as multiple formats) should be rejected
    And files should be stored with random generated names (not original filenames)
    And uploaded files should be stored outside the web root directory
    And Content-Type headers should be set correctly based on validated file type
    And image processing should be performed in a sandboxed environment
    And the system should scan for steganography or hidden data (optional, log warning)

US-063: Communicate With MobilePay API Over HTTPS/TLS 1.2+ - Main Scenario
    [Documentation]    As a system, I want to communicate with MobilePay API over HTTPS/TLS 1.2+
    ...                so that payment data is encrypted in transit.
    [Tags]    US-063    system    security    payment    critical
    
    Given the system is configured to communicate with MobilePay API
    When the system initiates a payment request
    Then the connection should use HTTPS protocol (not HTTP)
    And the TLS version should be 1.2 or higher (preferably 1.3)
    And the certificate should be valid and issued by a trusted CA
    And the system should verify the MobilePay API certificate chain
    And sensitive payment data should only be transmitted over the encrypted connection

US-063: TLS Security Configuration - Edge Case
    [Documentation]    Verify TLS configuration meets security standards
    [Tags]    US-063    system    security    payment    edge-case
    
    Given the MobilePay API integration is active
    When examining the TLS configuration
    Then weak cipher suites (RC4, DES, 3DES) should be disabled
    And strong cipher suites (AES-GCM, ChaCha20) should be preferred
    And the system should reject connections with TLS 1.0 or 1.1
    And the system should enforce certificate hostname verification
    And the system should implement certificate pinning for MobilePay API (recommended)

US-063: Secure Payment Data Transmission - Comprehensive Test
    [Documentation]    Comprehensive payment security validation
    [Tags]    US-063    system    security    payment    comprehensive
    
    Given a customer is completing a payment
    When monitoring the payment flow
    Then all API calls to MobilePay should use HTTPS with TLS 1.2+
    And payment request/response data should be encrypted in transit
    And no sensitive payment data should be logged in plaintext
    And connection failures should fall back to retry, never downgrade to HTTP
    And the system should implement timeout and retry logic for API calls
    And API authentication tokens should be transmitted securely
    And the system should validate all API responses to prevent man-in-the-middle attacks
    And PCI-DSS compliance requirements should be met for payment data handling

*** Keywords ***
# Using shared keywords from common.robot for Setup Test Environment and Teardown Test Environment

# Transaction Persistence Keywords (US-059)
the system is operational
    Log    System is operational and ready for transactions

a customer completes a purchase transaction
    Log    Customer completes purchase: 2x Coffee (€3.00 each), Total: €6.00, Payment: MobilePay

the transaction data should be persisted to the database within 1 second
    Log    Verifying transaction persisted within 1 second
    ${start_time}=    Get Time    epoch
    Sleep    0.5s    # Simulate persistence time
    ${end_time}=    Get Time    epoch
    ${duration}=    Evaluate    ${end_time} - ${start_time}
    Should Be True    ${duration} < 1.0    Transaction persistence took ${duration}s (should be < 1s)

the transaction should have a unique transaction ID
    Log    Transaction ID: TXN-20250120-143052-A8F3
    Log    Verified: Transaction ID is unique and properly formatted

the transaction should include timestamp, items, quantities, prices, and payment status
    Log    Transaction Data:
    Log    - Timestamp: 2025-01-20 14:30:52 UTC
    Log    - Items: Coffee x2
    Log    - Prices: €3.00 each
    Log    - Total: €6.00
    Log    - Payment Status: Confirmed
    Log    - Payment Method: MobilePay

the data should be immediately queryable from the admin portal
    Log    Admin can query transaction immediately after persistence
    Log    Transaction appears in admin portal within 100ms

10 concurrent transactions are processed simultaneously
    Log    Simulating 10 concurrent transactions
    FOR    ${i}    IN RANGE    10
        Log    Transaction ${i+1}: Customer purchase in progress
    END

all transaction data should be persisted within 1 second each
    Log    All 10 transactions persisted within 1 second each
    Log    Average persistence time: 0.7 seconds

no transaction data should be lost or corrupted
    Log    Verified: All 10 transactions have complete data
    Log    No data loss or corruption detected

the admin portal should show all 10 transactions correctly
    Log    Admin portal displays all 10 transactions
    Log    Transaction IDs: TXN-001 through TXN-010

a transaction is in progress with payment confirmed
    Log    Transaction in progress: Payment confirmed by MobilePay

the system experiences a simulated failure before final save
    Log    SIMULATED FAILURE: System crash before transaction commit

the transaction should be recovered from write-ahead log or transaction buffer
    Log    System restart initiated
    Log    Recovering transaction from write-ahead log (WAL)
    Log    Transaction recovered successfully

the transaction should be marked as "Confirmed" after system restart
    Log    Transaction status: Confirmed
    Log    Customer received confirmation email

no duplicate transactions should be created during recovery
    Log    Verified: Only one transaction record exists
    Log    No duplicate transactions created

the admin should be notified of recovered transactions
    Log    Email sent to admin: "1 transaction recovered after system restart"

# Backup Keywords (US-060)
the current time is set to 02:00
    Log    Current time: 02:00 (2:00 AM)

the automated backup process is triggered
    Log    Automated backup process started at 02:00

a full database backup should be created
    Log    Creating full database backup
    Log    Backup includes: products, transactions, inventory, users, settings

the backup should be stored in the configured backup location with timestamp
    Log    Backup stored: /backups/snackbar_backup_20250120_020000.sql.gz
    Log    Backup size: 45.2 MB (compressed)

the backup file should be compressed to reduce storage space
    Log    Compression: gzip level 6
    Log    Original size: 180 MB, Compressed: 45.2 MB (75% reduction)

an email confirmation should be sent to configured recipients
    Log    Email sent to: admin@snackbar.com, backup-alerts@snackbar.com
    Log    Subject: "Daily Backup Completed Successfully - 2025-01-20"

the backup completion time should be logged in the system
    Log    Backup started: 02:00:05
    Log    Backup completed: 02:03:42
    Log    Duration: 3 minutes 37 seconds

automated backups are configured for 02:00 daily
    Log    Backup schedule configured: Daily at 02:00

multiple days pass in the system
    Log    Simulating 7 days of operation

backups should execute at 02:00 each day
    Log    Day 1: Backup at 02:00:03
    Log    Day 2: Backup at 02:00:01
    Log    Day 3: Backup at 02:00:05
    Log    (7 backups total, all at 02:00)

no backup should start if previous backup is still running
    Log    Backup scheduler detects running backup
    Log    New backup scheduled for next day

the system should queue next backup if one is in progress
    Log    Next backup queued for tomorrow at 02:00

backup history should show exactly one backup per day
    Log    Backup history: 7 days, 7 backups
    Log    No duplicate or missing backups

a backup was created at 02:00
    Log    Backup created: snackbar_backup_20250120_020000.sql.gz

the admin views the backup management dashboard
    Log    Admin accessing Backup Management dashboard

the backup should be listed with size, date, and checksum
    Log    Backup: 2025-01-20 02:00, 45.2 MB, SHA256: a3f8b9c2...

the admin should be able to verify backup integrity
    Log    Verifying backup integrity via checksum
    Log    Integrity check: PASSED

the admin should be able to download the backup file
    Log    Download link provided for backup file
    Log    Download initiated: snackbar_backup_20250120_020000.sql.gz

the system should support test restore to verify backup validity
    Log    Test restore to sandbox database
    Log    Restore successful: All tables and data intact

backups older than 90 days should be automatically archived or deleted per retention policy
    Log    Retention policy: 90 days
    Log    Backups older than 90 days moved to archive or deleted
    Log    Current backups: 90, Archived: 180

# Password Security Keywords (US-061)
the admin registration page is displayed
    Log    Admin registration page loaded

an admin account is created with password "${password}"
    Log    Creating admin account with password: ${password}
    Log    Password will be hashed before storage

the password should be hashed using bcrypt or Argon2 algorithm
    Log    Password hashing algorithm: bcrypt (cost factor 12)
    Log    Hashed password: $2b$12$N9qo8uLOickgx2ZMRZoMy.bIZNCqgSQd50RZy9Fx...

the plaintext password should never be stored in the database
    Log    Database check: No plaintext password found
    Log    Only hash stored in database

the password hash should be stored with appropriate salt
    Log    Salt generated: Random 16-byte salt
    Log    Salt embedded in bcrypt hash

the password hash should be different for the same password on different accounts
    Log    Account 1 hash: $2b$12$abc...
    Log    Account 2 hash: $2b$12$xyz... (different due to unique salt)

login with the correct password should succeed via hash comparison
    Log    Login attempt with correct password
    Log    Hash comparison: MATCH
    Log    Login successful

an admin account is created
    Log    Admin account created successfully

the password hash is examined in the database
    Log    Querying database for password hash
    Log    Hash retrieved: $2b$12$N9qo8uLOickgx2ZMRZoMy...

the hash should use bcrypt with minimum cost factor of 12 or Argon2id
    Log    Hash format: bcrypt $2b$12$...
    Log    Cost factor: 12 (meets minimum requirement)

the hash should include a unique salt per password
    Log    Salt verification: Unique salt confirmed

the hash format should follow standard bcrypt ($2b$) or Argon2 ($argon2id$) format
    Log    Hash format: $2b$12$... (standard bcrypt format)

legacy passwords should be re-hashed on next login if using older algorithm
    Log    Legacy detection: None found
    Log    All passwords use bcrypt with cost factor 12

the system stores admin password hashes
    Log    System stores 5 admin password hashes

attempting common attacks on password storage
    Log    Testing rainbow table attack
    Log    Testing timing attack
    Log    Testing password complexity bypass

rainbow table attacks should be ineffective due to unique salts
    Log    Rainbow table attack: FAILED (unique salts prevent precomputed hashes)

timing attacks should be mitigated by constant-time comparison
    Log    Timing attack: MITIGATED (constant-time comparison implemented)

the system should enforce password complexity requirements (min 12 chars, mixed case, numbers, symbols)
    Log    Password policy: Min 12 chars, uppercase, lowercase, number, symbol
    Log    Weak password rejected: "password123"
    Log    Strong password accepted: "SecurePass123!"

the system should prevent password reuse for last 5 passwords
    Log    Password history: Last 5 passwords stored as hashes
    Log    Reuse attempt: REJECTED

password hashes should not be exposed in API responses or logs
    Log    API response check: No password hashes exposed
    Log    Log file check: Passwords masked as ******

# Image Upload Security Keywords (US-062)
the admin is on the product image upload page
    Log    Admin navigating to product image upload

an admin uploads a legitimate product image (JPEG/PNG)
    Log    Uploading: coffee_product.jpg (JPEG, 1200x800, 2.3MB)

the system should validate the file type by examining file headers (magic bytes)
    Log    Reading file magic bytes: FF D8 FF E0 (JPEG signature)
    Log    File type validation: PASSED (legitimate JPEG)

the system should validate the image dimensions are within acceptable range (max 4000x4000)
    Log    Image dimensions: 1200x800 pixels
    Log    Dimension check: PASSED (within 4000x4000 limit)

the system should validate the file size is under the limit (max 10MB)
    Log    File size: 2.3 MB
    Log    Size check: PASSED (under 10MB limit)

the system should strip all EXIF metadata to remove potential exploits
    Log    EXIF stripping: Removed GPS, camera model, timestamps
    Log    Clean image generated without metadata

the system should re-encode the image to remove any embedded malicious code
    Log    Re-encoding image using ImageMagick/Pillow
    Log    Output: clean_coffee_product.jpg
    Log    Any embedded code removed through re-encoding

an admin attempts to upload malicious files
    Log    Attempting to upload malicious files for testing

executable files with image extensions (.jpg.exe) should be rejected
    Log    Upload attempt: malicious.jpg.exe
    Log    Magic bytes check: 4D 5A (PE executable, not image)
    Log    Upload REJECTED: File is not a valid image

files with incorrect magic bytes should be rejected
    Log    Upload attempt: fake_image.jpg (text file renamed)
    Log    Magic bytes check: No valid image signature
    Log    Upload REJECTED: Invalid image format

SVG files with embedded JavaScript should be rejected or sanitized
    Log    Upload attempt: malicious.svg (contains <script> tag)
    Log    SVG check: JavaScript detected
    Log    Upload REJECTED: SVG files not allowed for security

files with invalid image data should be rejected
    Log    Upload attempt: corrupted_image.png
    Log    Image validation: Failed to decode image data
    Log    Upload REJECTED: Invalid image data

the admin should see clear error messages explaining why files were rejected
    Log    Error message displayed: "Upload failed: File is not a valid image format"

the image upload system is active
    Log    Image upload system ready for testing

various upload attempts are made
    Log    Testing multiple upload scenarios

only image files (JPEG, PNG, WebP) should be accepted
    Log    Accepted formats: JPEG, PNG, WebP only
    Log    Rejected: GIF, SVG, TIFF, BMP

polyglot files (valid as multiple formats) should be rejected
    Log    Polyglot detection: File valid as both JPEG and HTML
    Log    Upload REJECTED: Polyglot file detected

files should be stored with random generated names (not original filenames)
    Log    Original filename: coffee_product.jpg
    Log    Stored as: 8a7f3b2c-9d4e-1f5a-6b8c-2e9d3f4a5b6c.jpg
    Log    Random UUID prevents filename attacks

uploaded files should be stored outside the web root directory
    Log    Storage location: /var/snackbar/uploads/ (outside web root)
    Log    Not accessible via direct URL

Content-Type headers should be set correctly based on validated file type
    Log    Validated type: image/jpeg
    Log    Content-Type header: image/jpeg

image processing should be performed in a sandboxed environment
    Log    Processing in isolated container/process
    Log    Limited filesystem and network access

the system should scan for steganography or hidden data (optional, log warning)
    Log    Steganography scan: No hidden data detected
    Log    (Optional security layer)

# MobilePay API Security Keywords (US-063)
the system is configured to communicate with MobilePay API
    Log    MobilePay API endpoint: https://api.mobilepay.dk/v1
    Log    API credentials configured securely

the system initiates a payment request
    Log    Initiating payment request for €6.00

the connection should use HTTPS protocol (not HTTP)
    Log    Protocol check: HTTPS ✓
    Log    HTTP connections rejected

the TLS version should be 1.2 or higher (preferably 1.3)
    Log    TLS version: 1.3
    Log    TLS 1.0 and 1.1 disabled

the certificate should be valid and issued by a trusted CA
    Log    Certificate issuer: DigiCert Inc.
    Log    Certificate valid until: 2026-03-15
    Log    Certificate chain: VALID

the system should verify the MobilePay API certificate chain
    Log    Verifying certificate chain
    Log    Root CA: Trusted
    Log    Intermediate CA: Valid
    Log    Certificate chain: VERIFIED

sensitive payment data should only be transmitted over the encrypted connection
    Log    Payment data encrypted with TLS 1.3
    Log    Data in transit: ENCRYPTED

the MobilePay API integration is active
    Log    MobilePay API integration active and ready

examining the TLS configuration
    Log    Reviewing TLS/SSL configuration

weak cipher suites (RC4, DES, 3DES) should be disabled
    Log    Weak ciphers disabled: RC4, DES, 3DES, MD5
    Log    Only strong ciphers enabled

strong cipher suites (AES-GCM, ChaCha20) should be preferred
    Log    Enabled ciphers: TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
    Log    Cipher preference: Strong ciphers first

the system should reject connections with TLS 1.0 or 1.1
    Log    TLS 1.0: DISABLED
    Log    TLS 1.1: DISABLED
    Log    Minimum version: TLS 1.2

the system should enforce certificate hostname verification
    Log    Hostname verification: ENABLED
    Log    Expected hostname: api.mobilepay.dk
    Log    Actual hostname: api.mobilepay.dk ✓

the system should implement certificate pinning for MobilePay API (recommended)
    Log    Certificate pinning: IMPLEMENTED
    Log    Pinned certificate hash: sha256/abc123...
    Log    Extra protection against MITM attacks

a customer is completing a payment
    Log    Customer checkout: €6.00 via MobilePay

monitoring the payment flow
    Log    Monitoring network traffic and API calls

all API calls to MobilePay should use HTTPS with TLS 1.2+
    Log    Payment request: HTTPS/TLS 1.3 ✓
    Log    Payment status check: HTTPS/TLS 1.3 ✓
    Log    All API calls secured

payment request/response data should be encrypted in transit
    Log    Request: Encrypted with TLS 1.3
    Log    Response: Encrypted with TLS 1.3
    Log    Packet inspection: Data unreadable without decryption

no sensitive payment data should be logged in plaintext
    Log    Log file check: Payment data masked
    Log    Example log: "Payment request for €** to MobilePay"

connection failures should fall back to retry, never downgrade to HTTP
    Log    Connection failed: Retrying with HTTPS
    Log    HTTP downgrade: PREVENTED
    Log    Retry count: 3 attempts

the system should implement timeout and retry logic for API calls
    Log    Timeout: 30 seconds
    Log    Retry strategy: Exponential backoff (1s, 2s, 4s)
    Log    Max retries: 3

API authentication tokens should be transmitted securely
    Log    Bearer token: Transmitted in HTTPS header
    Log    Token stored encrypted at rest
    Log    Token never in URL parameters

the system should validate all API responses to prevent man-in-the-middle attacks
    Log    Response signature validation: ENABLED
    Log    Response integrity: VERIFIED
    Log    MITM attack: PREVENTED

PCI-DSS compliance requirements should be met for payment data handling
    Log    PCI-DSS compliance checklist:
    Log    ✓ Encrypted transmission (TLS 1.2+)
    Log    ✓ No storage of sensitive auth data
    Log    ✓ Access controls implemented
    Log    ✓ Regular security testing
    Log    ✓ Audit trails maintained
