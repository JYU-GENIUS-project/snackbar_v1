# Software Requirements Specification (SRS)
## Self-Service Snack Bar Kiosk System

**Project:** snackbar  
**Version:** 1.0  
**Date:** 2025-11-06  
**Prepared for:** Student Lounge Snack Bar Initiative

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
- **MobilePay** - Payment service provider
- **CSV** - Comma-Separated Values file format
- **JSON** - JavaScript Object Notation file format

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

#### 2.2.2 Administrator
- **Technical Expertise:** Moderate
- **Frequency of Use:** Regular (for restocking and monitoring)
- **Key Activities:** Manage inventory, configure system, view statistics, generate reports
- **Authentication:** Username/password (Google OAuth optional)

### 2.3 Operating Environment
- **Kiosk Device:** Tablet or touchscreen device
- **Connectivity:** Requires internet connection
- **Operating Hours:** Configurable (default 08:00-19:00)
- **Number of Concurrent Users:** 1 (single kiosk)

### 2.4 Design and Implementation Constraints
- Trust-based system (no physical locking mechanisms)
- Integration with MobilePay API
- Web-based or application-based (customer-agnostic)
- Must support both desktop and tablet interfaces for admin portal

---

## 3. Functional Requirements

### 3.1 Kiosk Interface (Customer-Facing)

#### 3.1.1 Product Display
**FR-1.1:** The system SHALL display products in a grid layout with images.

**FR-1.2:** Each product display SHALL include:
- Product name
- Price
- Product image (or default placeholder if none uploaded)
- Category indicator
- Availability status

**FR-1.3:** The system SHALL provide category filtering functionality (e.g., Drinks, Snacks).

**FR-1.4:** The system SHALL display allergen information for each product when available.

**FR-1.5:** When inventory tracking is disabled, the system SHALL display a warning message: "Please verify that the item exists in the cabinet before completing payment."

**FR-1.6:** When inventory tracking is enabled and a product is out of stock, the system SHALL:
- Display the product as "Out of Stock"
- Allow purchase after customer confirms they can see the item in the cabinet

#### 3.1.2 Shopping Cart
**FR-2.1:** The system SHALL provide a shopping cart where customers can add multiple items.

**FR-2.2:** The shopping cart SHALL display:
- Individual items with quantities
- Price per item
- Running total price
- Option to edit quantities or remove items

**FR-2.3:** The system SHALL enforce item-specific purchase limits configured by admin.

**FR-2.4:** When a customer attempts to exceed purchase limits, the system SHALL prevent adding additional items and display an appropriate message.

**FR-2.5:** The system SHALL automatically clear the shopping cart after 5 minutes of inactivity (timeout period configurable by admin).

#### 3.1.3 Payment Process
**FR-3.1:** Upon checkout confirmation, the system SHALL generate a unique QR code for the transaction.

**FR-3.2:** The system SHALL integrate with MobilePay API for payment processing.

**FR-3.3:** The system SHALL support NFC payment options where applicable.

**FR-3.4:** Upon successful payment, the system SHALL:
- Display on-screen confirmation
- Deduct purchased items from inventory (if tracking enabled)
- Clear the shopping cart
- Log the transaction

**FR-3.5:** Upon payment failure or timeout, the system SHALL:
- Display failure message to customer
- NOT deduct items from inventory
- Maintain cart contents
- Note: If customer was charged but payment failed in system, customer may take items (honor system)

#### 3.1.4 System Status Display
**FR-4.1:** During non-operating hours, the kiosk SHALL display a "Closed" message.

**FR-4.2:** When in maintenance mode, the kiosk SHALL display a "Maintenance" message.

**FR-4.3:** The kiosk interface SHALL be optimized for accessibility without requiring additional scaling options.

---

### 3.2 Admin Web Portal

#### 3.2.1 Authentication & Access Control
**FR-5.1:** The system SHALL require authentication via username and password.

**FR-5.2:** The system MAY support Google OAuth authentication as an alternative login method.

**FR-5.3:** The system SHALL allow transfer of admin credentials to new administrators.

**FR-5.4:** The system SHALL support a single admin user level (no role hierarchy required).

#### 3.2.2 Product Management
**FR-6.1:** Admins SHALL be able to add new products with the following attributes:
- Product name (required)
- Price (required)
- Product image (optional, with default placeholder)
- Category/categories (required)
- Allergen information (optional)
- Hot/Cold designation (optional)
- Purchase limit per transaction (optional)

