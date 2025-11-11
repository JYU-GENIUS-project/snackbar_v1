# Requirements Clarification Document
## Self-Service Snack Bar Kiosk System - SRS Review

**Project:** snackbar  
**Version:** 1.0 Clarifications  
**Date:** 2025-11-10  
**Reviewed By:** Requirements Analysis Team  
**Status:** REQUIRES STAKEHOLDER DECISION

---

## Executive Summary

This document identifies **27 ambiguous/vague terms** and **7 potential contradictions** found in the Software Requirements Specification v1.0. Each item requires stakeholder clarification before development begins.

**Priority Breakdown:**
- 🔴 **HIGH Priority (Must Resolve):** 8 items
- 🟡 **MEDIUM Priority (Should Resolve):** 12 items  
- 🟢 **LOW Priority (Nice to Resolve):** 7 items

---

## Part 1: Ambiguous and Vague Terms

### 1.1 Performance & Response Time

#### 🔴 Issue #1.1: "As quickly as possible" (NFR-1)
**Location:** Section 4.1, NFR-1  
**Current Text:** "The kiosk interface SHALL respond to user interactions as quickly as possible (target: < 1 second for UI interactions)."

**Problem:**
- "As quickly as possible" is unmeasurable
- "< 1 second" is better but still broad - which interactions?
- No specification for different types of interactions

**Proposed Resolution:**
```
NFR-1.1: Page transitions SHALL complete within 500ms
NFR-1.2: Filter/category changes SHALL update display within 300ms
NFR-1.3: Cart operations (add/remove/edit) SHALL reflect within 200ms
NFR-1.4: Product grid initial load SHALL complete within 2 seconds
NFR-1.5: QR code generation SHALL complete within 1 second
```

**Question for Stakeholders:**
- Are these target response times acceptable for the tablet hardware you'll be using?
- What is the acceptable maximum delay for cart updates vs. page loads?

---

#### 🟢 Issue #1.2: "Fast loading" (NFR-3)
**Location:** Section 4.1, NFR-3  
**Current Text:** "Product images SHALL be optimized for fast loading on the kiosk display."

**Problem:**
- "Fast" is subjective
- No specification for image size limits or optimization method

**Proposed Resolution:**
```
NFR-3: Product images SHALL be:
- Resized to maximum 800x600px (or display resolution)
- Compressed to < 200KB per image
- Served in WebP format (with JPEG fallback)
- Lazy-loaded as user scrolls
- Cached locally for 24 hours
```

**Question for Stakeholders:**
- What is the expected network speed at the kiosk location?
- What is the tablet screen resolution?

---

### 1.2 User Experience Terms

#### 🟡 Issue #2.1: "Intuitive" (NFR-12)
**Location:** Section 4.4, NFR-12  
**Current Text:** "The kiosk interface SHALL be intuitive for users with minimal technical expertise."

**Problem:**
- "Intuitive" is subjective and unmeasurable
- No objective success criteria

**Proposed Resolution:**
```
NFR-12: The kiosk interface SHALL be usable such that:
- 90% of first-time users can complete a purchase without assistance within 60 seconds
- No more than 2 screens needed to go from product selection to payment
- All primary actions visible without scrolling on home screen
- Task success rate > 95% in usability testing (n=10 test users)
```

**Question for Stakeholders:**
- Can you conduct basic usability testing with 5-10 students before launch?
- What is an acceptable time for a first-time user to complete purchase?

---

#### 🟡 Issue #2.2: "Clear" messages/displays (multiple locations)
**Locations:** FR-3.4, FR-3.5, NFR-15, Issue #3  
**Current Text:** "Display clear on-screen confirmation", "clear error/failure message", "Error messages SHALL be clear"

**Problem:**
- "Clear" is subjective
- No specification for message presentation

**Proposed Resolution:**
```
NFR-15: Error and confirmation messages SHALL:
- Use minimum 18px font size (24px for headings)
- Display for minimum 3 seconds (dismissible after 2 seconds)
- Use color coding (green=success, red=error, yellow=warning)
- Meet WCAG AA contrast ratio (4.5:1 for normal text)
- Use plain language (no technical jargon)
- Include actionable next steps
```

