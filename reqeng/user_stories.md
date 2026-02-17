# User Stories - Self-Service Snack Bar Kiosk System

**Project:** snackbar  
**Version:** 1.0  
**Date:** 2025-11-12  
**Template:** As a \<user\>, I want \<goal\> so that \<benefit\>

---

## Customer (Student Member) User Stories

### Product Browsing & Discovery

**US-001:** As a customer, I want to view all products in a grid layout with images, names, and prices so that I can easily see what's available for purchase.

**US-002:** As a customer, I want to filter products by category (Drinks, Snacks, Hot Drinks, Cold Drinks) so that I can quickly find the type of item I'm looking for.

**US-003:** As a customer, I want to see allergen information for products so that I can make safe purchasing decisions based on my dietary restrictions.

**US-004:** As a customer, I want to see clear visual indicators when products are out of stock so that I know what's currently available in the cabinet.

**US-005:** As a customer, I want to confirm that I can see an out-of-stock item in the cabinet before purchasing so that I can still buy it if it's physically available despite the system showing zero stock.

### Shopping Cart Management

**US-006:** As a customer, I want to add multiple items to my shopping cart so that I can purchase several products in a single transaction.

**US-007:** As a customer, I want to see a running total of my cart in real-time so that I know exactly how much I'm spending.

**US-008:** As a customer, I want to adjust quantities of items in my cart using +/- buttons so that I can easily change my order before checkout.

**US-009:** As a customer, I want to remove individual items from my cart so that I can change my mind about specific products.

**US-010:** As a customer, I want my cart to automatically clear after 5 minutes of inactivity so that the kiosk is ready for the next person if I walk away.

### Payment & Checkout

**US-011:** As a customer, I want to see a QR code generated within 1 second after clicking checkout so that I can complete my purchase quickly.

**US-012:** As a customer, I want to tap an "I have paid" confirmation button after scanning the QR code with my own payment app so that my purchase is recorded immediately.

**US-013:** As a customer, I want to see a clear success message with a green checkmark when my payment is complete so that I know I can take my items.

**US-014:** As a customer, I want to see a clear error message with retry options when my payment fails so that I can try again or get help.

**US-015:** As a customer, I want to be informed if I was potentially charged but the system is uncertain so that I know whether to take my items and who to contact if there's an issue.

### System Status & Availability

**US-016:** As a customer, I want to see a "Closed" message outside operating hours so that I know when the snack bar will be available again.

**US-017:** As a customer, I want to be warned when inventory tracking is disabled so that I can verify items exist in the cabinet before paying.

**US-018:** As a customer, I want all text and buttons to be large enough and easy to tap on a touchscreen so that I can complete my purchase without difficulty.

---

## Administrator User Stories

### Authentication & Access

**US-019:** As an administrator, I want to log in securely with username and password so that only authorized personnel can manage the system.

**US-020:** As an administrator, I want my session to timeout after 30 minutes of inactivity so that the system remains secure if I forget to log out.

**US-021:** As a primary administrator, I want to create and manage multiple admin accounts so that I can delegate management responsibilities to other staff members.

**US-022:** As an administrator, I want all my actions logged in an audit trail so that there's accountability for system changes.

### Product Management

**US-023:** As an administrator, I want to add new products with name, price, image, category, and allergen information so that customers can purchase them from the kiosk.

**US-024:** As an administrator, I want to upload product images that are automatically processed and optimized so that they display quickly on the kiosk without manual image editing.

**US-025:** As an administrator, I want to edit existing product information so that I can update prices, descriptions, or categories as needed.

**US-026:** As an administrator, I want to set purchase limits per product so that I can prevent customers from buying excessive quantities of limited items.

**US-027:** As an administrator, I want to remove products from the system so that discontinued items no longer appear on the kiosk.

**US-028:** As an administrator, I want my product changes to reflect on the kiosk immediately (within 5 seconds) so that customers always see current information.

### Category Management

**US-029:** As an administrator, I want to create custom product categories so that I can organize products in a way that makes sense for our offerings.

**US-030:** As an administrator, I want to edit and delete categories so that I can maintain an organized product catalog.

**US-031:** As an administrator, I want to assign products to multiple categories so that customers can find items through different browsing paths.

### Inventory Management

**US-032:** As an administrator, I want to enable or disable inventory tracking system-wide so that I can choose whether to manage stock quantities or run in trust-based mode only.