**FR-6.2:** Admins SHALL be able to edit existing product information.

**FR-6.3:** Admins SHALL be able to remove/delete products from the system.

**FR-6.4:** Admins SHALL be able to upload product images through the web portal.

**FR-6.5:** Product images SHALL be automatically formatted to fit the kiosk display requirements.

**FR-6.6:** Products without uploaded images SHALL display a default placeholder image.

#### 3.2.3 Category Management
**FR-7.1:** Admins SHALL be able to create custom product categories.

**FR-7.2:** Admins SHALL be able to edit and delete categories.

**FR-7.3:** Products MAY belong to multiple categories simultaneously.

**FR-7.4:** The system SHOULD include default categories: Drinks, Snacks, Hot Drinks, Cold Drinks.

#### 3.2.4 Inventory Management
**FR-8.1:** Admins SHALL be able to enable or disable inventory tracking system-wide.

**FR-8.2:** When inventory tracking is enabled, admins SHALL be able to:
- View current stock quantities for all products
- Manually update stock quantities (for restocking)
- Set low-stock notification thresholds per product
- Manually adjust inventory for discrepancies

**FR-8.3:** The system SHALL automatically deduct inventory quantities when purchases are completed (if tracking enabled).

**FR-8.4:** When stock reaches the configured low-stock threshold, the system SHALL send an email notification to the admin.

**FR-8.5:** Low-stock thresholds MAY be set automatically or manually per product at admin's discretion.

#### 3.2.5 Transaction History & Reporting
**FR-9.1:** The system SHALL maintain a transaction log containing:
- Transaction ID
- Date and time
- Items purchased
- Quantities
- Total amount
- Payment status

**FR-9.2:** Transaction history SHALL NOT include individual customer identification.

**FR-9.3:** The system SHALL retain transaction history indefinitely (or as long as storage permits).

**FR-9.4:** Admins SHALL be able to view transaction history through the web portal.

#### 3.2.6 Statistics & Analytics
**FR-10.1:** The system SHALL display statistics showing:
- Most popular products (by quantity sold)
- Revenue by time period (daily, weekly, monthly, custom date range)
- Total revenue over selected period
- Number of transactions
- Average transaction value

**FR-10.2:** Admins SHALL be able to export statistics and transaction data in CSV format.

**FR-10.3:** The system MAY support JSON format export as an alternative.

#### 3.2.7 System Configuration
**FR-11.1:** Admins SHALL be able to configure:
- Operating hours (when kiosk is available)
- Shopping cart timeout duration
- Email address(es) for notifications
- Enable/disable inventory tracking
- Maintenance mode on/off

**FR-11.2:** Admins SHALL receive email notifications for:
- Low stock alerts
- System errors
- Payment failures

**FR-11.3:** Admins SHALL be able to view kiosk system status (online/offline indicator).

#### 3.2.8 Pricing Management
**FR-12.1:** Admins SHALL have full control over product pricing.

**FR-12.2:** The system does NOT require support for discounts, promotions, or special pricing tiers.

**FR-12.3:** The system does NOT require tax handling functionality.

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements
**NFR-1:** The kiosk interface SHALL respond to user interactions as quickly as possible (target: < 1 second for UI interactions).

**NFR-2:** The system SHALL support one concurrent user (single kiosk deployment).

**NFR-3:** Product images SHALL be optimized for fast loading on the kiosk display.

### 4.2 Reliability & Availability
**NFR-4:** The system SHALL be available during configured operating hours (default 08:00-19:00).

**NFR-5:** The system SHALL require constant internet connectivity and is NOT required to function offline.

**NFR-6:** Transaction data SHALL be persisted immediately to prevent data loss.

**NFR-7:** The system SHOULD implement automatic backups of inventory and transaction data.

### 4.3 Security Requirements
**NFR-8:** Admin authentication SHALL use secure password storage (hashed and salted).

**NFR-9:** Payment processing SHALL be handled through MobilePay API with appropriate security measures.

**NFR-10:** Admin sessions SHALL timeout after a period of inactivity.

**NFR-11:** The system does NOT require GDPR/data privacy compliance measures beyond standard security practices (no personal customer data collected).

### 4.4 Usability Requirements
**NFR-12:** The kiosk interface SHALL be intuitive for users with minimal technical expertise.

**NFR-13:** The kiosk interface SHALL be optimized for touchscreen interaction.