**Example Messages:**
- Success: "✅ Payment Complete! You can now take your items."
- Error: "❌ Payment Failed. Please try again or contact support at [email]."
- Out of stock: "⚠️ This item shows as out of stock. Can you see it in the cabinet? [Yes, I see it] [No, go back]"

**Question for Stakeholders:**
- Do you have brand color guidelines for success/error/warning states?
- What contact information should be displayed for payment issues?

---

#### 🟢 Issue #2.3: "Large enough for easy interaction" (FR-1 Technical Notes)
**Location:** Issue #1 Technical Notes  
**Current Text:** "Touch targets are large enough for easy interaction"

**Problem:**
- "Large enough" and "easy" are vague
- Mentioned "minimum 44px" only once, not consistently

**Proposed Resolution:**
```
NFR-13.1: All interactive elements (buttons, links, input fields) SHALL be:
- Minimum 44x44px touch target (per Apple/Android guidelines)
- 8px minimum spacing between adjacent touch targets
- Visual feedback on touch (ripple effect, color change)
```

**Question for Stakeholders:**
- None - this follows industry standard HIG (Human Interface Guidelines)

---

#### 🟡 Issue #2.4: "User-friendly date range picker" (Issue #6 Technical Notes)
**Location:** Issue #6 Technical Notes  
**Current Text:** "Date range picker should be user-friendly"

**Problem:**
- "User-friendly" is subjective

**Proposed Resolution:**
```
Statistics date range selector SHALL:
- Provide preset options (Today, This Week, This Month, Last 30 Days)
- Support custom date range with visual calendar picker
- Default to "Last 7 Days"
- Maximum 3 clicks/taps to select any date range
- Display selected range clearly (e.g., "Jan 1, 2025 - Jan 31, 2025")
```

**Question for Stakeholders:**
- What date ranges do you most commonly want to analyze?

---

### 1.3 Data Retention & Storage

#### 🔴 Issue #3.1: "Indefinitely" / "As long as possible" (FR-9.3)
**Location:** Section 3.2.5, FR-9.3, Section 8.2  
**Current Text:** "The system SHALL retain transaction history indefinitely (or as long as storage permits)."

**Problem:**
- "Indefinitely" is unrealistic and legally problematic
- No storage management strategy
- "Or as long as storage permits" creates ambiguity

**Proposed Resolution:**
```
FR-9.3: Transaction data retention:
- Active transaction history: Minimum 3 years from transaction date
- After 3 years: Data MAY be archived to cold storage or deleted at admin discretion
- System SHALL alert admin when database size reaches 80% capacity
- System SHALL provide archive/export function before deletion
- Archived data SHALL remain exportable in CSV format
```

**Question for Stakeholders:**
- Are there any legal/tax requirements for how long you must retain transaction records?
- What is your expected storage budget/capacity?
- Do you anticipate needing data older than 3 years?

---

#### 🟢 Issue #3.2: "Large transaction datasets" (Issue #6 Technical Notes)
**Location:** Issue #6 Technical Notes  
**Current Text:** "Ensure efficient queries for large transaction datasets"

**Problem:**
- No definition of "large"
- No performance baseline

**Proposed Resolution:**
```
NFR-Statistics: Statistics queries SHALL:
- Return results within 2 seconds for up to 10,000 transactions
- Support pagination (50 transactions per page) for transaction history
- Use database indexing on timestamp, product_id, transaction_status
- Warn admin if custom date range exceeds 1 year of data
```

**Expected Scale:**
- Estimated 50 transactions/day × 250 operating days/year = 12,500 transactions/year

**Question for Stakeholders:**
- How many students use the lounge daily?
- What's your expected number of transactions per day/month?

---

### 1.4 System Availability & Reliability

#### 🟡 Issue #4.1: "Reliable" email delivery (NFR-5, Issue #5)
**Location:** Section 4.2, Issue #5  
**Current Text:** "Emails sent reliably through SMTP or email service API"

**Problem:**
- "Reliable" is not quantified
- No SLA defined