**US-033:** As an administrator, I want to view current stock quantities for all products in a sortable table so that I can quickly see what needs restocking.

**US-034:** As an administrator, I want to manually update stock quantities when I restock the cabinet so that the system reflects the actual physical inventory.

**US-035:** As an administrator, I want to set low-stock notification thresholds per product so that I'm alerted before items run out completely.

**US-036:** As an administrator, I want to receive email notifications when products reach low stock so that I can restock before items become unavailable.

**US-037:** As an administrator, I want to see products with negative stock highlighted as discrepancies so that I can identify and investigate inventory issues.

**US-038:** As an administrator, I want to manually adjust inventory for discrepancies so that I can correct the system when physical counts don't match.

### Transaction Management & Reconciliation

**US-039:** As an administrator, I want to view a complete transaction history with filtering and search capabilities so that I can track all sales activity.

**US-040:** As an administrator, I want to see transactions marked as "Payment Uncertain" so that I can investigate and reconcile potential payment issues.

**US-041:** As an administrator, I want to manually mark uncertain payments as "Confirmed" or "Refunded" so that I can resolve edge cases where the payment status is unclear.

**US-042:** As an administrator, I want transaction history retained for at least 3 years so that I have long-term records for accounting and analysis.

### Statistics & Reporting

**US-043:** As an administrator, I want to view statistics showing most popular products so that I can make informed stocking decisions.

**US-044:** As an administrator, I want to view revenue by day, week, or month with visual charts so that I can understand sales trends over time.

**US-045:** As an administrator, I want to select custom date ranges for statistics so that I can analyze specific time periods.

**US-046:** As an administrator, I want to export transaction data to CSV format so that I can perform detailed analysis in spreadsheet software.

**US-047:** As an administrator, I want statistics to calculate within 2 seconds even with thousands of transactions so that reporting remains responsive.

### System Configuration

**US-048:** As an administrator, I want to configure operating hours so that the kiosk automatically displays as closed outside these times.

**US-049:** As an administrator, I want to enable maintenance mode so that I can take the kiosk offline for updates without confusing customers.

**US-050:** As an administrator, I want to configure notification email addresses so that alerts go to the right people.

**US-051:** As an administrator, I want to receive email notifications for system errors, payment failures, and API downtime so that I can respond to critical issues quickly.

**US-052:** As an administrator, I want to view real-time kiosk status (online/offline/maintenance) so that I know if the system is functioning properly.

### Monitoring & Troubleshooting

**US-053:** As an administrator, I want to view error logs through the web portal so that I can troubleshoot issues without needing server access.

**US-054:** As an administrator, I want to be notified when database storage reaches 80% capacity so that I can take action before running out of space.

**US-055:** As an administrator, I want to receive confirmation that automated daily backups completed successfully so that I know my data is protected.

**US-056:** As an administrator, I want to test email notifications on demand so that I can verify the notification system is working correctly.

---

## System/Technical User Stories

### Performance & Reliability

**US-057:** As a system, I want to generate QR codes within 1 second so that customers experience minimal wait time during checkout.

**US-058:** As a system, I want to update the kiosk display within 300ms when filters are changed so that the interface feels responsive and immediate.

**US-059:** As a system, I want to persist transaction data within 1 second so that no sales are lost due to system failures.

**US-060:** As a system, I want to perform automated daily backups at 02:00 so that data is protected without impacting operating hours.

### Security & Data Protection

**US-061:** As a system, I want to hash admin passwords using bcrypt or Argon2 so that credentials are protected even if the database is compromised.

**US-062:** As a system, I want to validate and sanitize uploaded images so that malicious files cannot be uploaded to the system.

**US-063:** As a system, I want to expose the manual payment confirmation API over HTTPS/TLS 1.2+ so that confirmation data is encrypted in transit.

**US-064:** As a system, I want to strip EXIF metadata from uploaded images so that sensitive location and device data is not stored.

### Integration & Communication

**US-065:** As a system, I want to retry failed confirmation persistence attempts up to 3 times with exponential backoff so that temporary network issues don't cause payment records to be lost.

**US-066:** As a system, I want to handle confirmation service unavailability gracefully so that customers receive clear guidance rather than system crashes.

**US-067:** As a system, I want to retry failed email notifications up to 3 times so that important alerts reach administrators despite temporary email service issues.

**US-068:** As a system, I want to log all payment transactions with detailed status information so that payment issues can be debugged and reconciled.

---

## User Story Mapping by Priority