**NFR-14:** The admin portal SHALL be accessible from standard web browsers.

**NFR-15:** Error messages SHALL be clear and actionable.

### 4.5 Maintainability Requirements
**NFR-16:** The system SHALL implement logging for troubleshooting purposes.

**NFR-17:** The system SHALL provide clear error logs accessible to administrators.

**NFR-18:** The codebase SHALL follow standard coding conventions for maintainability.

### 4.6 Scalability
**NFR-19:** The system is designed for a single kiosk deployment and does NOT require multi-kiosk scalability.

**NFR-20:** The system SHOULD be designed to potentially integrate card payment services in the future.

---

## 5. External Interface Requirements

### 5.1 User Interfaces

#### 5.1.1 Kiosk Interface
- Touchscreen-optimized grid layout
- Product cards with images, names, prices
- Category filter buttons/tabs
- Shopping cart view with edit capabilities
- Checkout screen with QR code display
- Payment confirmation/failure screens
- Closed/maintenance status screens

#### 5.1.2 Admin Web Portal
- Login page
- Dashboard with key metrics and system status
- Product management interface (add/edit/delete)
- Category management interface
- Inventory management interface
- Statistics and reporting interface
- System configuration settings
- Transaction history viewer
- Export functionality

### 5.2 Hardware Interfaces
- Touchscreen tablet or display device
- Network interface for internet connectivity
- QR code display capability
- NFC reader (if applicable for NFC payments)

### 5.3 Software Interfaces

#### 5.3.1 MobilePay API
- **Purpose:** Payment processing
- **Integration:** QR code generation and payment verification
- **Requirements:** Merchant API access (already available)
- **Responsibilities:**
  - Transaction authorization
  - Payment confirmation/failure handling
  - QR code expiration management
  - Duplicate transaction prevention

#### 5.3.2 Email Service
- **Purpose:** Admin notifications
- **Requirements:** SMTP or email service API
- **Notifications:**
  - Low stock alerts
  - System errors
  - Payment failures

#### 5.3.3 Authentication Service (Optional)
- **Purpose:** Google OAuth integration
- **Requirements:** Google OAuth 2.0 API
- **Usage:** Alternative admin login method

### 5.4 Communication Interfaces
- HTTPS for secure web communications
- RESTful API between kiosk and backend
- WebSocket connections (optional, for real-time updates)

---

## 6. System Features Priority

### 6.1 High Priority (Must Have)
- Product display and browsing
- Shopping cart functionality
- MobilePay payment integration
- Basic inventory management (with enable/disable option)
- Admin authentication and product management
- Transaction logging
- Basic statistics (revenue, popular products)

### 6.2 Medium Priority (Should Have)
- Category management
- Allergen information display
- Low stock notifications
- CSV export functionality
- Manual inventory adjustment
- Maintenance mode
- Cart timeout configuration

### 6.3 Low Priority (Nice to Have)
- JSON export functionality
- Google OAuth authentication
- Advanced analytics
- Automatic low-stock threshold setting

---

## 7. Use Cases

### 7.1 Customer Purchase Flow
1. Customer approaches kiosk
2. Customer browses products (optionally filters by category)
3. Customer views product details and allergen information
4. Customer adds items to cart
5. Customer reviews cart and edits if needed
6. Customer proceeds to checkout
7. System generates QR code
8. Customer scans QR code with MobilePay
9. Customer completes payment
10. System confirms payment and updates inventory
11. Customer retrieves items from cabinet

**Alternate Flow - Payment Failure:**
- At step 9, payment fails or times out
- System displays error message
- Cart is retained
- Customer can retry or cancel

**Alternate Flow - Out of Stock:**
- At step 4, product shows as out of stock
- Customer confirms item is visible in cabinet
- Customer can proceed with purchase

### 7.2 Admin Inventory Management
1. Admin logs into web portal
2. Admin navigates to inventory management
3. Admin views current stock levels
4. Admin updates quantities after restocking
5. Admin sets low-stock thresholds
6. System saves changes
7. System sends notifications when stock is low

### 7.3 Admin Product Addition
1. Admin logs into web portal
2. Admin navigates to product management
3. Admin clicks "Add New Product"
4. Admin enters product details (name, price, category, etc.)
5. Admin uploads product image (optional)
6. Admin sets purchase limit (optional)
7. Admin saves product
8. Product becomes available on kiosk immediately

---

## 8. Data Requirements

### 8.1 Data Entities