**Proposed Resolution:**
```
NFR-Email: Email notification system SHALL:
- Successfully deliver 95% of notifications within 5 minutes
- Retry failed sends up to 3 times (exponential backoff: 1min, 5min, 15min)
- Log all notification attempts (success/failure) with timestamps
- Alert admin via alternate channel if email service is down > 1 hour
```

**Question for Stakeholders:**
- Is email the only notification method needed, or should we support SMS/push notifications in future?
- How critical is it that low-stock alerts arrive immediately vs. within 1 hour?

---

#### 🟡 Issue #4.2: "Automatic backups recommended" (NFR-7)
**Location:** Section 4.2, NFR-7  
**Current Text:** "The system SHOULD implement automatic backups of inventory and transaction data."

**Problem:**
- "SHOULD" is weak (not mandatory)
- "Recommended" means it might not happen
- No backup frequency or retention specified

**Proposed Resolution:**
```
NFR-7: The system SHALL implement automatic backups:
- Daily full backup at 02:00 (during non-operating hours)
- Retain last 30 daily backups
- Weekly backup retained for 12 weeks
- Backup storage separate from primary database
- Automated backup verification/integrity check
- Admin notified if backup fails
```

**Question for Stakeholders:**
- Do you have existing backup infrastructure we should integrate with?
- Who is responsible for monitoring backup health?

---

#### 🟡 Issue #4.3: "Period of inactivity" for session timeout (NFR-10)
**Location:** Section 4.3, NFR-10  
**Current Text:** "Admin sessions SHALL timeout after a period of inactivity."

**Problem:**
- No specific duration

**Proposed Resolution:**
```
NFR-10: Admin sessions SHALL:
- Timeout after 30 minutes of inactivity
- Display warning 2 minutes before timeout
- Require re-authentication after timeout
- Allow "Remember this device" option for 30 days (optional)
```

**Question for Stakeholders:**
- Is 30 minutes acceptable, or do you need shorter/longer?
- Should there be different timeouts for different admin actions (e.g., viewing vs. editing)?

---

### 1.5 Image & File Handling

#### 🟡 Issue #5.1: "Automatically formatted to fit" (FR-6.5)
**Location:** Section 3.2.2, FR-6.5  
**Current Text:** "Product images SHALL be automatically formatted to fit the kiosk display requirements."

**Problem:**
- Vague "formatted to fit" process
- No specifications for sizing, cropping, aspect ratio

**Proposed Resolution:**
```
FR-6.5: Uploaded product images SHALL be processed as follows:
- Resized to 800x800px (square aspect ratio)
- Center-cropped if aspect ratio doesn't match
- Compressed to < 200KB file size
- Converted to WebP format (JPEG fallback for older browsers)
- Original image backed up for future re-processing
- Admin shown preview before confirming upload
```

**Question for Stakeholders:**
- Do you prefer square product images (1:1) or portrait/landscape?
- Should admins be able to manually crop images?

---

#### 🟡 Issue #5.2: "Common image formats" (FR-6.3)
**Location:** Section 3.2.2, Issue #4  
**Current Text:** "Support for common image formats (JPEG, PNG, etc.)"

**Problem:**
- "Etc." is vague
- No size limits mentioned

**Proposed Resolution:**
```
FR-6.4: Image upload SHALL:
- Accept formats: JPEG, PNG, WebP, GIF (non-animated only)
- Maximum file size: 10MB per upload
- Reject executable files, SVG, or unsupported formats
- Scan uploads for malware (if security policy requires)
- Display clear error if format/size rejected
```

**Question for Stakeholders:**
- Do you need animated GIF support?
- Any security/malware scanning requirements?

---

### 1.6 Notification Thresholds

#### 🟢 Issue #6.1: Low-stock threshold defaults (FR-8.4, FR-8.5)
**Location:** Section 3.2.4, Issue #5  
**Current Text:** "Low-stock thresholds MAY be set automatically or manually"

**Problem:**
- No default threshold suggested
- Unclear what "automatically" means

**Proposed Resolution:**
```
FR-8.4: Low-stock notification thresholds:
- Default threshold: 5 units (applied to all new products)
- Admin can override per product (range: 1-99)
- Notification sent once when stock reaches threshold
- No repeat notification until stock is replenished above threshold
```