### High Priority (Must Have for v1.0)

**Customer Flow:**
- US-001, US-002, US-006, US-007, US-008, US-009, US-010, US-011, US-012, US-013, US-014, US-016, US-018

**Admin Core Features:**
- US-019, US-020, US-023, US-024, US-025, US-027, US-028, US-032, US-033, US-034, US-036, US-039, US-046, US-048, US-049, US-050, US-051

**System Requirements:**
- US-057, US-058, US-059, US-060, US-061, US-062, US-063, US-065, US-066, US-067, US-068

### Medium Priority (Should Have)

**Customer Enhancement:**
- US-003, US-004, US-005, US-015, US-017

**Admin Enhancement:**
- US-021, US-022, US-026, US-029, US-030, US-031, US-035, US-037, US-038, US-040, US-041, US-042, US-043, US-044, US-045, US-047, US-052, US-053, US-054, US-055

**System Enhancement:**
- US-064

### Low Priority (Nice to Have for v1.1+)

**Admin Advanced Features:**
- US-056

---

## Traceability Matrix

| User Story | Related SRS Requirements |
|------------|-------------------------|
| US-001 | FR-1.1, FR-1.2 |
| US-002 | FR-1.3 |
| US-003 | FR-1.4 |
| US-004 | FR-1.6 |
| US-005 | FR-1.6 |
| US-006 | FR-2.1 |
| US-007 | FR-2.2 |
| US-008 | FR-2.2 |
| US-009 | FR-2.2 |
| US-010 | FR-2.5 |
| US-011 | FR-3.1 |
| US-012 | FR-3.2 |
| US-013 | FR-3.4 |
| US-014 | FR-3.5 |
| US-015 | FR-3.5.2 |
| US-016 | FR-4.1 |
| US-017 | FR-1.5 |
| US-018 | FR-4.3, NFR-13 |
| US-019 | FR-5.1 |
| US-020 | FR-5.4 |
| US-021 | FR-5.3 |
| US-022 | FR-5.3.3 |
| US-023 | FR-6.1 |
| US-024 | FR-6.4, FR-6.5 |
| US-025 | FR-6.2 |
| US-026 | FR-6.1 |
| US-027 | FR-6.3 |
| US-028 | FR-6.2.1 |
| US-029 | FR-7.1 |
| US-030 | FR-7.2 |
| US-031 | FR-7.3 |
| US-032 | FR-8.1 |
| US-033 | FR-8.2 |
| US-034 | FR-8.2 |
| US-035 | FR-8.2 |
| US-036 | FR-8.4 |
| US-037 | FR-8.2.1 |
| US-038 | FR-8.2.3 |
| US-039 | FR-9.1, FR-9.4 |
| US-040 | FR-8.2.4 |
| US-041 | FR-8.2.4 |
| US-042 | FR-9.3 |
| US-043 | FR-10.1 |
| US-044 | FR-10.1 |
| US-045 | FR-10.1.1 |
| US-046 | FR-10.2 |
| US-047 | FR-10.1.3 |
| US-048 | FR-11.1 |
| US-049 | FR-11.1 |
| US-050 | FR-11.1 |
| US-051 | FR-11.2 |
| US-052 | FR-11.3 |
| US-053 | NFR-17 |
| US-054 | FR-9.3 |
| US-055 | NFR-7 |
| US-056 | FR-11.2.1 |
| US-057 | FR-3.1, NFR-1.4 |
| US-058 | NFR-1.1 |
| US-059 | NFR-6 |
| US-060 | NFR-7 |
| US-061 | NFR-8 |
| US-062 | FR-6.4.1, NFR-8.2 |
| US-063 | NFR-9 |
| US-064 | FR-6.4.2 |
| US-065 | FR-3.5.1 |
| US-066 | FR-3.6 |
| US-067 | FR-11.2.1 |
| US-068 | FR-9.1 |

---

## Acceptance Criteria Summary

Each user story should be considered complete when:

1. **Functional criteria** from the related SRS requirements are met
2. **Performance criteria** (response times, load times) are verified
3. **Security criteria** (authentication, encryption, validation) pass testing
4. **Usability criteria** meet the 90% first-time user success rate within 60 seconds
5. **Code quality** standards are met (unit tests, code coverage >80%)

---

**Document Status:** APPROVED  
**Source:** Software_Requirements_Specification_v1.1.md  
**Generated:** 2025-11-12  
**Generated by:** Lyyrai