#### 8.1.1 Product
- ProductID (unique identifier)
- Name
- Price
- ImageURL (or default placeholder)
- Categories (array)
- AllergenInfo (text)
- IsHot (boolean)
- PurchaseLimit (integer, optional)
- StockQuantity (integer, nullable if tracking disabled)
- LowStockThreshold (integer)
- IsActive (boolean)

#### 8.1.2 Category
- CategoryID (unique identifier)
- CategoryName
- DisplayOrder (integer)

#### 8.1.3 Transaction
- TransactionID (unique identifier)
- Timestamp
- TotalAmount
- PaymentStatus (pending/completed/failed)
- Items (array of purchased items with quantities)

#### 8.1.4 TransactionItem
- TransactionID (foreign key)
- ProductID (foreign key)
- ProductName (snapshot)
- Quantity
- PriceAtPurchase (snapshot)

#### 8.1.5 SystemConfiguration
- OperatingHoursStart
- OperatingHoursEnd
- CartTimeoutMinutes
- InventoryTrackingEnabled (boolean)
- MaintenanceModeEnabled (boolean)
- AdminNotificationEmails (array)

#### 8.1.6 Admin
- AdminID (unique identifier)
- Username
- PasswordHash
- Email
- LastLogin

### 8.2 Data Storage
- Transaction history retained indefinitely
- Automatic backups recommended
- Data persistence required for inventory and configuration

---

## 9. Assumptions and Dependencies

### 9.1 Assumptions
- MobilePay merchant account and API access are already available
- Students will act honestly in the trust-based system
- Network connectivity is reliable during operating hours
- A single administrator is sufficient for management
- Product images will be provided in web-compatible formats

### 9.2 Dependencies
- MobilePay API availability and reliability
- Email service for notifications
- Internet connectivity
- Tablet/touchscreen hardware availability
- Physical snack cabinet in student lounge

---

## 10. Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| MobilePay API downtime | High | Low | Display clear error messages; consider fallback payment method in future |
| Internet connectivity loss | High | Medium | Display "service unavailable" message; document offline procedures |
| Inventory discrepancy (theft/honor system) | Medium | Medium | Provide manual adjustment tools; regular admin audits |
| Cart timeout too short/long | Low | Medium | Make timeout configurable by admin |
| Payment charged but system doesn't record | High | Low | Implement transaction logging before inventory update; MobilePay handles duplicates |
| Low stock not noticed by admin | Medium | Low | Automatic email notifications with configurable thresholds |

---

## 11. Future Enhancements (Out of Scope for v1.0)
- Card payment integration
- Multiple kiosk support
- Customer loyalty programs
- Automatic restocking suggestions based on sales patterns
- Mobile app for admins
- Real-time sales dashboard
- Integration with accounting systems
- Barcode scanning for inventory management

---

## 12. Acceptance Criteria

The system will be considered complete when:

1. ✅ Customers can browse products by category on the kiosk
2. ✅ Customers can add multiple items to a cart with running total
3. ✅ Customers can complete purchases using MobilePay via QR code
4. ✅ Payment confirmations and failures are clearly displayed
5. ✅ Admins can log in securely to the web portal
6. ✅ Admins can add, edit, and remove products with images
7. ✅ Admins can enable/disable inventory tracking
8. ✅ Admins can manually update inventory quantities
9. ✅ Admins can view statistics (popular products, revenue by period)
10. ✅ Admins can export transaction data to CSV
11. ✅ Admins receive email notifications for low stock
12. ✅ System displays "Closed" status outside operating hours
13. ✅ System enforces per-item purchase limits
14. ✅ Cart automatically clears after 5 minutes of inactivity
15. ✅ Out-of-stock items are clearly marked (when tracking enabled)

---

## 13. Glossary

- **Trust-based system:** A system where customers are expected to pay for items they take, without physical enforcement mechanisms
- **Kiosk:** A self-service terminal for customer interaction
- **Admin Portal:** Web-based interface for system administration
- **QR Code:** Quick Response code for payment initiation
- **MobilePay:** Nordic mobile payment solution
- **NFC:** Near Field Communication for contactless payments
- **Inventory tracking:** Optional system feature to monitor stock quantities
- **Low stock threshold:** Configurable quantity that triggers admin notification

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-06 | Requirements Engineering Team | Initial requirements specification |

---

**Document Status:** DRAFT - Ready for Review  
**Next Steps:** Review with stakeholders, obtain approval, begin technical design phase
