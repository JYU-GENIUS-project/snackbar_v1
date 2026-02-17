# Software Requirements Specification (SRS)

## Self-Service Snack Bar Kiosk System

**Project:** snackbar  
**Version:** 1.2  
**Date:** 2025-11-12  
**Prepared for:** Student Lounge Snack Bar Initiative

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-06 | Requirements Engineering Team | Initial requirements specification |
| 1.1 | 2025-11-10 | Requirements Engineering Team | Clarified ambiguous terms, resolved contradictions, added missing requirements, specified EUR as currency |
| 1.2 | 2025-11-12 | Requirements Engineering Team | Added PERN stack technology specifications, PostgreSQL data types, deployment requirements |

### Major Changes in v1.2

- Specified PERN stack (PostgreSQL, Express.js, React, Node.js) as core technology
- Added detailed technology stack specification with exact versions (Section 16)
- Specified PostgreSQL-specific data types (UUID, DECIMAL, TIMESTAMP WITH TIME ZONE, JSONB, ENUM)
- Added database indexing and foreign key constraint specifications
- Defined Node.js/Express.js production deployment requirements
- Specified PostgreSQL connection pooling with node-postgres (pg)
- Added development tools and optional TypeScript support

### Major Changes in v1.1

- Specified concrete performance metrics (replaced "as quickly as possible")
- Defined data retention policy (replaced "indefinitely")
- Clarified out-of-stock inventory handling with negative stock support
- Specified admin user model (multiple accounts with same permissions)
- Added payment reconciliation process for edge cases
- Defined specific image processing requirements
- Added validation ranges for prices and purchase limits
- Clarified maintenance mode precedence over operating hours
- Added missing requirements for API unavailability and security
- Specified EUR as the only currency

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements for a self-service kiosk system that enables student members to purchase snacks and drinks from a cabinet in the student lounge.

### 1.2 Scope

The system consists of two main components:

1. **Kiosk Interface** - A tablet/touchscreen application for customers to browse and purchase products
2. **Admin Web Portal** - A remote management system for inventory control, statistics, and system configuration

### 1.3 Definitions, Acronyms, and Abbreviations

- **Kiosk** - The customer-facing touchscreen interface
- **Admin Portal** - Web-based administrative interface
- **SKU** - Stock Keeping Unit (individual product)
- **Manual Payment Confirmation** - Customer acknowledgement step presented by the kiosk after payment
- **CSV** - Comma-Separated Values file format
- **JSON** - JavaScript Object Notation file format
- **WebP** - Modern image format for web (with JPEG fallback)
- **WCAG** - Web Content Accessibility Guidelines
- **SMTP** - Simple Mail Transfer Protocol

---

## 2. Overall Description

### 2.1 Product Perspective

The system operates as a trust-based, self-service solution where customers select products from a physical cabinet and complete payment through a kiosk interface. The system requires constant internet connectivity and operates during configured hours (default: 08:00-19:00).

### 2.2 User Classes and Characteristics

#### 2.2.1 Customer (Student Member)

- **Technical Expertise:** Minimal
- **Frequency of Use:** Occasional (daily to weekly)
- **Key Activities:** Browse products, add to cart, complete payment
- **Authentication:** None required
- **Success Criteria:** 90% of first-time users complete purchase within 60 seconds without assistance

#### 2.2.2 Administrator

- **Technical Expertise:** Moderate
- **Frequency of Use:** Regular (for restocking and monitoring)
- **Key Activities:** Manage inventory, configure system, view statistics, generate reports
- **Authentication:** Username/password (Google OAuth optional)

### 2.3 Operating Environment

- **Kiosk Device:** Tablet or touchscreen device with minimum 10" display
- **Connectivity:** Requires internet connection (minimum 5 Mbps recommended)
- **Operating Hours:** Configurable (default 08:00-19:00)
- **Number of Concurrent Users:** 1 (single kiosk)
- **Expected Transaction Volume:** 50-100 transactions per day

### 2.4 Design and Implementation Constraints

- Trust-based system (no physical locking mechanisms)
- Manual customer payment confirmation flow after QR scan
- Web-based or application-based (customer-agnostic)
- Must support both desktop and tablet interfaces for admin portal
- Must capture and store payment confirmations with auditable metadata
- **Technology Stack (PERN):**
  - **Backend:** Node.js 24.11 LTS with Express.js 5.1
  - **Frontend:** React 19.2 with modern hooks and functional components
  - **Database:** PostgreSQL 18
  - **Architecture:** RESTful API with component-based frontend

---

## 3. Functional Requirements

### 3.1 Kiosk Interface (Customer-Facing)

#### 3.1.1 Product Display

**FR-1.1:** The system SHALL display products in a grid layout with images.

**FR-1.2:** Each product display SHALL include:

- Product name (minimum 16px font size)
- Price clearly displayed (minimum 18px font size, bold)
- Product image (800x600px or default placeholder)
- Category indicator
- Availability status (Available, Out of Stock)

**FR-1.3:** The system SHALL provide category filtering functionality with the following categories:

- All Products (default)
- Drinks
- Snacks
- Hot Drinks
- Cold Drinks
- Custom categories (created by admin)

**FR-1.4:** The system SHALL display allergen information for each product when available.

**FR-1.5:** When inventory tracking is disabled, the system SHALL display a warning message at checkout:
> "⚠️ Inventory tracking is disabled. Please verify that items exist in the cabinet before completing payment."

**FR-1.6:** When inventory tracking is enabled and a product is out of stock, the system SHALL:

- Display the product as "Out of Stock" with visual indicator (red badge)
- Allow product to remain visible but visually distinguished (greyed out)
- Allow purchase after customer confirms they can see the item in the cabinet
- Display confirmation prompt: "This item shows as out of stock. Can you see it in the cabinet? [Yes, I see it] [No, go back]"

#### 3.1.2 Shopping Cart

**FR-2.1:** The system SHALL provide a shopping cart where customers can add multiple items.

**FR-2.2:** The shopping cart SHALL display:

- Individual items with product names and thumbnail images
- Quantity for each item (editable via +/- buttons)
- Price per item
- Subtotal per item (quantity × price)
- Running total price for entire cart (updated in real-time)
- "Remove" button for each item
- "Clear Cart" button to remove all items

**FR-2.3:** The system SHALL enforce item-specific purchase limits configured by admin.

**FR-2.4:** When a customer attempts to exceed purchase limits, the system SHALL:

- Prevent adding additional items beyond the limit
- Display message: "Maximum [X] of this item per purchase"
- Disable the "+" button when limit reached

**FR-2.5:** The system SHALL automatically clear the shopping cart after 5 minutes of inactivity.

**FR-2.5.1:** Inactivity timeout is fixed at 5 minutes in v1.0 (configurable in future versions).

**FR-2.5.2:** The timeout counter SHALL reset with each user interaction (touch, scroll, button press, cart edit).

**FR-2.5.3:** The system MAY display a countdown or warning 30 seconds before cart clears (optional).

#### 3.1.3 Payment Process

**FR-3.1:** Upon checkout confirmation, the system SHALL generate a unique QR code for the transaction within 1 second.

**FR-3.2:** The system SHALL display clear payment instructions and provide an "I have paid" confirmation control that customers must activate after completing payment with their preferred method.

**FR-3.3:** The system SHALL persist each manual confirmation event with timestamp, kiosk session identifier, cart total, and declared payment method for audit purposes.

**FR-3.4:** Upon manual confirmation, the system SHALL:

- Display on-screen confirmation message for minimum 3 seconds: "✅ Payment Complete! You can now take your items."
- Show purchased items and total amount
- Deduct purchased items from inventory (if tracking enabled), including allowing negative stock
- Clear the shopping cart
- Log the transaction with status "COMPLETED"

**FR-3.4.1:** Inventory deduction SHALL occur even if stock quantity is zero.

**FR-3.4.2:** Stock quantities MAY go negative to indicate discrepancies between system and physical inventory.

**FR-3.4.3:** The system SHALL display success message using green color (meeting WCAG AA contrast ratio 4.5:1).

**FR-3.5:** Upon payment failure or timeout, the system SHALL:

- Display failure message to customer for minimum 5 seconds: "❌ Payment Failed. Please try again or contact support at [admin email]."
- NOT deduct items from inventory
- Maintain cart contents
- Log transaction with status "FAILED"
- Allow customer to retry or cancel

**FR-3.5.1:** If the customer does not confirm payment within 60 seconds of QR display, show: "⏱️ Waiting for confirmation. Please confirm payment or ask for assistance."

**FR-3.5.2:** For edge case where a customer reports payment but the kiosk confirmation did not complete:

- Display message: "⚠️ Payment processor error. If you were charged, you may take your items. Contact [admin email] if charged incorrectly."
- Log transaction as "PAYMENT_UNCERTAIN"
- Do NOT deduct inventory automatically
- Admin can reconcile these transactions manually (see FR-8.2.4)

**FR-3.6:** Manual confirmation unavailability handling:

- If confirmation cannot be recorded (e.g., server offline) for more than 30 seconds, display: "🚫 Payment confirmation unavailable. Please contact [admin email] to record your purchase."
- Log confirmation persistence failures with timestamp and kiosk session metadata
- Admin receives email notification if confirmations fail for more than 15 minutes
- Kiosk remains accessible for browsing (checkout button disabled)

#### 3.1.4 System Status Display

**FR-4.1:** During non-operating hours, the kiosk SHALL display a "Closed" message: "🔒 Closed - Open [start time] to [end time]"

**FR-4.2:** When in maintenance mode, the kiosk SHALL display a "Maintenance" message: "🔧 System Under Maintenance - Check back soon"