**Clarification on "Automatic":**
- Not AI-based prediction
- Simply means: Use default value of 5 unless admin manually changes it

**Question for Stakeholders:**
- Is a default of 5 units reasonable for most products?
- Should different categories have different defaults (e.g., drinks=10, snacks=5)?

---

### 1.7 Validation & Input Constraints

#### 🟡 Issue #7.1: Product price limits (FR-6.1)
**Location:** Section 3.2.2, FR-6.1  
**Current Text:** "Price (required)"

**Problem:**
- No minimum/maximum price validation
- No decimal place specification

**Proposed Resolution:**
```
FR-6.1: Product price SHALL:
- Range: 0.01 to 999.99 (currency unit, e.g., DKK/EUR)
- Support 2 decimal places only
- Display validation error if out of range
- Not allow negative values or zero
```

**Question for Stakeholders:**
- What currency are you using?
- What's the most expensive item you'd sell? (to confirm max price)

---

#### 🟡 Issue #7.2: Purchase limit constraints (FR-6.1, FR-2.3)
**Location:** Section 3.2.2, FR-6.1  
**Current Text:** "Purchase limit per transaction (optional)"

**Problem:**
- No range specified
- What happens if no limit is set?

**Proposed Resolution:**
```
FR-6.1 & FR-2.3: Purchase limits:
- Default: No limit (customers can buy any quantity)
- If set, range: 1-50 items per transaction
- Admin can set limit to "1" for special/limited items
- Display message: "Maximum X per purchase" on product card
```

**Question for Stakeholders:**
- Are there any items you'd want to limit to 1-2 per purchase?
- Should there be a global cart size limit (e.g., max 20 total items)?

---

## Part 2: Contradictions and Conflicts

### 2.1 Inventory Logic Contradictions

#### 🔴 Issue #C1: Out-of-Stock Purchase + Inventory Deduction
**Locations:** FR-1.6, FR-3.4, FR-8.3  

**Contradiction:**
- FR-1.6: "When inventory tracking is enabled and a product is out of stock, the system SHALL... Allow purchase after customer confirms"
- FR-3.4: "Upon successful payment... Deduct purchased items from inventory (if tracking enabled)"
- FR-8.3: "The system SHALL automatically deduct inventory quantities when purchases are completed"

**Problem:**
If a product has 0 stock and customer purchases 1 unit:
- Does inventory become -1?
- Or do we skip deduction for confirmed out-of-stock purchases?
- How does admin know about discrepancies?

**Proposed Resolution (Choose One):**

**Option A: Allow Negative Inventory (Recommended)**
```
FR-3.4.1: Inventory deduction SHALL occur even if stock is zero
FR-3.4.2: Stock MAY go negative to indicate discrepancy
FR-8.2.1: Admin can view products with negative stock in "Discrepancy Report"
FR-8.2.2: Negative stock displays as "Out of Stock (-3 discrepancy)" in admin portal
```

**Option B: Skip Deduction for Confirmed Out-of-Stock**
```
FR-3.4.1: If purchase was confirmed as "out of stock but visible", do NOT deduct inventory
FR-9.1.1: Transaction log SHALL flag these as "OUT_OF_STOCK_OVERRIDE"
FR-8.2.1: Admin can reconcile these transactions manually
```

**Option C: Prevent Out-of-Stock Purchases**
```
FR-1.6: Remove confirmation option
FR-1.6.1: Out-of-stock products cannot be added to cart
FR-1.6.2: Display "Out of Stock - Ask admin to restock"
```

**Question for Stakeholders:**
- How do you want to handle discrepancies between physical stock and system stock?
- Would you prefer the system to track negative inventory for audit purposes?

---

#### 🟡 Issue #C2: Inventory Tracking Disabled Behavior
**Locations:** FR-8.1, FR-8.4, Issue #4, Issue #5  

**Contradiction:**
- FR-8.1: "Admins SHALL be able to enable or disable inventory tracking"
- FR-8.4: "When stock reaches threshold... send email notification"
- Issue #5: Low-stock notifications described in detail