**FR-4.2.1:** Maintenance mode takes precedence over operating hours (can be enabled during operating hours).

**FR-4.3:** The kiosk interface SHALL be optimized for accessibility:

- Minimum 16px font size for body text
- Minimum 24px font size for headings
- Minimum 44x44px touch targets for all interactive elements
- WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- No additional scaling options required

---

### 3.2 Admin Web Portal

#### 3.2.1 Authentication & Access Control

**FR-5.1:** The system SHALL require authentication via username and password.

**FR-5.2:** The system MAY support Google OAuth authentication as an alternative login method.

**FR-5.3:** The system SHALL support multiple administrator accounts:

- Each admin has unique username (email) and password
- All admins have identical permissions (no role hierarchy)
- Primary admin can create and delete other admin accounts
- Maximum 10 admin accounts supported

**FR-5.3.1:** Any admin can change their own password and email address.

**FR-5.3.2:** Primary admin can reset passwords for other admin accounts.

**FR-5.3.3:** Action logs SHALL record which admin made specific changes (audit trail).

**FR-5.4:** Admin sessions SHALL timeout after 30 minutes of inactivity.

**FR-5.4.1:** System SHALL display warning 2 minutes before timeout.

**FR-5.4.2:** System SHALL require re-authentication after timeout.

**FR-5.4.3:** System MAY offer "Remember this device for 30 days" option to reduce login frequency (optional).

#### 3.2.2 Product Management

**FR-6.1:** Admins SHALL be able to add new products with the following attributes:

- **Product name** (required, 1-100 characters)
- **Price** (required, range: 0.01 to 999.99 EUR, 2 decimal places)
- **Product image** (optional, with default placeholder)
- **Category/categories** (required, can assign to multiple)
- **Allergen information** (optional, free text up to 500 characters)
- **Hot/Cold designation** (optional, boolean)
- **Purchase limit per transaction** (optional, range: 1-50 items, default: unlimited)

**FR-6.1.1:** Price validation:

- Must be between 0.01 and 999.99 EUR
- Must have exactly 2 decimal places
- Cannot be negative or zero
- Display error message if validation fails: "Price must be between 0.01€ and 999.99€"

**FR-6.1.2:** Purchase limit validation:

- If set, must be between 1 and 50
- Default value: null (unlimited)
- Display on product card as: "Maximum [X] per purchase"

**FR-6.2:** Admins SHALL be able to edit existing product information.

**FR-6.2.1:** Changes to products SHALL reflect on the kiosk interface immediately (within 5 seconds).

**FR-6.3:** Admins SHALL be able to remove/delete products from the system.

**FR-6.3.1:** Deleted products SHALL be soft-deleted (marked inactive) to preserve transaction history references.

**FR-6.3.2:** System SHALL confirm deletion with prompt: "Are you sure you want to delete [product name]? This will hide it from customers."

**FR-6.4:** Admins SHALL be able to upload product images through the web portal.

**FR-6.4.1:** Image upload requirements:

- Accepted formats: JPEG (.jpg, .jpeg), PNG (.png), WebP (.webp), GIF (.gif, non-animated only)
- Maximum file size: 10MB per upload
- File extension validation against whitelist
- File content validation (magic number check to verify format matches extension)
- Reject executable files, SVG, or unsupported formats
- Display clear error message if rejected: "Invalid file type. Please upload JPEG, PNG, WebP, or GIF (max 10MB)"

**FR-6.4.2:** Image security:

- Strip EXIF metadata from uploaded images
- Maximum filename length: 255 characters
- Sanitize filenames (remove special characters except - and _)

**FR-6.5:** Product images SHALL be automatically processed upon upload:

- Resized to 800x600px (landscape aspect ratio, center-cropped if needed)
- Compressed to target size < 200KB
- Converted to WebP format for kiosk display (JPEG fallback generated for compatibility)
- Original image backed up for future re-processing
- Admin shown preview before confirming upload

**FR-6.6:** Products without uploaded images SHALL display a default placeholder image (generic snack/drink icon).

#### 3.2.3 Category Management

**FR-7.1:** Admins SHALL be able to create custom product categories.

**FR-7.1.1:** Category name requirements:

- 1-50 characters
- Must be unique
- Cannot contain special characters except spaces and hyphens

**FR-7.2:** Admins SHALL be able to edit and delete categories.

**FR-7.2.1:** System SHALL prevent deletion of categories that have products assigned.

**FR-7.2.2:** System SHALL display warning: "Cannot delete category with assigned products. Please reassign or delete products first."

**FR-7.3:** Products MAY belong to multiple categories simultaneously.

**FR-7.4:** The system SHALL include default categories pre-configured:

- Drinks
- Snacks
- Hot Drinks
- Cold Drinks

**FR-7.4.1:** Default categories MAY be renamed but not deleted.

**FR-7.5:** Category changes SHALL update product filtering on kiosk immediately (within 5 seconds).

#### 3.2.4 Inventory Management

**FR-8.1:** Admins SHALL be able to enable or disable inventory tracking system-wide via toggle switch.

**FR-8.1.1:** When inventory tracking is DISABLED:

- Stock quantity fields hidden in admin portal
- Low-stock threshold settings hidden
- No inventory deductions occur on purchases
- No low-stock notifications sent
- Admin portal displays "Inventory Tracking: OFF" banner
- Kiosk displays warning message at checkout (see FR-1.5)
- All products show as available on kiosk

**FR-8.1.2:** When inventory tracking is ENABLED:

- All inventory features become active
- Admin can view and edit stock quantities
- Automatic deductions occur on successful purchases
- Low-stock notifications active
- Out-of-stock products displayed with status

**FR-8.1.3:** When re-enabling inventory tracking, system SHALL preserve last known stock quantities.

**FR-8.2:** When inventory tracking is enabled, admins SHALL be able to:

- View current stock quantities for all products in a sortable table
- Manually update stock quantities (for restocking) with +/- buttons or direct input
- Set low-stock notification thresholds per product (range: 1-99, default: 5)
- Manually adjust inventory for discrepancies

**FR-8.2.1:** Admins can view products with negative stock in "Inventory Discrepancy Report".

**FR-8.2.2:** Negative stock displays as "Out of Stock (-3 discrepancy)" in admin portal with red highlight.

**FR-8.2.3:** Admin can reset negative stock to zero or positive value with "Adjust Stock" button.

**FR-8.2.4:** Admin manual reconciliation for uncertain payments:

- Admin can view "Uncertain Payments" report showing transactions with status "PAYMENT_UNCERTAIN"
- Admin can mark transactions as "CONFIRMED" (deduct inventory) or "REFUNDED" (no action)
- Admin can manually adjust inventory after verification with confirmation audit logs

**FR-8.3:** The system SHALL automatically deduct inventory quantities when purchases are completed (if tracking enabled).

**FR-8.3.1:** Deduction occurs immediately after the customer confirms payment and the kiosk records the confirmation event.

**FR-8.3.2:** Deduction formula: `new_stock = current_stock - quantity_purchased` (can result in negative values).

**FR-8.4:** When stock reaches the configured low-stock threshold, the system SHALL send an email notification to configured admin email address(es).

**FR-8.4.1:** Notification sent once when stock reaches or falls below threshold.

**FR-8.4.2:** No repeat notification until stock is replenished above threshold (prevents email spam).

**FR-8.4.3:** Email content includes:

- Product name
- Current stock quantity
- Configured threshold
- Timestamp
- Link to admin portal inventory page

**FR-8.5:** Low-stock thresholds:

- Default threshold: 5 units (applied to all new products)
- Admin can override per product (range: 1-99)
- Different categories MAY have different default thresholds (configurable)

#### 3.2.5 Transaction History & Reporting

**FR-9.1:** The system SHALL maintain a transaction log containing:

- Transaction ID (unique UUID)
- Date and time (ISO 8601 format)
- Items purchased (product names and IDs)
- Quantities
- Total amount
- Payment status (COMPLETED, FAILED, PENDING, PAYMENT_UNCERTAIN)
- Admin who reconciled (for uncertain payments)

**FR-9.2:** Transaction history SHALL NOT include individual customer identification (no names, phone numbers, or personal data).

**FR-9.3:** Data retention policy:

- The system SHALL retain transaction history for a minimum of 3 years from transaction date
- After 3 years, data MAY be archived to cold storage or deleted at admin discretion
- System SHALL alert admin when database size reaches 80% of storage capacity
- System SHALL provide archive/export function before deletion
- Archived data SHALL remain exportable in CSV format

**FR-9.4:** Admins SHALL be able to view transaction history through the web portal.

**FR-9.4.1:** Transaction history SHALL be paginated (50 transactions per page).

**FR-9.4.2:** Transaction history SHALL be sortable by date, amount, status.

**FR-9.4.3:** Transaction history SHALL be filterable by:

- Date range
- Payment status
- Product
- Amount range

#### 3.2.6 Statistics & Analytics

**FR-10.1:** The system SHALL display statistics showing:

- **Most popular products** ranked by quantity sold (top 10)
- **Revenue by time period** with the following views:
  - Daily view (bar chart showing revenue per day)
  - Weekly view (bar chart showing revenue per week)
  - Monthly view (bar chart showing revenue per month)
  - Custom date range selector (maximum 1 year range)
- **Total revenue** for selected period (sum of all completed transactions)
- **Number of transactions** (count of completed transactions)
- **Average transaction value** (total revenue / number of transactions)

**FR-10.1.1:** Date range selector SHALL:

- Provide preset options: "Today", "This Week", "This Month", "Last 30 Days", "Last 3 Months"
- Support custom date range with visual calendar picker
- Default to "Last 7 Days"
- Require maximum 3 clicks/taps to select any preset range
- Display selected range clearly (e.g., "Jan 1, 2025 - Jan 31, 2025")

**FR-10.1.2:** Statistics SHALL update automatically when new transactions are completed (within 30 seconds).

**FR-10.1.3:** Statistics queries SHALL return results within 2 seconds for up to 10,000 transactions.

**FR-10.2:** Admins SHALL be able to export statistics and transaction data in CSV format.

**FR-10.2.1:** CSV export SHALL include:

- Transaction ID
- Date and time (YYYY-MM-DD HH:MM:SS format)
- Items purchased (comma-separated list)
- Quantities
- Total amount
- Payment status

**FR-10.2.2:** Export SHALL respect selected date range filters.

**FR-10.2.3:** Export files SHALL have meaningful filenames: `transactions_YYYY-MM-DD_to_YYYY-MM-DD.csv`

**FR-10.3:** JSON export format is deferred to v1.1+ (not required for v1.0).

#### 3.2.7 System Configuration

**FR-11.1:** Admins SHALL be able to configure the following settings through the web portal:

- **Operating hours** (start time and end time, 24-hour format)
- **Email address(es) for notifications** (comma-separated list, up to 5 addresses)
- **Enable/disable inventory tracking** (toggle switch)
- **Maintenance mode** (on/off toggle with optional message)

**FR-11.1.1:** Shopping cart timeout duration is fixed at 5 minutes in v1.0 (will be configurable in future versions).

**FR-11.1.2:** Configuration changes SHALL take effect immediately (within 10 seconds).

**FR-11.1.3:** System SHALL validate email addresses using RFC 5322 standard.

**FR-11.2:** Admins SHALL receive email notifications for:

- Low stock alerts (when threshold reached)
- System errors (uncaught exceptions, API failures)
- Payment failures (FAILED or PAYMENT_UNCERTAIN transactions)
- Manual confirmation persistence failures lasting > 15 minutes
- Database storage reaching 80% capacity

**FR-11.2.1:** Email delivery requirements:

- Successfully deliver 95% of notifications within 5 minutes
- Retry failed sends up to 3 times (exponential backoff: 1 min, 5 min, 15 min)
- Log all notification attempts (success/failure) with timestamps
- Alert admin via alternate mechanism if email service is down for > 1 hour

**FR-11.3:** Admins SHALL be able to view kiosk system status indicator:

- Online (green indicator, last activity timestamp)
- Offline (red indicator, time since last activity)
- Maintenance Mode (yellow indicator)

**FR-11.3.1:** Status SHALL update in real-time using WebSocket connection or 10-second polling.

#### 3.2.8 Pricing Management

**FR-12.1:** Admins SHALL have full control over product pricing with the following constraints:

- Range: 0.01 to 999.99 EUR
- 2 decimal places required
- Price changes effective immediately on kiosk

**FR-12.2:** The system does NOT require support for:

- Discounts or promotional pricing
- Special pricing tiers (member vs non-member)
- Time-based pricing (happy hour, etc.)
- Multiple currencies (EUR only)

**FR-12.3:** The system does NOT require tax handling functionality (prices are final/inclusive).

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements

**NFR-1:** The kiosk interface SHALL meet the following performance targets:

**NFR-1.1:** Filter/category changes SHALL update product display within 300ms (90th percentile).

**NFR-1.2:** Cart operations (add/remove/edit items) SHALL reflect in UI within 200ms (90th percentile).

**NFR-1.3:** Product grid initial load SHALL complete within 2 seconds (95th percentile).

**NFR-1.4:** QR code generation SHALL complete within 1 second.

**NFR-1.5:** Page transitions SHALL complete within 500ms.

**NFR-2:** The system SHALL support one concurrent user (single kiosk deployment).

**NFR-3:** Product images SHALL be optimized for display:

- Resized to maximum 800x600px
- Compressed to < 200KB per image
- Served in WebP format (with JPEG fallback)
- Lazy-loaded as user scrolls
- Cached locally in browser for 24 hours

### 4.2 Reliability & Availability

**NFR-4:** The system SHALL be available during configured operating hours (default 08:00-19:00).

**NFR-4.1:** Target uptime during operating hours: 99% (allows ~2.5 hours downtime per month).

**NFR-5:** The system SHALL require constant internet connectivity and is NOT required to function offline.

**NFR-6:** Transaction data SHALL be persisted to database immediately (within 1 second) to prevent data loss.

**NFR-7:** The system SHALL implement automatic backups:

- Daily full backup at 02:00 (during non-operating hours)
- Retain last 30 daily backups
- Weekly backup retained for 12 weeks
- Backup storage separate from primary database
- Automated backup verification/integrity check
- Admin notified via email if backup fails

**NFR-7.1:** Backup storage requirement: Minimum 10GB (sufficient for ~50,000 transactions with images).

### 4.3 Security Requirements

**NFR-8:** Admin authentication SHALL use secure password storage (bcrypt or Argon2, minimum 12 rounds).

**NFR-8.1:** Password requirements:

- Minimum 8 characters
- Must contain at least one uppercase letter, one lowercase letter, one number
- No common passwords (check against top 10,000 common passwords list)

**NFR-8.2:** Image upload security SHALL include:

- File extension whitelist validation
- File content validation (magic number check)
- EXIF metadata stripping
- Filename sanitization
- Virus/malware scanning (optional, recommended for production)

**NFR-9:** Manual payment confirmation flows SHALL maintain end-to-end security:

- All kiosk-to-API communication over HTTPS/TLS 1.2+
- Confirmation audit records stored with tamper-evident metadata (timestamp, session, device)
- No third-party payment credentials stored in the system (only confirmation metadata and transaction status)

**NFR-10:** Admin sessions SHALL timeout after 30 minutes of inactivity (see FR-5.4).

**NFR-11:** The system does NOT require GDPR/data privacy compliance measures beyond standard security practices (no personal customer data collected).

**NFR-11.1:** Transaction logs are anonymous by design (no customer identification).

### 4.4 Usability Requirements

**NFR-12:** The kiosk interface SHALL be usable such that:

- 90% of first-time users can complete a purchase without assistance within 60 seconds
- Task success rate > 95% in usability testing (n=10 test users)
- No more than 2 screens needed to go from product selection to payment
- All primary actions visible without scrolling on home screen

**NFR-13:** The kiosk interface SHALL be optimized for touchscreen interaction:

- All interactive elements minimum 44x44px touch target (per Apple/Android HIG)
- 8px minimum spacing between adjacent touch targets
- Visual feedback on touch (ripple effect or color change)
- No hover-only interactions
- Scrolling uses momentum/kinetic scrolling

**NFR-14:** The admin portal SHALL be accessible from standard web browsers:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**NFR-14.1:** Admin portal SHALL be responsive (works on desktop 1024px+ and tablet 768px+).

**NFR-15:** Error and confirmation messages SHALL:

- Use minimum 18px font size (24px for headings)
- Display for minimum 3 seconds (dismissible after 2 seconds for confirmations)
- Use color coding:
  - Green (#28a745) for success
  - Red (#dc3545) for errors
  - Yellow (#ffc107) for warnings
- Meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- Use plain language (no technical jargon)
- Include actionable next steps

### 4.5 Maintainability Requirements

**NFR-16:** The system SHALL implement logging for troubleshooting purposes.

**NFR-16.1:** Logging levels:

- ERROR: System errors, API failures, payment failures
- WARN: Low stock, API slowness, configuration changes
- INFO: Successful transactions, admin logins, inventory updates
- DEBUG: Request/response details (disabled in production)

**NFR-16.2:** Logs SHALL include:

- Timestamp (ISO 8601 format)
- Log level
- Component/module name
- Message
- Request ID (for tracing)

**NFR-17:** The system SHALL provide error logs accessible to administrators through the web portal.

**NFR-17.1:** Logs SHALL be retained for 30 days.

**NFR-17.2:** Logs SHALL be searchable by date, level, component.

**NFR-18:** The codebase SHALL follow standard coding conventions:

- Consistent naming conventions (camelCase for variables, PascalCase for classes)
- Maximum function length: 50 lines
- Maximum file length: 500 lines
- Code comments for complex logic
- API documentation (OpenAPI/Swagger)

### 4.6 Scalability

**NFR-19:** The system is designed for a single kiosk deployment and does NOT require multi-kiosk scalability in v1.0.

**NFR-19.1:** Architecture SHOULD be designed to support future multi-kiosk expansion (separation of concerns, stateless API).

**NFR-20:** The system SHOULD be designed to potentially integrate card payment services in the future (modular payment adapter pattern).

---

## 5. External Interface Requirements

### 5.1 User Interfaces

#### 5.1.1 Kiosk Interface

The kiosk interface SHALL provide the following screens:

1. **Home/Product Grid Screen:**
   - Touchscreen-optimized grid layout (2-3 columns depending on screen size)
   - Product cards with images (800x600px), names (16px), prices (18px bold)
   - Category filter buttons/tabs at top
   - Shopping cart icon with item count badge
   - All products visible without horizontal scrolling

2. **Product Detail Screen (Optional):**
   - Large product image
   - Full description and allergen information
   - Price and availability status
   - Add to cart button (44x44px minimum)

3. **Shopping Cart Screen:**
   - List of cart items with thumbnails
   - Quantity controls (+/- buttons, 44x44px each)
   - Remove item buttons
   - Running total prominently displayed
   - "Continue Shopping" and "Checkout" buttons

4. **Checkout Screen:**
  - Order summary (items, quantities, total)
  - QR code display (minimum 200x200px)
  - Instructions: "Scan QR code with your payment app, then tap 'I have paid' on this screen"
  - Cancel button

5. **Payment Confirmation Screen:**
   - Success message with green checkmark icon
   - Order summary
   - "Start New Order" button

6. **Payment Failure Screen:**
   - Error message with red X icon
   - "Try Again" and "Cancel" buttons
   - Support contact information

7. **Closed/Maintenance Screen:**
   - Large status message
   - Operating hours (if closed)
   - Estimated return time (if maintenance, optional)

#### 5.1.2 Admin Web Portal

The admin portal SHALL provide the following pages:

1. **Login Page:**
   - Username and password fields
   - "Remember me" checkbox (optional)
   - Google OAuth button (optional)
   - Password reset link

2. **Dashboard:**
   - Key metrics (today's revenue, transactions, popular products)
   - Quick links to common tasks
   - System status indicator
   - Recent activity log

3. **Product Management Page:**
   - Searchable product table
   - Add/Edit/Delete product buttons
   - Bulk actions (optional)
   - Image upload interface
   - Form validation with inline error messages

4. **Category Management Page:**
   - List of categories with product counts
   - Add/Edit/Delete category buttons
   - Drag-and-drop reordering (optional)

5. **Inventory Management Page:**
   - Product list with stock quantities
   - Quick stock adjustment controls (+/- buttons)
   - Low-stock threshold settings
   - Inventory discrepancy report (negative stock)
   - Enable/disable tracking toggle

6. **Transaction History Page:**
   - Paginated transaction table (50 per page)
   - Date range filter
   - Status filter
   - Search by product or transaction ID
   - Export to CSV button

7. **Statistics & Reporting Page:**
   - Date range selector with presets
   - Revenue charts (daily/weekly/monthly)
   - Top products table
   - Key metrics cards
   - Export button

8. **System Configuration Page:**
   - Operating hours settings
   - Email notification settings
   - Maintenance mode toggle
   - Admin user management
   - Email test notification button

9. **Logs & Monitoring Page:**
   - Error log viewer
   - System health checks
   - API status indicators
   - Backup status

### 5.2 Hardware Interfaces

- **Touchscreen tablet or display device:** Minimum 10" display, resolution 1280x800px or higher
- **Network interface:** Wi-Fi or Ethernet for internet connectivity (minimum 5 Mbps recommended)
- **QR code display capability:** Color display supporting 200x200px minimum QR codes
- **NFC reader:** Optional, if NFC payments are supported

### 5.3 Software Interfaces

#### 5.3.1 PostgreSQL Database

- **Purpose:** Primary data storage for all application data
- **Connection Library:** node-postgres (pg) version 8.11.x
- **Connection Method:** Connection pooling with pg.Pool
- **Configuration:**
  - Connection parameters stored in environment variables:
    - `DB_HOST` - Database server hostname
    - `DB_PORT` - Database port (default: 5432)
    - `DB_NAME` - Database name
    - `DB_USER` - Database username
    - `DB_PASSWORD` - Database password
    - `DB_SSL` - SSL mode (require/prefer/disable)
  - Connection pool settings:
    - `POOL_MIN` - Minimum pool size (default: 2)
    - `POOL_MAX` - Maximum pool size (default: 10)
    - `POOL_IDLE_TIMEOUT` - Idle timeout in ms (default: 30000)
- **Features Used:**
  - Parameterized queries for SQL injection prevention
  - Transaction support for data consistency
  - JSONB for flexible data storage
  - Native UUID support
  - Timestamp with time zone for accurate datetime handling
- **Security:** SSL/TLS encrypted connections, credentials in environment variables

#### 5.3.2 Manual Payment Confirmation Service

- **Purpose:** Record customer attestation that payment has been completed and trigger transaction finalization.
- **Integration Method:** Internal RESTful API between kiosk client and Express backend.
- **Authentication:** Kiosk session token or device identifier supplied with each request.
- **Endpoints Used:**
  - POST /transactions/{id}/confirm - Persist confirmation metadata and move transaction to COMPLETED.
  - POST /transactions/{id}/report-uncertain - Flag transaction as PAYMENT_UNCERTAIN when customer cannot confirm.
- **Responsibilities:**
  - Capture confirmation timestamp, kiosk session, cart snapshot, and declared payment method.
  - Transition transaction status (COMPLETED, PAYMENT_UNCERTAIN) based on customer input and backend validation.
  - Emit audit log entries for manual confirmations and uncertainty reports.
- **Error Handling:**
  - HTTP 500/502/503: Display confirmation unavailable message and retry up to 3 times with exponential backoff.
  - Validation errors (HTTP 400): show user guidance to reattempt confirmation or contact admin.
  - Timeout after 30 seconds: Indicate that confirmation was not recorded and prompt retry or admin assistance.
- **Security:** HTTPS/TLS 1.2+, signed kiosk session tokens, confirmation data stored with integrity checks.

#### 5.3.3 Email Service

- **Purpose:** Admin notifications
- **Integration Method:** SMTP or API (e.g., SendGrid, AWS SES, Mailgun)
- **Requirements:**
  - SMTP server details (host, port, credentials) OR
  - Email service API key
- **Email Types:**
  - Low stock alerts
  - System errors
  - Payment failures
  - Manual confirmation persistence failures
  - Backup failures
  - Storage capacity warnings
- **Delivery Requirements:**
  - 95% delivery within 5 minutes
  - Retry logic (3 attempts with exponential backoff)
  - Logging of all send attempts

#### 5.3.4 Authentication Service (Optional)

- **Purpose:** Google OAuth integration
- **Requirements:** Google OAuth 2.0 API
- **Usage:** Alternative admin login method
- **Implementation:** OAuth 2.0 Authorization Code flow
- **Scope:** email, profile
- **Optional Feature:** Can be omitted in v1.0

### 5.4 Communication Interfaces

- **HTTPS:** All web communications use TLS 1.2+ encryption
- **RESTful API:** Communication between kiosk and backend server
  - JSON request/response format
  - Authentication via session tokens or JWT
  - CORS configured for kiosk origin
- **WebSocket (Optional):** Real-time updates for admin portal
  - Kiosk status updates
  - New transaction notifications
  - Inventory changes
  - Fallback to polling if WebSocket unavailable

---

## 6. System Features Priority

### 6.1 High Priority (Must Have for v1.0)

- Product display and browsing with category filtering
- Shopping cart functionality with 5-minute timeout
- Manual payment confirmation flow with QR code guidance
- Basic inventory management (with enable/disable option)
- Negative stock tracking for discrepancy management
- Admin authentication (username/password)
- Product management (add/edit/delete with images)
- Transaction logging and history
- Basic statistics (revenue by period, popular products)
- CSV export functionality
- Low stock email notifications
- Manual inventory adjustment
- Payment reconciliation for uncertain payments
- Operating hours and maintenance mode

### 6.2 Medium Priority (Should Have)

- Category management (create/edit/delete)
- Allergen information display
- Multiple admin accounts with audit trail
- Advanced statistics filtering
- Automatic backup system
- Error log viewer in admin portal
- Real-time kiosk status indicator
- Email notification configuration UI

### 6.3 Low Priority (Nice to Have for v1.1+)

- JSON export functionality
- Google OAuth authentication
- Shopping cart timeout configuration
- Advanced analytics (trends, predictions)
- Automatic low-stock threshold suggestions
- Animated loading states and transitions
- Mobile app for admins
- Multi-kiosk support
- Barcode scanning for inventory

---

## 7. Use Cases

### 7.1 Customer Purchase Flow (Happy Path)

1. Customer approaches kiosk during operating hours
2. Customer browses products in grid view
3. Customer optionally filters by category (e.g., "Drinks")
4. Customer views product details and allergen information
5. Customer taps "Add to Cart" button
6. Product added to cart with quantity 1
7. Customer adds more items (repeats steps 3-6)
8. Customer taps shopping cart icon
9. Customer reviews cart, edits quantities if needed
10. Customer taps "Checkout" button
11. System displays order summary and generates QR code (< 1 second)
12. Customer scans QR code with preferred banking/payment app
13. Customer confirms payment in the app and taps "I have paid" on the kiosk
14. System records manual confirmation (< 1 second) and validates persistence
15. System displays success message with green checkmark
16. System deducts inventory and logs transaction
17. Customer retrieves items from cabinet
18. System clears cart and returns to home screen after 5 seconds

**Expected Duration:** 30-60 seconds for first-time users

---

### 7.2 Alternate Flow - Payment Failure or No Confirmation

**Divergence Point:** Step 13 in main flow

13a. Customer cannot complete payment or does not tap "I have paid" within 60 seconds  
13b. System displays error message: "❌ Payment not confirmed. Please try again or ask for assistance."  
13c. Cart contents retained  
13d. Transaction logged as "FAILED" (no confirmation recorded)  
13e. Customer can:

- Tap "Try Again" → Returns to step 11 (new QR code generated)
- Tap "Cancel" → Returns to step 8 (cart view)
- Wait 5 minutes → Cart auto-clears, returns to home screen

---

### 7.3 Alternate Flow - Out of Stock with Confirmation

**Divergence Point:** Step 5 in main flow

5a. Product shows "Out of Stock" badge  
5b. Customer taps product anyway  
5c. System displays confirmation dialog: "This item shows as out of stock. Can you see it in the cabinet?"  
5d. Customer taps "Yes, I see it"  
5e. Product added to cart with special flag  
5f. Continues from step 6

**Inventory Impact:** Stock will go negative (e.g., 0 → -1) upon successful payment

---

### 7.4 Alternate Flow - Cart Timeout

**Divergence Point:** Any point after step 6

6a. Customer stops interacting for 5 minutes  
6b. System displays warning (optional): "Cart will clear in 30 seconds"  
6c. After 5 minutes total inactivity, cart auto-clears  
6d. System returns to home screen

---

### 7.5 Alternate Flow - Payment Uncertain

**Divergence Point:** Step 14 in main flow

14a. Customer reports completing payment but the kiosk cannot record confirmation  
14b. System displays message: "⚠️ Payment processor error. If you were charged, you may take your items. Contact [email] if charged incorrectly."  
14c. Transaction logged as "PAYMENT_UNCERTAIN"  
14d. Inventory NOT deducted automatically  
14e. Admin later reconciles in admin portal (see Use Case 7.7)

---

### 7.6 Admin Inventory Management

1. Admin navigates to admin portal URL
2. Admin logs in with username and password
3. System displays dashboard
4. Admin clicks "Inventory Management"
5. System displays product list with current stock quantities
6. Admin identifies product needing restock (e.g., "Coca-Cola: 2 units")
7. Admin taps "+" button multiple times or enters new quantity (e.g., 24)
8. Admin taps "Save" or system auto-saves
9. System updates inventory immediately
10. Kiosk reflects new stock within 5 seconds
11. If stock was below threshold and now above, low-stock alert clears

**Optional:** Admin sets low-stock threshold to 5 units for this product

---

### 7.7 Admin Payment Reconciliation

1. Admin logs into admin portal
2. Admin receives email notification: "Uncertain payment detected"
3. Admin clicks "Uncertain Payments" report
4. System displays list of "PAYMENT_UNCERTAIN" transactions
5. Admin reviews transaction details (items, amount, timestamp)
6. Admin reviews confirmation audit log and verifies supporting evidence (e.g., payment receipt provided by customer or bank statement)
7. Admin selects transaction and clicks "Mark as Confirmed" OR "Mark as Refunded"
8. If confirmed:
   - System deducts inventory retroactively
   - Transaction status updated to "COMPLETED"
9. If refunded:
   - No inventory change
   - Transaction status updated to "REFUNDED"
10. Admin manually contacts customer if needed (trust-based system)

---

### 7.8 Admin Product Addition

1. Admin logs into web portal
2. Admin navigates to "Product Management"
3. Admin clicks "Add New Product" button
4. System displays product form
5. Admin fills in:
   - Name: "Red Bull Energy Drink"
   - Price: 2.50
   - Categories: Drinks, Cold Drinks (multi-select)
   - Allergens: "Contains caffeine"
   - Purchase limit: 4
6. Admin uploads product image (red-bull.jpg, 2.3MB)
7. System validates image (JPEG format OK, size OK)
8. System processes image:
   - Resizes to 800x600px
   - Compresses to 180KB
   - Converts to WebP
   - Shows preview
9. Admin confirms preview
10. Admin clicks "Save Product"
11. System validates all fields (price range OK, name not empty, etc.)
12. System saves product to database
13. Product appears on kiosk immediately (within 5 seconds)
14. Admin receives confirmation: "✅ Product added successfully"

---

### 7.9 Admin Statistics Export

1. Admin logs into web portal
2. Admin navigates to "Statistics & Reporting"
3. Admin selects date range: "Last 30 Days" (preset button)
4. System displays:
   - Total revenue: €1,247.50
   - Number of transactions: 523
   - Average transaction: €2.38
   - Top 10 products chart
5. Admin reviews statistics
6. Admin clicks "Export to CSV" button
7. System generates CSV file: `transactions_2025-10-11_to_2025-11-10.csv`
8. Browser downloads file
9. Admin opens CSV in Excel/Google Sheets for further analysis

---

## 8. Data Requirements

**Database:** PostgreSQL 18 with JSONB support, UUID extension, and advanced indexing

### 8.1 Data Entities

**PostgreSQL-Specific Features:**

- **Data Types:** UUID (via uuid-ossp extension), DECIMAL for monetary values, TIMESTAMP WITH TIME ZONE for accurate datetime, JSONB for flexible JSON storage, ENUM for status fields
- **Indexing:** B-tree indexes on frequently queried columns, partial indexes for active records
- **Foreign Keys:** CASCADE on delete for dependent data, RESTRICT for reference data
- **Connection Pooling:** pg-pool for efficient connection management

#### 8.1.1 Product

```sql
ProductID: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
Name: VARCHAR(100) NOT NULL
Price: DECIMAL(5,2) NOT NULL CHECK (Price >= 0.01 AND Price <= 999.99)
ImageURL: VARCHAR(500) NULL
Categories: JSONB NULL  -- Flexible array storage: ["Drinks", "Cold Drinks"]
AllergenInfo: TEXT NULL
IsHot: BOOLEAN DEFAULT FALSE
PurchaseLimit: INTEGER NULL CHECK (PurchaseLimit >= 1 AND PurchaseLimit <= 50)
StockQuantity: INTEGER NULL  -- NULL if tracking disabled, can be negative
LowStockThreshold: INTEGER DEFAULT 5 CHECK (LowStockThreshold >= 1 AND LowStockThreshold <= 99)
IsActive: BOOLEAN DEFAULT TRUE  -- Soft delete flag
CreatedAt: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
UpdatedAt: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
CreatedBy: UUID REFERENCES Admin(AdminID) ON DELETE SET NULL
UpdatedBy: UUID REFERENCES Admin(AdminID) ON DELETE SET NULL

-- Indexes for performance
INDEX idx_product_active ON Product(IsActive) WHERE IsActive = TRUE
INDEX idx_product_stock ON Product(StockQuantity) WHERE InventoryTrackingEnabled = TRUE
INDEX idx_product_categories ON Product USING GIN(Categories)  -- GIN index for JSONB
```

#### 8.1.2 Category

```sql
CategoryID: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
CategoryName: VARCHAR(50) NOT NULL UNIQUE
DisplayOrder: INTEGER DEFAULT 0
IsDefault: BOOLEAN DEFAULT FALSE
CreatedAt: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL

-- Index
INDEX idx_category_display_order ON Category(DisplayOrder)
```

#### 8.1.3 Transaction

```sql
TransactionID: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
Timestamp: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
TotalAmount: DECIMAL(6,2) NOT NULL
PaymentStatus: payment_status_enum NOT NULL  -- ENUM type defined below
ConfirmationSessionId: VARCHAR(64) NULL
ConfirmationMethod: VARCHAR(32) DEFAULT 'manual' NOT NULL
ConfirmedAt: TIMESTAMP WITH TIME ZONE NULL
ReconciledBy: UUID REFERENCES Admin(AdminID) ON DELETE SET NULL
ReconciledAt: TIMESTAMP WITH TIME ZONE NULL
CreatedAt: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL

-- ENUM type definition
CREATE TYPE payment_status_enum AS ENUM (
    'PENDING', 
    'COMPLETED', 
    'FAILED', 
    'PAYMENT_UNCERTAIN', 
    'REFUNDED'
);

-- Indexes for performance
INDEX idx_transaction_timestamp ON Transaction(Timestamp DESC)
INDEX idx_transaction_status ON Transaction(PaymentStatus)
INDEX idx_transaction_date_status ON Transaction(Timestamp DESC, PaymentStatus)  -- Composite index
```

#### 8.1.4 TransactionItem

```sql
TransactionItemID: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
TransactionID: UUID NOT NULL REFERENCES Transaction(TransactionID) ON DELETE CASCADE
ProductID: UUID NOT NULL REFERENCES Product(ProductID) ON DELETE RESTRICT
ProductName: VARCHAR(100) NOT NULL  -- Snapshot for historical accuracy
Quantity: INTEGER NOT NULL CHECK (Quantity > 0)
PriceAtPurchase: DECIMAL(5,2) NOT NULL  -- Price snapshot
WasOutOfStock: BOOLEAN DEFAULT FALSE

-- Indexes
INDEX idx_transaction_item_transaction ON TransactionItem(TransactionID)
INDEX idx_transaction_item_product ON TransactionItem(ProductID)
```

#### 8.1.5 SystemConfiguration

```sql
ConfigID: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
OperatingHoursStart: TIME DEFAULT '08:00'
OperatingHoursEnd: TIME DEFAULT '19:00'
CartTimeoutMinutes: INTEGER DEFAULT 5
InventoryTrackingEnabled: BOOLEAN DEFAULT TRUE
MaintenanceModeEnabled: BOOLEAN DEFAULT FALSE
MaintenanceModeMessage: TEXT NULL
AdminNotificationEmails: TEXT NULL  -- Comma-separated emails
UpdatedAt: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
UpdatedBy: UUID REFERENCES Admin(AdminID) ON DELETE SET NULL
```

#### 8.1.6 Admin

```sql
AdminID: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
Username: VARCHAR(100) NOT NULL UNIQUE  -- Email format
PasswordHash: VARCHAR(255) NOT NULL  -- bcrypt with salt
Email: VARCHAR(100) NOT NULL
IsPrimaryAdmin: BOOLEAN DEFAULT FALSE
CreatedAt: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
LastLogin: TIMESTAMP WITH TIME ZONE NULL
IsActive: BOOLEAN DEFAULT TRUE

-- Index
INDEX idx_admin_username ON Admin(Username)
INDEX idx_admin_active ON Admin(IsActive) WHERE IsActive = TRUE
```

#### 8.1.7 AuditLog

```sql
AuditLogID: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
AdminID: UUID NOT NULL REFERENCES Admin(AdminID) ON DELETE CASCADE
Action: VARCHAR(100) NOT NULL  -- e.g., 'PRODUCT_CREATED', 'INVENTORY_UPDATED'
EntityType: VARCHAR(50) NOT NULL  -- e.g., 'Product', 'Category'
EntityID: UUID NOT NULL
OldValue: JSONB NULL  -- Previous state for comparison
NewValue: JSONB NULL  -- New state after change
Timestamp: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
IPAddress: INET NULL  -- PostgreSQL INET type for IP addresses

-- Indexes
INDEX idx_audit_log_timestamp ON AuditLog(Timestamp DESC)
INDEX idx_audit_log_admin ON AuditLog(AdminID)
INDEX idx_audit_log_entity ON AuditLog(EntityType, EntityID)
```

#### 8.1.8 ErrorLog

```sql
ErrorLogID: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
Timestamp: TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
LogLevel: log_level_enum NOT NULL  -- ENUM type defined below
Component: VARCHAR(100) NOT NULL  -- e.g., 'PaymentConfirmationService', 'EmailService'
Message: TEXT NOT NULL
StackTrace: TEXT NULL
RequestID: VARCHAR(100) NULL  -- For request tracing

-- ENUM type definition
CREATE TYPE log_level_enum AS ENUM ('ERROR', 'WARN', 'INFO', 'DEBUG');

-- Indexes
INDEX idx_error_log_timestamp ON ErrorLog(Timestamp DESC)
INDEX idx_error_log_level ON ErrorLog(LogLevel)
INDEX idx_error_log_component ON ErrorLog(Component)
```

### 8.2 Data Storage

#### 8.2.1 Retention Policies

- **Transaction history:** Minimum 3 years, then archive/delete at admin discretion
- **Error logs:** 30 days
- **Audit logs:** 1 year
- **Product data:** Soft-deleted products retained indefinitely for transaction history integrity
- **Images:** Original images backed up, optimized versions cached

#### 8.2.2 Backup Strategy

- **Daily full backup:** 02:00 (non-operating hours)
- **Retention:** Last 30 daily backups, last 12 weekly backups
- **Storage location:** Separate from primary database (cloud storage or external drive)
- **Verification:** Automated integrity check after each backup
- **Alert:** Email notification if backup fails

#### 8.2.3 Storage Capacity Planning

- **Expected annual transaction volume:** 18,000-25,000 (50-100 per day × 250 operating days)
- **Database size estimate:**
  - Transactions: ~5KB each × 25,000 = ~125MB/year
  - Products: ~50 products × 10KB = ~500KB
  - Images: ~50 products × 200KB optimized = ~10MB
  - Logs: ~100MB/year
  - **Total:** ~250MB/year
- **Recommended storage:** Minimum 10GB database storage (40 years capacity)
- **Alert threshold:** 80% capacity (~8GB used)

---

## 9. Assumptions and Dependencies

### 9.1 Assumptions

- Manual payment confirmation instructions are clearly displayed alongside the kiosk and communicated to students
- Students will act honestly in the trust-based system (occasional discrepancies expected and acceptable)
- Network connectivity is reliable during operating hours (5 Mbps minimum, 10 Mbps recommended)
- A single administrator is sufficient for day-to-day management (up to 10 admin accounts supported)
- Product images will be provided in web-compatible formats (JPEG, PNG, WebP, GIF)
- Kiosk tablet device has minimum 10" touchscreen display with 1280x800px resolution
- Operating environment is student lounge (indoor, climate-controlled, supervised area)
- Expected transaction volume: 50-100 per day during academic year
- All transactions are conducted in EUR (Euro)
- No multi-currency support required

### 9.2 Dependencies

#### 9.2.1 External Services

- **Email service:** SMTP server or API (SendGrid, AWS SES, Mailgun, etc.)
- **Internet connectivity:** ISP uptime and bandwidth
- **DNS and network infrastructure:** Organization's network availability

#### 9.2.2 Hardware

- **Tablet/touchscreen device:** Must be procured and configured
- **Physical snack cabinet:** Must be available and accessible in student lounge
- **Network equipment:** Wi-Fi access point or Ethernet connection

#### 9.2.3 Organizational

- **Admin availability:** Someone must monitor notifications and restock inventory
- **Cashless payment method availability:** Students retain access to personal banking or mobile payment apps capable of scanning the kiosk QR code
- **Email account:** Admin email address for notifications must be monitored

---

## 10. Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy | Residual Risk |
|------|--------|-------------|---------------------|---------------|
| **Confirmation service outage** | High | Low | Display clear error messages; log incidents; email admin if confirmation unavailable > 15 min; document manual receipt procedure | Medium |
| **Internet connectivity loss** | High | Medium | Display "service unavailable" message; document offline procedures; consider local caching for browsing in v1.1+ | Medium |
| **Inventory discrepancy (theft/honor system)** | Medium | Medium | Negative stock tracking; manual adjustment tools; regular admin audits; trust-based messaging | Low |
| **Cart timeout too short/long** | Low | Medium | Fixed at 5 minutes in v1.0 (well-tested default); configurable in v1.1+ | Very Low |
| **Payment charged but system doesn't record** | High | Low | Transaction logging before inventory update; PAYMENT_UNCERTAIN status; manual confirmation audit trail; reconciliation checklist | Low |
| **Low stock not noticed by admin** | Medium | Low | Automatic email notifications; configurable thresholds (default 5); visual alerts in admin portal | Very Low |
| **Database storage capacity exceeded** | Medium | Low | 80% capacity alerts; 3-year retention policy with archival; CSV export before deletion | Very Low |
| **Admin password forgotten** | Low | Medium | Password reset via email; primary admin can reset other admins; document recovery procedure | Very Low |
| **Concurrent admin editing conflicts** | Low | Low | Last write wins (acceptable for single-kiosk, low-volume scenario); audit log tracks changes | Very Low |
| **Image upload malware/virus** | Medium | Very Low | File type validation; content validation; EXIF stripping; optional virus scanning | Very Low |
| **Performance degradation with large transaction history** | Medium | Low | Database indexing on key fields; pagination (50 per page); query optimization; 2-second SLA for 10K transactions | Very Low |
| **Email notification failures** | Medium | Low | Retry logic (3 attempts); logging; admin can test notifications; alternate email addresses | Very Low |

---

## 11. Future Enhancements (Out of Scope for v1.0)

### Planned for v1.1

- Shopping cart timeout configuration (admin-settable 1-10 minutes)
- JSON export format for transaction data
- Google OAuth authentication for admins
- Improved statistics with trend analysis

### Planned for v1.2+

- Automated payment provider integration (fallback for manual confirmation)
- Multi-kiosk support (central inventory management)
- Mobile app for admins (iOS/Android)
- Real-time sales dashboard with auto-refresh
- Customer loyalty programs or student account integration
- Automatic restocking suggestions based on sales patterns
- Barcode scanning for inventory management
- Integration with accounting systems (export to QuickBooks, etc.)
- SMS notifications for critical alerts
- Scheduled maintenance mode (plan in advance)
- Product expiry date tracking
- Nutritional information display
- Multiple languages (internationalization)

---

## 12. Acceptance Criteria

The system will be considered complete and ready for production when:

### Functional Acceptance

1. ✅ Customers can browse products by category on the kiosk with response time < 300ms
2. ✅ Customers can add multiple items to a cart with running total displayed
3. ✅ Customers can complete purchases by scanning the QR code and confirming payment manually on the kiosk
4. ✅ Payment confirmations are clearly displayed (green, 3+ seconds) with success message
5. ✅ Payment failures are clearly displayed (red, 5+ seconds) with error message and retry option
6. ✅ Admins can log in securely to the web portal with username/password
7. ✅ Admins can add, edit, and remove products with images (JPEG/PNG/WebP/GIF)
8. ✅ Product images are automatically processed (resize to 800x600px, compress to <200KB, convert to WebP)
9. ✅ Admins can enable/disable inventory tracking system-wide
10. ✅ Admins can manually update inventory quantities
11. ✅ Admins can view statistics (popular products, revenue by period with daily/weekly/monthly views)
12. ✅ Admins can export transaction data to CSV with meaningful filename
13. ✅ Admins receive email notifications for low stock (when threshold reached)
14. ✅ System displays "Closed" status outside operating hours
15. ✅ System displays "Maintenance" message when maintenance mode enabled
16. ✅ System enforces per-item purchase limits (1-50 configurable)
17. ✅ Cart automatically clears after 5 minutes of inactivity
18. ✅ Out-of-stock items are clearly marked when inventory tracking enabled
19. ✅ Out-of-stock items can be purchased with confirmation ("Can you see it?")
20. ✅ Inventory can go negative to track discrepancies

### Performance Acceptance

1. ✅ Filter changes update display within 300ms (90th percentile)
2. ✅ Cart operations reflect within 200ms (90th percentile)
3. ✅ Product grid loads within 2 seconds (95th percentile)
4. ✅ QR code generation completes within 1 second
5. ✅ Statistics queries return within 2 seconds for up to 10,000 transactions

### Security Acceptance

1. ✅ Admin passwords are hashed with bcrypt/Argon2 (minimum 12 rounds)
2. ✅ All communication uses HTTPS/TLS 1.2+
3. ✅ Image uploads are validated and sanitized
4. ✅ Admin sessions timeout after 30 minutes inactivity

### Data & Reliability Acceptance

1. ✅ Transactions are logged immediately (within 1 second)
2. ✅ Transaction history retained for minimum 3 years
3. ✅ Daily automated backups at 02:00 with email confirmation
4. ✅ Backup integrity verification successful
5. ✅ Database alerts at 80% capacity

### Usability Acceptance

1. ✅ 90% of test users (n=10) complete purchase within 60 seconds without assistance
2. ✅ All interactive elements are minimum 44x44px touch targets
3. ✅ Error messages meet WCAG AA contrast ratios (4.5:1)
4. ✅ Admin portal works in Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Edge Case Acceptance

1. ✅ Payment uncertainty is handled (PAYMENT_UNCERTAIN status, admin reconciliation)
2. ✅ Manual confirmation service unavailability displays appropriate error message
3. ✅ Multiple admin accounts supported (up to 10) with audit trail
4. ✅ Maintenance mode overrides operating hours

---

## 13. Glossary

- **Trust-based system:** A system where customers are expected to pay for items they take, without physical enforcement mechanisms (locks, gates, etc.)
- **Kiosk:** A self-service terminal for customer interaction
- **Admin Portal:** Web-based interface for system administration
- **QR Code:** Quick Response code for payment initiation (2D barcode)
- **Manual payment confirmation:** Customer acknowledgement step recorded by the kiosk after scanning the QR code with a personal payment app
- **NFC:** Near Field Communication for contactless payments
- **Inventory tracking:** Optional system feature to monitor stock quantities
- **Low stock threshold:** Configurable quantity that triggers admin notification (default: 5 units)
- **Negative stock:** Stock quantity below zero, indicating discrepancy between system and physical inventory
- **PAYMENT_UNCERTAIN:** Transaction status when customer may have been charged but system didn't receive confirmation
- **Soft delete:** Marking a record as inactive rather than permanently deleting it (preserves data integrity)
- **WebP:** Modern image format with superior compression (fallback to JPEG for older browsers)
- **WCAG AA:** Web Content Accessibility Guidelines Level AA (contrast ratio 4.5:1 for normal text)
- **bcrypt/Argon2:** Secure password hashing algorithms resistant to brute-force attacks
- **ISO 8601:** International standard for date/time format (YYYY-MM-DDTHH:MM:SSZ)
- **UUID:** Universally Unique Identifier (128-bit identifier, e.g., 550e8400-e29b-41d4-a716-446655440000)

---

## 14. Testing Requirements

### 14.1 Unit Testing

- All business logic functions must have unit tests
- Minimum 80% code coverage for backend
- Test edge cases (negative stock, price validation, etc.)

### 14.2 Integration Testing

- Manual payment confirmation API (simulate kiosk-to-server confirmation requests)
- Email service integration (verify email delivery)
- Database operations (CRUD for all entities)

### 14.3 Performance Testing

- Load test with 100 concurrent product views (simulated)
- Verify response times meet NFR-1 targets
- Test statistics queries with 10,000+ transactions

### 14.4 Usability Testing

- Recruit 10 test users (students)
- Observe first-time purchase attempts
- Measure task completion time and success rate
- Goal: 90% success within 60 seconds

### 14.5 Security Testing

- Password strength validation
- SQL injection attempts
- XSS (Cross-Site Scripting) attempts
- Image upload malicious file attempts
- Session timeout verification

### 14.6 Acceptance Testing

- Verify all 42 acceptance criteria (Section 12)
- End-to-end purchase flow (happy path)
- Admin workflow testing (all major features)
- Edge case testing (payment failures, out-of-stock, etc.)

---

## 15. Deployment Requirements

### 15.1 Production Environment

**PERN Stack Deployment:**

- **Application Server:** Node.js 24.11 LTS with Express.js 5.1
- **Database:** PostgreSQL 18 with connection pooling (pg-pool)
  - **Connection Pool Configuration:**
    - Max connections: 20 (adjustable based on load)
    - Idle timeout: 30 seconds
    - Connection timeout: 5 seconds
  - **PostgreSQL Configuration Requirements:**
    - `max_connections`: 100 (minimum)
    - `shared_buffers`: 512MB (minimum, 25% of RAM recommended)
    - `effective_cache_size`: 1.5GB (minimum, 50-75% of RAM)
    - `work_mem`: 16MB (per query operation)
    - `maintenance_work_mem`: 128MB (for maintenance operations)
- **Web Server:** Nginx 1.24+ as reverse proxy
  - Handles SSL/TLS termination
  - Serves static files (React build, images)
  - Proxies API requests to Node.js backend
  - Compression and caching for performance
- **Process Manager:** PM2 2.5+ for Node.js process management
  - Auto-restart on crashes
  - Load balancing with cluster mode (2-4 instances)
  - Log management and rotation
  - Zero-downtime deployments
- **Storage:**
  - Minimum 10GB database storage
  - Minimum 20GB for product images and backups
  - SSD recommended for database performance
- **Memory:** Minimum 4GB RAM
  - 2GB allocated for Node.js application (PM2 cluster)
  - 2GB allocated for PostgreSQL
  - Additional RAM for OS and caching recommended
- **CPU:** Minimum 2 cores (4 cores recommended for production load)
- **Operating System:** Ubuntu 22.04 LTS or similar Linux distribution
- **Optional:** Docker containerization for easier deployment and scaling

### 15.2 Configuration

- **Environment Variables:** (stored in .env file, never committed to version control)

  ```
  # Node.js Application
  NODE_ENV=production
  PORT=3000
  
  # PostgreSQL Database
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=snackbar_prod
  DB_USER=snackbar_app
  DB_PASSWORD=<secure_password>
  DB_SSL=require
  POOL_MIN=2
  POOL_MAX=10
  
  # Payment Confirmation
  CONFIRMATION_AUDIT_SALT=<random_string_for_hashing>
  KIOSK_DEVICE_ID=<kiosk-identifier>
  
  # Email Service (SMTP)
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=<smtp_username>
  SMTP_PASSWORD=<smtp_password>
  SMTP_FROM=noreply@snackbar.example.com
  
  # Security
  JWT_SECRET=<random_secure_key>
  SESSION_SECRET=<random_secure_key>
  BCRYPT_ROUNDS=12
  
  # Application Settings
  ADMIN_NOTIFICATION_EMAILS=admin@example.com
  ```

- **HTTPS Certificate:** Let's Encrypt or commercial SSL (configured in Nginx)
- **Nginx Configuration Example:**

  ```nginx
  upstream nodejs_backend {
      server localhost:3000;
  }
  
  server {
      listen 80;
      server_name snackbar.example.com;
      return 301 https://$server_name$request_uri;
  }
  
  server {
      listen 443 ssl http2;
      server_name snackbar.example.com;
      
      ssl_certificate /etc/letsencrypt/live/snackbar.example.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/snackbar.example.com/privkey.pem;
      
      # Static files (React frontend)
      location / {
          root /var/www/snackbar/client/build;
          try_files $uri /index.html;
          expires 1d;
      }
      
      # API endpoints
      location /api/ {
          proxy_pass http://nodejs_backend;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
      }
      
      # Product images
      location /images/ {
          root /var/www/snackbar/uploads;
          expires 7d;
      }
  }
  ```

### 15.3 Monitoring

- **Server uptime monitoring:** UptimeRobot, Pingdom, or similar service
- **Application error tracking:** Sentry, Rollbar, or built-in logging with PM2
- **Database performance monitoring:**
  - PostgreSQL built-in statistics (pg_stat_statements extension)
  - Query performance monitoring
  - Connection pool monitoring
- **Backup verification alerts:** Email notifications on backup success/failure
- **System metrics:** CPU, memory, disk usage monitoring
- **Node.js Application Monitoring:**
  - PM2 monitoring dashboard
  - Request/response time tracking
  - Error rate monitoring
  - Memory leak detection

---

## 16. Technology Stack Specification

This section provides comprehensive details on all technologies, frameworks, libraries, and tools used in the PERN stack implementation.

### 16.1 Core Stack (PERN)

#### 16.1.1 Database Layer

- **PostgreSQL:** Version 18
  - Primary relational database with advanced features
  - UUID support via uuid-ossp extension
  - JSONB for flexible JSON data storage
  - Full-text search capabilities
  - Advanced indexing (B-tree, GIN, partial indexes)
  - Transactional integrity with ACID compliance

#### 16.1.2 Backend Layer

- **Node.js:** Version 24.11 LTS
  - JavaScript runtime built on Chrome's V8 engine
  - Long-term support for stability
  - Native ES modules support
  - Excellent async/await performance
  
- **Express.js:** Version 5.1
  - Minimalist web framework for Node.js
  - Robust routing and middleware system
  - RESTful API architecture
  - Easy integration with third-party libraries

#### 16.1.3 Frontend Layer

- **React:** Version 19.2
  - Modern UI library with declarative component model
  - Functional components with hooks (useState, useEffect, useContext, etc.)
  - Virtual DOM for efficient rendering
  - Component-based architecture for reusability
  - React.StrictMode for development best practices

### 16.2 Backend Dependencies

#### 16.2.1 Database & Data Access

- **pg (node-postgres):** Version 8.11.x
  - PostgreSQL client for Node.js
  - Connection pooling support
  - Parameterized queries for SQL injection prevention
  - Transaction management
  - Prepared statements for performance

#### 16.2.2 Security

- **bcrypt:** Version 5.1.x
  - Password hashing with automatic salt generation
  - Configurable rounds (default: 12)
  - Resistant to rainbow table attacks
  
- **jsonwebtoken:** Version 9.0.x
  - JWT (JSON Web Token) generation and verification
  - Stateless authentication for API endpoints
  - Token expiration and refresh support
  
- **helmet:** Version 7.1.x
  - Security middleware for Express.js
  - Sets various HTTP headers for security
  - Protection against common vulnerabilities (XSS, clickjacking, etc.)
  
- **cors:** Version 2.8.x
  - Cross-Origin Resource Sharing middleware
  - Configurable allowed origins
  - Credentials support for authenticated requests

#### 16.2.3 Validation & Data Processing

- **express-validator:** Version 7.0.x
  - Request validation and sanitization
  - Chain validation rules
  - Custom validators support
  - Automatic error formatting
  
- **dotenv:** Version 16.3.x
  - Environment variable management
  - Loads .env file into process.env
  - Never commit sensitive data to version control

#### 16.2.4 Communication

- **nodemailer:** Version 6.9.x
  - Email sending library
  - SMTP and API-based email services support
  - HTML and plain text emails
  - Attachment support
  - Template integration

#### 16.2.5 Logging & Performance

- **morgan:** Version 1.10.x
  - HTTP request logger middleware
  - Customizable log formats
  - Development and production modes
  - Useful for debugging and monitoring
  
- **compression:** Version 1.7.x
  - Response compression middleware
  - Gzip compression for HTTP responses
  - Reduces bandwidth and improves load times
  - Configurable compression level

### 16.3 Frontend Dependencies

#### 16.3.1 Routing & Navigation

- **react-router-dom:** Version 6.20.x
  - Declarative routing for React applications
  - Browser history management
  - Nested routes support
  - Protected route components
  - Navigation hooks (useNavigate, useParams, useLocation)

#### 16.3.2 HTTP Client

- **axios:** Version 1.6.x
  - Promise-based HTTP client
  - Request/response interceptors
  - Automatic JSON transformation
  - Request cancellation support
  - Browser and Node.js compatible

#### 16.3.3 UI Component Libraries

**Choose one of the following:**

**Option A: Material-UI (MUI)**

- **@mui/material:** Version 5.14.x
- **@mui/icons-material:** Version 5.14.x
- Google Material Design implementation
- Comprehensive component library
- Theming and customization
- Accessibility built-in
- Responsive by default

**Option B: Chakra UI**

- **@chakra-ui/react:** Version 2.8.x
- **@emotion/react:** Version 11.11.x (peer dependency)
- **@emotion/styled:** Version 11.11.x (peer dependency)
- Modular and accessible components
- Simple styling with props
- Dark mode support
- Responsive utilities

#### 16.3.4 Date & Time Handling

**Choose one of the following:**

**Option A: date-fns**

- **date-fns:** Version 2.30.x
- Modern JavaScript date utility library
- Tree-shakable (only import what you use)
- Immutable and pure functions
- i18n support

**Option B: Day.js**

- **dayjs:** Version 1.11.x
- Lightweight alternative to Moment.js
- Similar API to Moment.js
- Plugin architecture
- Small bundle size (2KB)

### 16.4 Development Tools

#### 16.4.1 Build Tools

- **Vite:** Version 5.0.x
  - Next-generation frontend build tool
  - Fast Hot Module Replacement (HMR)
  - Optimized production builds
  - Native ES modules in development
  - React plugin support (@vitejs/plugin-react)

#### 16.4.2 Code Quality

- **ESLint:** Version 8.x
  - JavaScript and React linting
  - Customizable rules
  - Code style enforcement
  - Integration with editors (VS Code, WebStorm, etc.)
  - Recommended configurations: eslint-config-airbnb, eslint-plugin-react
  
- **Prettier:** Version 3.x
  - Opinionated code formatter
  - Consistent code style across team
  - Integration with ESLint
  - Format on save support
  - Configuration: .prettierrc

#### 16.4.3 Testing

**Backend Testing:**

- **Jest:** Version 29.x
  - JavaScript testing framework
  - Unit and integration tests
  - Code coverage reports
  - Mocking support
  - Snapshot testing
  
- **Supertest:** Version 6.3.x
  - HTTP assertion library
  - API endpoint testing
  - Works with Express.js
  - Chai-like assertions

**Frontend Testing:**

- **React Testing Library:** Version 14.x
  - User-centric testing approach
  - DOM testing utilities
  - Integration with Jest
  - Accessibility testing support
  
- **@testing-library/jest-dom:** Version 6.x
  - Custom Jest matchers for DOM
  - Improved assertions for React components

### 16.5 Optional but Recommended

#### 16.5.1 TypeScript

- **TypeScript:** Version 5.3.x
  - Static type checking for JavaScript
  - Enhanced IDE support and autocomplete
  - Catch errors at compile time
  - Better code documentation through types
  - Gradual adoption possible (can mix .js and .ts files)
  - Type definitions: @types/node, @types/express, @types/react, @types/react-dom

**Benefits:**

- Reduced runtime errors
- Better refactoring support
- Improved team collaboration
- Self-documenting code

**Configuration files:**

- `tsconfig.json` for TypeScript compiler options
- Strict mode recommended for new projects

### 16.6 Deployment & DevOps

#### 16.6.1 Process Management

- **PM2:** Version 2.5.x
  - Production process manager for Node.js
  - Process clustering and load balancing
  - Auto-restart on crashes
  - Log management and rotation
  - Zero-downtime deployments
  - Monitoring dashboard
  - Startup script generation

**PM2 Configuration (ecosystem.config.json):**

```json
{
  "apps": [
    {
      "name": "snackbar-api",
      "script": "./dist/server.js",
      "instances": 2,
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3000
      },
      "error_file": "./logs/err.log",
      "out_file": "./logs/out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "merge_logs": true,
    max_memory_restart: '1G'
  }]
};
```

#### 16.6.2 Web Server

- **Nginx:** Version 1.24+
  - High-performance HTTP server and reverse proxy
  - SSL/TLS termination
  - Static file serving
  - Load balancing
  - Gzip compression
  - Request rate limiting
  - Security headers

#### 16.6.3 Containerization (Optional)

- **Docker:** Version 24.x (optional)
  - Containerization platform
  - Consistent environments across dev/staging/prod
  - Easy scaling and deployment
  - Docker Compose for multi-container setup
  
**Docker Files:**

- `Dockerfile` for Node.js application
- `Dockerfile.postgres` for PostgreSQL (or use official image)
- `docker-compose.yml` for orchestration

**Example docker-compose.yml:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_DB: snackbar_prod
      POSTGRES_USER: snackbar_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  api:
    build: .
    depends_on:
      - postgres
    environment:
      NODE_ENV: production
      DB_HOST: postgres
    ports:
      - "3000:3000"
    restart: unless-stopped

volumes:
  postgres_data:
```

### 16.7 Version Control & Package Management

#### 16.7.1 Package Managers

- **npm:** Version 10.x (bundled with Node.js 24.11)
  - Default Node.js package manager
  - Lock file: package-lock.json
  - Scripts for build, test, start
  
**Alternative:**

- **pnpm:** Version 8.x (optional, more efficient disk usage)
- **yarn:** Version 4.x (optional, alternative to npm)

#### 16.7.2 Version Control

- **Git:** Version 2.40+
  - Distributed version control
  - .gitignore configuration to exclude:
    - node_modules/
    - .env files
    - build/dist directories
    - log files
    - uploaded images (use separate storage or CDN)

### 16.8 Development Environment Setup

#### 16.8.1 Prerequisites

```bash
# Install Node.js 24.11 LTS
# Install PostgreSQL 18
# Install Git

# Verify installations
node --version  # Should show v24.11.x
npm --version   # Should show 10.x
psql --version  # Should show 18.x
git --version   # Should show 2.40+
```

#### 16.8.2 Initial Setup

```bash
# Clone repository
git clone https://github.com/org/snackbar.git
cd snackbar

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with actual values

# Setup database
createdb snackbar_dev
psql snackbar_dev < schema.sql

# Run migrations (if using migration tool)
npm run migrate

# Start development servers
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

### 16.9 Package.json Scripts

#### Backend (server/package.json)

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon --watch src --ext ts,tsx --exec \"ts-node --project tsconfig.json src/server.ts\"",
    "test": "jest --config jest.config.ts --coverage",
    "test:watch": "jest --config jest.config.ts --watch",
    "lint": "eslint src --ext .js,.ts",
    "lint:fix": "eslint src --ext .js,.ts --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  }
}
```

#### Frontend (client/package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint \"src/**/*.{js,jsx,ts,tsx}\"",
    "lint:fix": "eslint \"src/**/*.{js,jsx,ts,tsx}\" --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  }
}
```

### 16.10 Additional Considerations

#### 16.10.1 Image Processing (for product images)

- **sharp:** Version 0.33.x
  - High-performance image processing
  - Resize, compress, format conversion
  - WebP generation with JPEG fallback
  - EXIF metadata stripping

#### 16.10.2 API Documentation

- **Swagger/OpenAPI:** Version 3.0
  - API specification format
  - Interactive documentation
  - **swagger-ui-express:** Version 5.0.x for serving docs
  - **swagger-jsdoc:** Version 6.2.x for generating from comments

#### 16.10.3 Rate Limiting

- **express-rate-limit:** Version 7.1.x
  - Prevent brute-force attacks
  - API abuse protection
  - Configurable windows and limits

#### 16.10.4 Session Management

- **express-session:** Version 1.17.x
  - Session middleware for Express
  - PostgreSQL session store (connect-pg-simple)
  - Cookie-based sessions

---

**Document Status:** APPROVED - Ready for Development  
**Next Steps:**

1. Technical architecture design
2. Database schema implementation
3. API specification (OpenAPI/Swagger)
4. UI/UX mockups and prototypes
5. Development sprint planning

---

**Prepared by:** Requirements Engineering Team  
**Reviewed by:** [To be filled by stakeholder]  
**Approved by:** [To be filled by stakeholder]  
**Approval Date:** [To be filled]