**Problem:**
When inventory tracking is disabled:
- Can admins still set low-stock thresholds? (Doesn't make sense)
- Do low-stock email notifications still send? (Shouldn't)
- What does admin portal show in inventory section?

**Proposed Resolution:**
```
FR-8.1.1: When inventory tracking is DISABLED:
- Stock quantity fields hidden in admin portal
- Low-stock threshold settings hidden
- No inventory deductions occur on purchases
- No low-stock notifications sent
- Admin portal shows "Inventory Tracking: OFF" banner

FR-8.1.2: When inventory tracking is ENABLED:
- All inventory features active
- Admin can view/edit stock quantities
- Automatic deductions occur
- Low-stock notifications active
```

**Question for Stakeholders:**
- Under what circumstances would you disable inventory tracking?
- Should we remember the last stock quantities if you re-enable tracking?

---

### 2.2 Admin User Management

#### 🔴 Issue #C3: "Transfer admin credentials" vs "Single admin user"
**Locations:** FR-5.3, FR-5.4  

**Contradiction:**
- FR-5.3: "The system SHALL allow transfer of admin credentials to new administrators"
- FR-5.4: "The system SHALL support a single admin user level"

**Problem:**
"Transfer credentials" is ambiguous:
- Does this mean change the username/password for one account?
- Or support multiple admin accounts with same permission level?
- Or delete old admin and create new admin?

**Proposed Resolution (Choose One):**

**Option A: Single Admin Account with Editable Credentials**
```
FR-5.3: The system SHALL support ONE admin account:
- Admin can change username (email)
- Admin can change password
- Admin can update notification email address
- No support for multiple concurrent admin logins
```

**Option B: Multiple Admin Accounts, Same Permission Level**
```
FR-5.3: The system SHALL support multiple admin accounts:
- All admins have identical permissions (no roles/hierarchy)
- Primary admin can create/delete other admin accounts
- Each admin has unique username and password
- Action logs show which admin made changes
```

**Question for Stakeholders:**
- Will only one person manage the system, or might you need 2-3 people with admin access?
- Do you need to know which admin made specific changes (audit trail)?

---

### 2.3 Feature Priority Conflicts

#### 🟢 Issue #C4: Cart Timeout Configurability
**Locations:** FR-2.5, FR-11.1, Issue #2  

**Inconsistency:**
- FR-2.5: "Cart automatically clears after 5 minutes"
- FR-11.1: "Shopping cart timeout duration" configurable
- Issue #2: "Timeout period is configurable by admin (optional feature)"

**Problem:**
- Is configurability required or optional?
- Should v1.0 have fixed 5-minute timeout?

**Proposed Resolution:**
```
Version 1.0 (Must Have):
- FR-2.5: Fixed 5-minute timeout (hardcoded)

Version 1.1 (Nice to Have):
- FR-11.1: Admin can configure timeout (range: 1-10 minutes)
```

**Question for Stakeholders:**
- Is 5 minutes acceptable for initial launch?
- Can timeout configuration wait for a future update?

---

#### 🟢 Issue #C5: JSON Export Format
**Locations:** FR-10.3, Section 6.3, Issue #6  

**Inconsistency:**
- FR-10.3: "The system MAY support JSON format export"
- Section 6.3: "Low Priority (Nice to Have) - JSON export functionality"
- Issue #6: "JSON export format supported (optional/nice-to-have)"

**Problem:**
- Mentioned multiple times as optional, but inconsistently
- Should we commit to v1.0 or defer to v1.1?

**Proposed Resolution:**
```
Version 1.0:
- CSV export only (required)

Version 1.1:
- Add JSON export (nice to have)
```

**Question for Stakeholders:**
- Do you have any tools that specifically need JSON format in v1.0?
- Or is CSV sufficient for initial launch?

---

### 2.4 System Status & Operating Hours

#### 🟡 Issue #C6: Maintenance Mode vs Operating Hours
**Locations:** FR-4.1, FR-4.2, FR-11.1  

**Potential Conflict:**
- FR-4.1: "During non-operating hours, kiosk displays 'Closed' message"
- FR-4.2: "When in maintenance mode, kiosk displays 'Maintenance' message"
- FR-11.1: Both are configurable

**Problem:**
- What if admin enables maintenance mode during operating hours?
- Which status takes precedence?
- Can maintenance mode override operating hours?

**Proposed Resolution:**
```
FR-4.1 & FR-4.2: Status priority (highest to lowest):
1. Maintenance Mode - Overrides all other statuses
   - Message: "🔧 System Under Maintenance - Check back soon"
2. Outside Operating Hours
   - Message: "🔒 Closed - Open 08:00-19:00"
3. Normal Operation
   - Show product grid

Admin can enable maintenance mode at any time (even during operating hours).
```

**Question for Stakeholders:**
- Should admins be able to schedule maintenance mode in advance?
- Should kiosk show estimated time when maintenance will end?

---

### 2.5 Payment Edge Cases

#### 🔴 Issue #C7: Payment Failure + Customer Charged
**Locations:** FR-3.5, Section 10 (Risks), Trust-based system  

**Ambiguity:**
- FR-3.5: "If customer was charged but payment failed in system, customer may take items (honor system)"

**Problem:**
- This creates untracked inventory discrepancy
- How does admin know this happened?
- How is this reconciled in reports?

**Proposed Resolution:**
```
FR-3.5.1: Payment failure handling:
- If payment times out or fails, cart retained
- Customer can retry or cancel

FR-3.5.2: Edge case - Customer charged but system shows failure:
- Display message: "Payment processor error. If you were charged, you may take your items. Contact [email] if charged incorrectly."
- Log transaction as "PAYMENT_UNCERTAIN"
- Do NOT deduct inventory automatically
- Admin can view "Uncertain Payments" report in admin portal
- Admin manually reconciles after checking payment provider logs

FR-8.2.3: Admin manual reconciliation:
- Admin can mark "PAYMENT_UNCERTAIN" transactions as confirmed/refunded
- Manually adjust inventory after reconciliation
```

**Question for Stakeholders:**
- How often do you expect MobilePay payment failures?
- Who will be responsible for reconciling uncertain payments?

---

## Part 3: Missing Specifications

### 3.1 Additional Requirements Needed

#### 🟡 Issue #M1: MobilePay API Unavailability
**Location:** Section 10 (Risks) mentions it, but no functional requirement  

**Missing Requirement:**
```
FR-3.6: MobilePay API unavailability:
- If MobilePay API is unreachable for > 30 seconds, display error:
  "Payment system temporarily unavailable. Please try again later."
- Log API downtime incidents
- Admin receives email if API down > 15 minutes
- Kiosk remains accessible for browsing (payment disabled)
```

---

#### 🟢 Issue #M2: Concurrent Admin Editing
**Location:** Not addressed  

**Missing Requirement:**
```
FR-5.5: Concurrent admin sessions:
- System allows only ONE admin logged in at a time
- OR: Use "last write wins" for conflicting edits
- OR: Lock editing when another admin is modifying same product
```

---

#### 🟡 Issue #M3: Image Upload Security
**Location:** Mentioned in review, not in original SRS  

**Missing Requirement:**
```
NFR-8.1: Image upload security:
- Validate file extensions against whitelist (.jpg, .jpeg, .png, .webp, .gif)
- Verify file content matches extension (magic number check)
- Strip EXIF metadata from uploaded images
- Reject files with embedded scripts or suspicious content
- Maximum filename length: 255 characters
```

---

## Part 4: Recommendations Summary

### Priority Actions (Before Development Starts)

#### Must Resolve (🔴 HIGH Priority)
1. **Issue #C1:** Out-of-stock inventory deduction logic → Choose Option A, B, or C
2. **Issue #3.1:** Data retention period → Define 3-year retention policy
3. **Issue #C3:** Admin user model → Single account or multiple accounts?
4. **Issue #C7:** Payment failure reconciliation → Define admin workflow
5. **Issue #1.1:** Response time targets → Confirm performance budgets

#### Should Resolve (🟡 MEDIUM Priority)
6. **Issue #2.1:** Define "intuitive" → Set usability testing criteria
7. **Issue #4.2:** Backup policy → Make mandatory with schedule
8. **Issue #C2:** Inventory disabled behavior → Clarify feature availability
9. **Issue #5.1:** Image processing → Define resize/crop behavior
10. **Issue #7.1 & 7.2:** Input validation ranges → Set min/max values

#### Nice to Resolve (🟢 LOW Priority)
11. **Issue #C4 & C5:** Defer JSON export and timeout config to v1.1
12. **Issue #3.2:** Expected transaction volume → Estimate for capacity planning
13. **Issue #6.1:** Low-stock defaults → Confirm 5-unit threshold

---

## Part 5: Stakeholder Decision Matrix

| ID | Decision Needed | Options | Recommended | Impact |
|----|----------------|---------|-------------|--------|
| C1 | Out-of-stock purchase inventory | A: Negative stock<br>B: Skip deduction<br>C: Prevent purchase | **Option A** (audit trail) | HIGH |
| C3 | Admin user model | A: Single account<br>B: Multiple accounts | **Option B** (flexibility) | HIGH |
| C7 | Payment reconciliation | Manual admin workflow | **Implement** | HIGH |
| 3.1 | Data retention | 3 years minimum | **Implement** | MEDIUM |
| 4.2 | Backup schedule | Daily at 02:00 | **Implement** | MEDIUM |
| C4 | Cart timeout config | v1.0: Fixed<br>v1.1: Configurable | **Fixed for v1.0** | LOW |

---

## Part 6: Proposed SRS Updates

### Changes to Make in SRS v1.1

**Section 3.1.2 - FR-2.5 (Cart Timeout):**
```diff
- FR-2.5: The system SHALL automatically clear the shopping cart after 5 minutes of inactivity (timeout period configurable by admin).
+ FR-2.5: The system SHALL automatically clear the shopping cart after 5 minutes of inactivity.
+ FR-2.5.1: Timeout period is fixed at 5 minutes in v1.0 (configurable in future versions).
+ FR-2.5.2: Timeout counter resets with each user interaction (touch, scroll, button press).
```

**Section 3.2.5 - FR-9.3 (Data Retention):**
```diff
- FR-9.3: The system SHALL retain transaction history indefinitely (or as long as storage permits).
+ FR-9.3: The system SHALL retain transaction history for a minimum of 3 years from transaction date.
+ FR-9.3.1: After 3 years, data MAY be archived or deleted at admin discretion.
+ FR-9.3.2: System SHALL alert admin when database reaches 80% storage capacity.
```

**Section 4.1 - NFR-1 (Performance):**
```diff
- NFR-1: The kiosk interface SHALL respond to user interactions as quickly as possible (target: < 1 second for UI interactions).
+ NFR-1: The kiosk interface SHALL meet the following performance targets:
+ NFR-1.1: Filter/category changes: < 300ms
+ NFR-1.2: Cart operations (add/remove/edit): < 200ms
+ NFR-1.3: Product grid initial load: < 2 seconds
+ NFR-1.4: QR code generation: < 1 second
```

---

## Next Steps

1. **Stakeholder Review Meeting:** Schedule session to make decisions on HIGH priority issues
2. **Update SRS:** Incorporate clarifications into SRS v1.1
3. **Create Technical Design:** Once SRS is finalized, proceed with architecture design
4. **Prototype UI:** Build mockups to validate usability assumptions

---

## Appendix: Quick Reference

### Vague Terms Found (27 total)
- Performance: "fast", "as quickly as possible", "optimized"
- UX: "intuitive", "clear", "user-friendly", "large enough", "easy"
- Data: "indefinitely", "as long as possible", "large datasets"
- System: "reliable", "recommended", "period of inactivity"
- Files: "common formats", "automatically formatted", "etc."

### Contradictions Found (7 total)
- Out-of-stock purchase inventory logic
- Inventory tracking disabled behavior
- Admin credential transfer vs single user
- Cart timeout configurability priority
- JSON export priority
- Maintenance mode vs operating hours precedence
- Payment failure edge case handling

---

**Document Status:** AWAITING STAKEHOLDER DECISIONS  
**Action Required:** Schedule clarification meeting with stakeholders  
**Target Date for SRS v1.1:** [To be determined after stakeholder meeting]
