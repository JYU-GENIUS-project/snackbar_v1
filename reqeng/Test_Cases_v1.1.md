# Test Cases for Software Requirements Specification (SRS) v1.1

## Self-Service Snack Bar Kiosk System

**Project:** snackbar  
**SRS Version:** 1.1  
**Test Cases Version:** 1.0  
**Date:** 2025-11-12  
**Prepared by:** Quality Assurance Team

---

## Document Information

This document provides comprehensive test cases for **every requirement** specified in the Software Requirements Specification v1.1. Each requirement includes:

- **Given/When/Then** acceptance criterion
- **Positive Test Case** - validates expected behavior
- **Negative/Edge Case Test Case** - validates error handling and boundary conditions

Requirements marked as **UNTESTABLE** include explanations for why they cannot be tested.

---

## Table of Contents

1. [Functional Requirements - Kiosk Interface (FR-1 to FR-4)](#1-functional-requirements---kiosk-interface)
2. [Functional Requirements - Admin Portal (FR-5 to FR-12)](#2-functional-requirements---admin-portal)
3. [Non-Functional Requirements (NFR-1 to NFR-20)](#3-non-functional-requirements)
4. [Untestable Requirements](#4-untestable-requirements)

---

## 1. Functional Requirements - Kiosk Interface

### FR-1.1: Product Grid Display

**Given/When/Then:**

- **Given** the kiosk is operational and products exist in the database
- **When** a customer views the home screen
- **Then** products SHALL be displayed in a grid layout with images

**Positive Test Case:**

```
Test ID: TC-FR-1.1-P01
Preconditions: 
  - Kiosk is online and operational
  - Database contains 12 products with valid images
  - Display resolution is 1280x800px minimum
Steps:
  1. Power on kiosk device
  2. Navigate to kiosk home screen
  3. Observe product display layout
  4. Count visible products
  5. Verify grid structure (2-3 columns)
Expected Result:
  - Products displayed in grid format (2-3 columns based on screen size)
  - All 12 products visible (with scrolling if needed)
  - Each product shows an image
  - Grid layout is touch-optimized
  - No horizontal scrolling required
Pass Criteria: All products displayed in proper grid layout
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-1.1-N01
Preconditions: 
  - Kiosk is online
  - Database contains 0 products
Steps:
  1. Clear all products from database
  2. Navigate to kiosk home screen
  3. Observe product display area
Expected Result:
  - Grid displays empty state message
  - Message displays: "No products available at this time"
  - No broken image placeholders shown
  - Kiosk remains functional and responsive
  - User can access other areas if available
Pass Criteria: Graceful handling of empty product list
```

---

### FR-1.2: Product Display Information

**Given/When/Then:**

- **Given** products are loaded on the kiosk
- **When** a customer views a product card
- **Then** each product SHALL display name (≥16px), price (≥18px bold), image (800x600px or placeholder), category indicator, and availability status

**Positive Test Case:**

```
Test ID: TC-FR-1.2-P01
Preconditions: 
  - Product exists in database:
    - Name: "Coca-Cola"
    - Price: 2.50 EUR
    - Image: cocacola.webp (800x600px)
    - Category: "Cold Drinks"
    - Stock: 10 units (Available)
    - Inventory tracking: Enabled
Steps:
  1. Navigate to kiosk home screen
  2. Locate "Coca-Cola" product card
  3. Inspect displayed information
  4. Use browser dev tools to measure font sizes
  5. Verify image dimensions
Expected Result:
  - Product name "Coca-Cola" displayed at ≥16px font size
  - Price "2.50€" displayed at ≥18px bold font
  - Product image displayed (cocacola.webp, 800x600px)
  - Category indicator shows "Cold Drinks"
  - Availability status shows "Available" or green indicator
  - All elements are clearly visible and readable
Pass Criteria: All required information displayed with correct formatting
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-1.2-N01
Preconditions: 
  - Product exists with missing optional fields:
    - Name: "Mystery Product"
    - Price: 1.00 EUR
    - Image: NULL
    - Category: NULL
    - AllergenInfo: NULL
Steps:
  1. Create product with minimal required fields only
  2. View kiosk home screen
  3. Locate the product card
  4. Observe displayed information
Expected Result:
  - Product name "Mystery Product" displayed
  - Price "1.00€" displayed correctly
  - Default placeholder image shown (not broken image icon)
  - Category shows "Uncategorized" or default category
  - No allergen section displayed (or "No allergen info")
  - Product remains selectable and functional
Pass Criteria: Graceful handling of missing optional data
```

---

### FR-1.3: Category Filtering

**Given/When/Then:**

- **Given** products are assigned to multiple categories
- **When** a customer selects a category filter
- **Then** the system SHALL display only products matching that category, with response time <300ms

**Positive Test Case:**

```
Test ID: TC-FR-1.3-P01
Preconditions: 
  - 5 products assigned to "Drinks" category only
  - 3 products assigned to "Snacks" category only
  - 2 products assigned to both "Drinks" AND "Snacks"
  - Total unique products: 10
Steps:
  1. View kiosk home screen (default: "All Products")
  2. Count total products displayed
  3. Start timer
  4. Tap "Drinks" category filter button
  5. Stop timer and record response time
  6. Count products displayed after filter
  7. Tap "Snacks" category filter button
  8. Count products displayed
  9. Tap "All Products" to reset
Expected Result:
  - "All Products": 10 products displayed
  - "Drinks" filter: 7 products displayed (5 + 2 shared)
  - "Snacks" filter: 5 products displayed (3 + 2 shared)
  - Filter change response time < 300ms (NFR-1.1)
  - Active filter button is highlighted/visually distinct
  - Products update without page reload
Pass Criteria: Correct filtering with performance <300ms
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-1.3-N01
Preconditions: 
  - Category "Hot Drinks" exists in system
  - 0 products assigned to "Hot Drinks" category
Steps:
  1. View kiosk home screen
  2. Tap "Hot Drinks" category filter
  3. Observe display
Expected Result:
  - Empty state message displayed
  - Message: "No products in this category"
  - Filter remains active ("Hot Drinks" button highlighted)
  - User can select different category or "All Products"
  - No JavaScript errors in console
  - Interface remains responsive
Pass Criteria: Graceful handling of empty category
```

---

### FR-1.4: Allergen Information Display

**Given/When/Then:**

- **Given** a product has allergen information stored
- **When** a customer views the product details
- **Then** the system SHALL display allergen information clearly

**Positive Test Case:**

```
Test ID: TC-FR-1.4-P01
Preconditions: 
  - Product "Peanut Butter Cookie" exists with:
    - AllergenInfo: "Contains peanuts, wheat, milk"
Steps:
  1. Navigate to kiosk home screen
  2. Tap on "Peanut Butter Cookie" product card
  3. View product detail screen/modal
  4. Locate allergen information section
  5. Verify text readability (font size ≥16px)
Expected Result:
  - Allergen information clearly displayed
  - Text reads: "Contains peanuts, wheat, milk"
  - Font size ≥16px (readable)
  - Section labeled "Allergen Information" or similar
  - Warning icon displayed (optional but recommended)
  - Information is prominent and easy to find
Pass Criteria: Allergen info clearly visible and readable
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-1.4-N01
Preconditions: 
  - Product "Bottled Water" exists with:
    - AllergenInfo: NULL (no allergen data)
Steps:
  1. Navigate to kiosk home screen
  2. Tap on "Bottled Water" product
  3. View product detail screen/modal
  4. Check for allergen information section
Expected Result:
  - Either no allergen section displayed, OR
  - Section displays "No allergen information available"
  - Product remains selectable and purchasable
  - No broken UI elements
  - No error messages shown
Pass Criteria: Graceful handling of missing allergen data
```

---

### FR-1.5: Inventory Tracking Disabled Warning

**Given/When/Then:**

- **Given** inventory tracking is disabled system-wide
- **When** a customer proceeds to checkout
- **Then** the system SHALL display warning: "⚠️ Inventory tracking is disabled. Please verify that items exist in the cabinet before completing payment."

**Positive Test Case:**

```
Test ID: TC-FR-1.5-P01
Preconditions: 
  - Admin has disabled inventory tracking (toggle OFF)
  - Customer cart contains 2 items: "Coca-Cola" and "Chips"
  - Total: 4.00€
Steps:
  1. Verify inventory tracking is disabled in admin portal
  2. Add "Coca-Cola" (2.50€) to cart
  3. Add "Chips" (1.50€) to cart
  4. Tap shopping cart icon
  5. Tap "Checkout" button
  6. Observe checkout screen
Expected Result:
  - Warning message prominently displayed
  - Exact text: "⚠️ Inventory tracking is disabled. Please verify that items exist in the cabinet before completing payment."
  - Warning uses yellow/orange background color
  - Warning icon (⚠️) visible
  - Customer can still proceed to payment
  - "Back to Cart" button available
  - Warning is visible for entire checkout process
Pass Criteria: Warning clearly displayed at checkout
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-1.5-N01
Preconditions: 
  - Inventory tracking is ENABLED
  - Customer cart contains items
Steps:
  1. Verify inventory tracking is enabled in admin portal
  2. Add products to cart
  3. Proceed to checkout
  4. Observe checkout screen
Expected Result:
  - Warning message NOT displayed
  - Standard checkout flow proceeds
  - No mention of inventory tracking status
  - Only payment QR code and instructions shown
Pass Criteria: No warning when inventory tracking is enabled
```

---

### FR-1.6: Out-of-Stock Product Handling

**Given/When/Then:**

- **Given** inventory tracking is enabled and a product has stock quantity ≤ 0
- **When** a customer attempts to add the product to cart
- **Then** the system SHALL display "Out of Stock" badge, grey out the product, show confirmation dialog, and allow purchase after confirmation

**Positive Test Case:**

```
Test ID: TC-FR-1.6-P01
Preconditions: 
  - Inventory tracking is enabled
  - Product "Red Bull" exists with stock quantity: 0
Steps:
  1. Navigate to kiosk home screen
  2. Locate "Red Bull" product card
  3. Observe visual indicators
  4. Tap on "Red Bull" product
  5. Read confirmation dialog text
  6. Tap "Yes, I see it" button
  7. Verify cart contents
  8. Complete purchase (optional)
Expected Result:
  - Product displays "Out of Stock" badge (red color)
  - Product card is visually greyed out/dimmed
  - Tapping product shows confirmation dialog
  - Dialog text: "This item shows as out of stock. Can you see it in the cabinet? [Yes, I see it] [No, go back]"
  - Tapping "Yes, I see it" adds product to cart
  - Cart shows item normally
  - Upon purchase, stock becomes negative (0 → -1)
  - Transaction completes successfully
Pass Criteria: Out-of-stock product can be purchased after confirmation
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-1.6-N01
Preconditions: 
  - Inventory tracking is enabled
  - Product "Energy Drink" has stock: -5 (already negative)
Steps:
  1. Navigate to kiosk home screen
  2. Locate "Energy Drink" product
  3. Tap on product to view confirmation dialog
  4. Tap "No, go back" button
  5. Check cart contents
Expected Result:
  - Product shows "Out of Stock" badge (stock is negative)
  - Confirmation dialog appears as expected
  - Tapping "No, go back" returns to product grid
  - Product NOT added to cart
  - Cart remains unchanged
  - Stock quantity remains at -5 (no change)
  - User can browse other products normally
Pass Criteria: Canceling out-of-stock purchase does not add to cart
```

---

### FR-2.1: Shopping Cart Functionality

**Given/When/Then:**

- **Given** the kiosk is operational
- **When** a customer adds multiple products
- **Then** the system SHALL provide a shopping cart where multiple items can be stored

**Positive Test Case:**

```
Test ID: TC-FR-2.1-P01
Preconditions: 
  - Kiosk is operational
  - At least 3 different products available
Steps:
  1. Add "Coca-Cola" (2.50€) to cart
  2. Verify cart badge shows "1"
  3. Add "Chips" (1.50€) to cart
  4. Verify cart badge shows "2"
  5. Add "Cookie" (1.00€) to cart
  6. Verify cart badge shows "3"
  7. Tap shopping cart icon
  8. View cart contents
Expected Result:
  - Cart displays all 3 items:
    - Coca-Cola (2.50€)
    - Chips (1.50€)
    - Cookie (1.00€)
  - Each item shown with name and thumbnail image
  - Cart icon badge shows "3"
  - Running total shows "5.00€"
  - Cart screen is accessible and functional
  - All items are editable (quantity, remove)
Pass Criteria: Multiple items successfully stored in cart
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-2.1-N01
Preconditions: 
  - Cart is currently empty
Steps:
  1. Verify cart is empty (badge shows "0" or no badge)
  2. Tap shopping cart icon
  3. Observe cart screen
Expected Result:
  - Empty cart message displayed
  - Message: "Your cart is empty"
  - "Continue Shopping" or "Browse Products" button visible
  - Checkout button is disabled or hidden
  - No error messages displayed
  - User can return to product grid
Pass Criteria: Empty cart handled gracefully
```

---

### FR-2.2: Shopping Cart Display Details

**Given/When/Then:**

- **Given** items are in the shopping cart
- **When** a customer views the cart
- **Then** the cart SHALL display: item thumbnails, names, quantities (editable via +/-), prices, subtotals, running total, remove buttons, and clear cart button

**Positive Test Case:**

```
Test ID: TC-FR-2.2-P01
Preconditions: 
  - Cart contains:
    - 2x "Coca-Cola" @ 2.50€ each = 5.00€ subtotal
    - 1x "Chips" @ 1.50€ = 1.50€ subtotal
    - Total: 6.50€
Steps:
  1. Tap shopping cart icon
  2. View cart contents
  3. Verify all displayed elements for each item
  4. Measure touch target sizes (dev tools)
  5. Verify total calculation
Expected Result:
  - Item 1: "Coca-Cola"
    - Thumbnail image displayed
    - Quantity "2" with +/- buttons (≥44x44px)
    - Price per unit "2.50€"
    - Subtotal "5.00€"
    - Remove button (≥44x44px)
  - Item 2: "Chips"
    - Thumbnail image displayed
    - Quantity "1" with +/- buttons
    - Price "1.50€"
    - Subtotal "1.50€"
    - Remove button
  - Running total prominently displayed: "Total: 6.50€"
  - "Clear Cart" button present (≥44x44px)
  - "Checkout" button present and enabled
  - All touch targets ≥44x44px (NFR-13)
Pass Criteria: All cart elements displayed correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-2.2-N01
Preconditions: 
  - Cart contains 1 item
  - Product image URL is broken/404 error
Steps:
  1. Add product with broken image URL to cart
  2. Navigate to cart view
  3. Observe item thumbnail display
Expected Result:
  - Default placeholder thumbnail displayed (not broken image icon)
  - All other information displays correctly:
    - Product name
    - Price
    - Quantity controls
    - Subtotal
    - Remove button
  - Total calculation is correct
  - Cart remains functional
  - No console errors (image load failure is handled)
Pass Criteria: Broken images handled with placeholder
```

---

### FR-2.3: Purchase Limit Enforcement

**Given/When/Then:**

- **Given** a product has a purchase limit configured (1-50)
- **When** a customer attempts to add quantity beyond the limit
- **Then** the system SHALL prevent adding additional items and display message

**Positive Test Case:**

```
Test ID: TC-FR-2.3-P01
Preconditions: 
  - Product "Red Bull" has purchase limit: 4
  - Cart is empty
Steps:
  1. Add "Red Bull" to cart (quantity starts at 1)
  2. Tap "+" button to increase quantity to 2
  3. Tap "+" button to increase quantity to 3
  4. Tap "+" button to increase quantity to 4
  5. Verify quantity and button states
Expected Result:
  - Cart shows "Red Bull" quantity: 4
  - Subtotal calculated correctly (4 × price)
  - "+" button is still enabled (AT the limit, not over)
  - "-" button is enabled
  - Remove button is enabled
Pass Criteria: Can add up to the maximum limit
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-2.3-N01
Preconditions: 
  - Product "Red Bull" has purchase limit: 4
  - Cart contains 4x "Red Bull" (at maximum limit)
Steps:
  1. View cart with 4x "Red Bull"
  2. Attempt to tap "+" button
  3. Observe button state and any messages
  4. Verify quantity remains unchanged
Expected Result:
  - "+" button is disabled (greyed out, not clickable)
  - Error message displayed: "Maximum 4 of this item per purchase"
  - Quantity remains at 4 (unchanged)
  - "-" button remains enabled
  - Remove button remains enabled
  - Other cart functions work normally
  - Checkout button remains available
Pass Criteria: Cannot exceed purchase limit
```

---

### FR-2.4: Purchase Limit Exceeded Message

**Given/When/Then:**

- **Given** a customer has reached the purchase limit for an item
- **When** they attempt to add more
- **Then** the system SHALL display "Maximum [X] of this item per purchase" and disable "+" button

**Positive Test Case:**

```
Test ID: TC-FR-2.4-P01
Preconditions: 
  - Product "Energy Drink" has purchase limit: 2
  - Cart contains 2x "Energy Drink" (at limit)
Steps:
  1. View cart with 2x "Energy Drink"
  2. Hover over (or tap) "+" button
  3. Observe button state
  4. Check for displayed message
Expected Result:
  - "+" button is visually disabled (greyed out)
  - Message appears: "Maximum 2 of this item per purchase"
  - Message is prominent (red or orange text, warning icon)
  - "-" button remains enabled (can decrease)
  - Remove button remains enabled
  - Can still add other products to cart
Pass Criteria: Clear message when limit reached
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-2.4-N01
Preconditions: 
  - Product "Bottled Water" has purchase limit: NULL (unlimited)
  - Cart contains 20x "Bottled Water"
Steps:
  1. Add 20x "Bottled Water" to cart
  2. View cart
  3. Tap "+" button multiple times
  4. Observe behavior
Expected Result:
  - Quantity increases beyond 20 (e.g., to 21, 22, 23...)
  - No limit message displayed
  - "+" button remains enabled indefinitely
  - No errors occur
  - Subtotal calculates correctly for all quantities
  - System allows unlimited purchases (NULL limit)
Pass Criteria: Unlimited purchases work when limit is NULL
```

---

### FR-2.5: Automatic Cart Clearing After 5 Minutes Inactivity

**Given/When/Then:**

- **Given** a customer has items in their cart
- **When** 5 minutes pass with no user interaction
- **Then** the system SHALL automatically clear the shopping cart

**Positive Test Case:**

```
Test ID: TC-FR-2.5-P01
Preconditions: 
  - Cart contains 3 items (Coca-Cola, Chips, Cookie)
  - Total value: 5.00€
  - Inactivity timeout is set to 5 minutes
Steps:
  1. Add items to cart
  2. Note current time (T0)
  3. Do NOT touch screen, scroll, or interact in any way
  4. Wait exactly 5 minutes
  5. Observe cart status at T0 + 5:00
  6. Check cart badge and contents
Expected Result:
  - At T0 + 5:00 (exactly 5 minutes), cart is automatically cleared
  - Screen returns to home screen/product grid
  - Cart badge shows "0" (empty)
  - All items removed from cart
  - Optional: Warning shown 30 seconds before clearing (FR-2.5.3)
  - No errors occur
Pass Criteria: Cart clears after exactly 5 minutes of inactivity
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-2.5-N01
Preconditions: 
  - Cart contains items
  - Testing timer reset behavior
Steps:
  1. Add items to cart at time T0
  2. Wait 4 minutes 50 seconds (T0 + 4:50)
  3. Tap screen once (any interaction)
  4. Wait another 4 minutes 50 seconds (T0 + 9:40 total)
  5. Tap screen again
  6. Repeat: wait 4:50, interact
  7. Verify cart status throughout
Expected Result:
  - Timer resets with each interaction
  - Cart never clears despite total elapsed time > 5 minutes
  - Cart contents remain intact after each interaction
  - System correctly tracks time since last interaction
  - Can continue this pattern indefinitely
Pass Criteria: Timer correctly resets on each interaction
```

---

### FR-2.5.1: Fixed 5-Minute Timeout (Not Configurable in v1.0)

**Given/When/Then:**

- **Given** the system is version 1.0
- **When** checking system configuration
- **Then** the cart timeout SHALL be fixed at 5 minutes (not admin-configurable)

**Positive Test Case:**

```
Test ID: TC-FR-2.5.1-P01
Preconditions: 
  - System version is 1.0
  - Admin is logged into admin portal
Steps:
  1. Log into admin portal
  2. Navigate to "System Configuration" page
  3. Look for cart timeout setting
  4. Check configuration options
Expected Result:
  - No "Cart Timeout" configuration option visible
  - No slider or input field for timeout duration
  - System documentation states "Fixed at 5 minutes in v1.0"
  - Actual timeout behavior is 5 minutes (verified in FR-2.5)
Pass Criteria: No configuration option available
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-2.5.1-N01
Preconditions: 
  - Admin attempts manual database modification
Steps:
  1. Access database directly (via admin tool)
  2. Locate SystemConfiguration table
  3. Look for CartTimeoutMinutes field (if exists)
  4. Attempt to change value from 5 to 10
  5. Restart system/reload kiosk
  6. Test actual timeout behavior on kiosk
Expected Result:
  - If field exists in database, system ignores the value
  - Actual timeout remains 5 minutes regardless of database value
  - No errors from database modification
  - System uses hardcoded 5-minute timeout
Pass Criteria: Hardcoded timeout cannot be changed
```

---

### FR-2.5.2: Inactivity Timer Reset on Any Interaction

**Given/When/Then:**

- **Given** the inactivity timer is running
- **When** a user performs any interaction (touch, scroll, button press, cart edit)
- **Then** the timer SHALL reset to 0 seconds

**Positive Test Case:**

```
Test ID: TC-FR-2.5.2-P01
Preconditions: 
  - Cart contains items
  - Timer has been running for 3 minutes
Steps:
  1. Add items to cart at T0
  2. Wait 3 minutes (T0 + 3:00) with no interaction
  3. Scroll product grid up/down
  4. Note time of scroll interaction (T1 = T0 + 3:00)
  5. Wait another 4 minutes 59 seconds (T1 + 4:59 = T0 + 7:59 total)
  6. Check cart status
Expected Result:
  - After scrolling at T1, timer resets to 0
  - Cart NOT cleared at T0 + 5:00 (original 5-minute mark)
  - Cart still contains items at T0 + 7:59
  - Cart would clear at T1 + 5:00 = T0 + 8:00 if no further interaction
Pass Criteria: Timer correctly resets on scroll interaction
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-2.5.2-N01
Preconditions: 
  - Cart contains items
  - Testing boundary of timeout window
Steps:
  1. Add items to cart at T0
  2. Wait exactly 4 minutes 59 seconds
  3. Tap screen once (T0 + 4:59)
  4. Wait exactly 4 minutes 59 seconds again
  5. Tap screen once (T0 + 9:58)
  6. Observe cart throughout
Expected Result:
  - First tap at T0 + 4:59 resets timer (1 second before timeout)
  - Second tap at T0 + 9:58 resets timer again
  - Cart never clears despite 9:58 total elapsed time
  - System correctly tracks each reset
  - No race conditions or timing bugs
Pass Criteria: Boundary timing handled correctly
```

---

### FR-2.5.3: Optional Countdown Warning (MAY Display)

**Given/When/Then:**

- **Given** the cart timeout is approaching
- **When** 30 seconds remain before clearing
- **Then** the system MAY display a countdown or warning (optional feature)

**Positive Test Case:**

```
Test ID: TC-FR-2.5.3-P01
Preconditions: 
  - Optional countdown feature is implemented
  - Cart contains items
Steps:
  1. Add items to cart at T0
  2. Wait 4 minutes 30 seconds (T0 + 4:30)
  3. Observe screen for warning message
  4. Check message content and styling
Expected Result:
  - Warning appears at 30-second mark (T0 + 4:30)
  - Message text: "Cart will clear in 30 seconds due to inactivity" or similar
  - Warning is prominent (yellow/orange banner, warning icon)
  - Optional countdown timer shows remaining seconds (30, 29, 28...)
  - User can dismiss warning or interact to reset timer
  - If user interacts, warning disappears and timer resets
Pass Criteria: Warning appears 30 seconds before timeout (if feature exists)
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-2.5.3-N01
Preconditions: 
  - Optional countdown feature is NOT implemented
  - Cart contains items
Steps:
  1. Add items to cart
  2. Wait 4 minutes 30 seconds
  3. Check for warning message
  4. Wait full 5 minutes
  5. Observe cart clearing
Expected Result:
  - No warning displayed at 4:30 mark (feature is optional)
  - Cart still clears at 5:00 mark as expected (FR-2.5)
  - No errors occur from missing feature
  - System functions normally without warning
Pass Criteria: Feature is optional; absence does not cause errors
```

---

### FR-3.1: QR Code Generation Within 1 Second

**Given/When/Then:**

- **Given** a customer has items in cart and confirms checkout
- **When** the checkout button is pressed
- **Then** the system SHALL generate a unique QR code within 1 second

**Positive Test Case:**

```
Test ID: TC-FR-3.1-P01
Preconditions: 
  - Cart contains 2 items totaling 5.00€
  - Manual confirmation service reachable (API latency <100ms)
  - Network latency is normal (<100ms)
Steps:
  1. Add items to cart (total: 5.00€)
  2. Navigate to checkout screen
  3. Start high-precision timer (stopwatch)
  4. Tap "Checkout" or "Pay Now" button
  5. Stop timer when QR code is fully visible and rendered
  6. Record elapsed time
  7. Scan QR code with standard payment app simulator to verify validity
Expected Result:
  - QR code appears within 1 second (1000ms or less)
  - QR code is unique (different from previous transactions)
  - QR code is scannable with standard payment app simulator
  - QR code contains correct payment amount (5.00€)
  - Loading indicator shown during generation (optional)
  - QR code dimensions ≥200x200px (FR-5.3 external interfaces)
Pass Criteria: QR code generated in ≤1 second and is valid
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.1-N01
Preconditions: 
  - Manual confirmation service latency artificially increased to 3 seconds
  - Cart contains items
Steps:
  1. Configure network throttling or mock API to delay 3 seconds
  2. Proceed to checkout
  3. Tap "Pay Now" button
  4. Measure time to QR code appearance
  5. Observe user feedback during wait
Expected Result:
  - Loading indicator displayed immediately
  - QR code appears after ~3 seconds (simulated service delay)
  - User sees "Generating payment..." or similar message
  - No timeout error until 30 seconds (FR-3.6)
  - Once QR appears, it is valid and functional
  - User can cancel during wait if needed
Pass Criteria: Graceful handling of slow API response
```

---

### FR-3.2: Manual Payment Confirmation Control

- **Then** the system SHALL mark the transaction as confirmed and proceed to completion

**Positive Test Case:**

```
Test ID: TC-FR-3.2-P01
Preconditions: 
  - Cart total: 3.50€
  - Manual confirmation service available
Steps:
  1. Add items to cart (total: 3.50€)
  2. Proceed to checkout
  3. Observe payment instructions and disabled "Done"/"I have paid" button until QR displayed
  4. Wait for QR code to render
  5. Simulate payment in external app (no integration required)
  6. Tap "I have paid"
  7. Observe success message
  8. Verify transaction stored as COMPLETED with confirmation metadata (timestamp, session, method)
Expected Result:
  - Confirmation button available only after QR is visible
  - Tapping button triggers immediate confirmation request to backend
  - Kiosk transitions to success state within 1 second (FR-3.4)
  - Transaction record contains confirmation timestamp, method "manual", and kiosk session ID
Pass Criteria: Manual confirmation path completes end-to-end
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.2-N01
Preconditions: 
  - Backend confirmation endpoint returns HTTP 503 (simulated outage)
  - Cart contains items
Steps:
  1. Add items to cart and open checkout screen
  2. Tap "I have paid"
  3. Observe kiosk handling of failed confirmation request
  4. Check error logs and notification queue
Expected Result:
  - Kiosk displays message: "🚫 Payment confirmation unavailable. Please contact support." (FR-3.6)
  - Transaction remains PENDING (no inventory deduction)
  - Retry option presented or guidance to try again after issue resolved
  - Failure logged with timestamp and kiosk session metadata
  - Admin notification queued after 15 minutes of continued failure (FR-3.6, FR-11.2)
Pass Criteria: Confirmation outage handled gracefully without data loss
```

---

### FR-3.3: Manual Confirmation Audit Trail

**Given/When/Then:**

- **Given** a customer confirms payment on the kiosk
- **When** the confirmation request is processed
- **Then** the system SHALL persist audit metadata for the confirmation event

**Positive Test Case:**

```
Test ID: TC-FR-3.3-P01
Preconditions: 
  - Cart total: 4.20€
  - Audit logging enabled
Steps:
  1. Complete steps from TC-FR-3.2-P01 through confirmation
  2. Query transaction record for confirmation fields (session ID, method, confirmedAt)
  3. Query audit log for matching entry
Expected Result:
  - Transaction row populated with confirmationSessionId, confirmationMethod='manual', confirmedAt timestamp
  - Audit log entry captured with action 'TRANSACTION_CONFIRMED' (or equivalent)
  - Audit log includes kiosk session identifier and total amount snapshot
Pass Criteria: Confirmation metadata persisted and auditable
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.3-N01
Preconditions: 
  - Database temporarily read-only (simulate failure to persist confirmation metadata)
Steps:
  1. Attempt manual confirmation while database in read-only mode
  2. Observe kiosk response
  3. Inspect logs for failure details
Expected Result:
  - Kiosk informs user that confirmation could not be saved and prompts retry or admin assistance
  - Transaction remains PENDING
  - Error logged with reason "confirmation_persist_failed"
  - Audit entry created noting failure event (without duplicating transaction status)
Pass Criteria: Persistence failure handled without data corruption
```

---

### FR-3.4: Successful Payment Actions

**Given/When/Then:**

- **Given** a customer has completed payment and tapped "I have paid"
- **When** the system records the manual confirmation
- **Then** the system SHALL: display success message (≥3 seconds, green, WCAG AA), show purchased items/total, deduct inventory (allowing negative stock), clear cart, log transaction as "COMPLETED"

**Positive Test Case:**

```
Test ID: TC-FR-3.4-P01
Preconditions: 
  - Cart contains: 2x "Coca-Cola" @ 2.50€ each = 5.00€ total
  - Inventory tracking is enabled
  - "Coca-Cola" current stock: 10 units
  - Manual confirmation service available
Steps:
  1. Verify initial stock: Coca-Cola = 10
  2. Complete checkout and payment via personal app
  3. Tap "I have paid" and wait for confirmation response
  4. Observe kiosk screen immediately
  5. Measure success message display duration
  6. Check color contrast (dev tools)
  7. Query database for stock and transaction after 5 seconds
Expected Result:
  - Success message appears immediately after confirmation
  - Message text: "✅ Payment Complete! You can now take your items."
  - Message visible for minimum 3 seconds (can be longer)
  - Green background/text (e.g., #28a745)
  - WCAG AA contrast ratio ≥4.5:1 verified
  - Purchased items listed: "2x Coca-Cola"
  - Total amount shown: "5.00€"
  - Stock updated in database: Coca-Cola = 10 → 8
  - Cart is empty (badge shows 0)
  - Transaction logged with status "COMPLETED"
  - Transaction includes confirmation metadata (session, method, timestamp)
  - Screen returns to home after 5 seconds (auto-reset)
Pass Criteria: All success actions execute correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.4-N01
Preconditions: 
  - Inventory tracking is enabled
  - Product "Red Bull" current stock: 0 (out of stock)
  - Cart contains: 3x "Red Bull" @ 3.00€ = 9.00€ total
  - Customer confirmed "Yes, I see it" for out-of-stock item (FR-1.6)
Steps:
  1. Verify initial stock: Red Bull = 0
  2. Complete checkout and payment
  3. Receive payment confirmation
  4. Observe success message
  5. Check stock quantity in database
Expected Result:
  - Success message displayed as normal
  - "3x Red Bull" listed in confirmation
  - Stock updated: Red Bull = 0 → -3 (negative stock allowed per FR-3.4.1)
  - Transaction logged as COMPLETED
  - Admin can view negative stock in inventory report (FR-8.2.2)
  - System allows negative inventory to track discrepancies
  - Cart clears normally
Pass Criteria: Stock goes negative correctly for out-of-stock purchases
```

---

### FR-3.4.1: Inventory Deduction Allows Negative Stock

**Given/When/Then:**

- **Given** inventory tracking is enabled
- **When** a purchase is completed for a product with stock ≤ 0
- **Then** inventory SHALL be deducted even if result is negative

**Positive Test Case:**

```
Test ID: TC-FR-3.4.1-P01
Preconditions: 
  - Inventory tracking enabled
  - Product "Chips" stock: 0
  - Customer purchases 2x "Chips"
Steps:
  1. Verify "Chips" stock = 0
  2. Customer confirms out-of-stock purchase (FR-1.6)
  3. Complete payment
  4. Query database for "Chips" stock
Expected Result:
  - Stock calculation: 0 - 2 = -2
  - Database shows "Chips" stock: -2
  - Transaction completes successfully
  - No errors from negative stock
Pass Criteria: Negative stock is allowed and stored
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.4.1-N01
Preconditions: 
  - Product "Cookie" stock: -5 (already negative)
  - Customer purchases 1x "Cookie"
Steps:
  1. Verify "Cookie" stock = -5
  2. Complete purchase of 1x Cookie
  3. Check updated stock
Expected Result:
  - Stock calculation: -5 - 1 = -6
  - Database shows "Cookie" stock: -6
  - Can go increasingly negative
  - Admin receives low-stock alert if threshold crossed
Pass Criteria: Stock can go increasingly negative
```

---

### FR-3.4.2: Negative Stock Indicates Discrepancy

**Given/When/Then:**

- **Given** inventory deduction results in negative stock
- **When** viewing inventory in admin portal
- **Then** negative stock quantities SHALL indicate discrepancy between system and physical inventory

**Positive Test Case:**

```
Test ID: TC-FR-3.4.2-P01
Preconditions: 
  - Product "Energy Drink" stock: -3
  - Admin is logged in
Steps:
  1. Log into admin portal
  2. Navigate to Inventory Management page
  3. Locate "Energy Drink" in product list
  4. Observe stock display
Expected Result:
  - Stock displays as "-3" or "Out of Stock (-3 discrepancy)"
  - Negative value highlighted in red
  - Visual indicator (warning icon) shown
  - Admin can view "Inventory Discrepancy Report" (FR-8.2.1)
  - Tooltip explains: "Negative stock indicates more items sold than were in system"
Pass Criteria: Negative stock clearly indicates discrepancy
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.4.2-N01
Preconditions: 
  - All products have stock ≥ 0
Steps:
  1. View inventory management page
  2. Check for discrepancy indicators
Expected Result:
  - No red highlights or warnings
  - All stock values shown normally
  - No discrepancy report needed
Pass Criteria: Positive stock shows no discrepancy warnings
```

---

### FR-3.4.3: Success Message Uses Green with WCAG AA Contrast

**Given/When/Then:**

- **Given** payment is successful
- **When** success message is displayed
- **Then** the system SHALL use green color meeting WCAG AA contrast ratio 4.5:1

**Positive Test Case:**

```
Test ID: TC-FR-3.4.3-P01
Preconditions: 
  - Successful payment completed
  - Success message is displayed
  - Browser dev tools available
Steps:
  1. Complete a successful payment
  2. Observe success message appearance
  3. Use browser dev tools to inspect CSS
  4. Record background color and text color values
  5. Use contrast checker tool (e.g., WebAIM Contrast Checker)
  6. Calculate contrast ratio
Expected Result:
  - Success message uses green color (e.g., #28a745 or similar)
  - Background color recorded (e.g., #28a745)
  - Text color recorded (e.g., #FFFFFF white)
  - Contrast ratio calculated: ≥4.5:1 (meets WCAG AA)
  - Text is clearly readable on green background
  - Checkmark icon (✅) visible
Pass Criteria: Green color contrast meets WCAG AA standard
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.4.3-N01
Preconditions: 
  - Testing with light green that may not meet contrast
Steps:
  1. Temporarily modify CSS to use light green (#90EE90)
  2. Display success message
  3. Check contrast ratio with white text
Expected Result:
  - Light green (#90EE90) with white text fails WCAG AA (ratio <4.5:1)
  - Production system must NOT use this color
  - Actual implementation uses darker green (#28a745 or similar)
  - This test confirms requirement is needed
Pass Criteria: Confirms need for high-contrast green
```

---

### FR-3.5: Payment Failure Actions

**Given/When/Then:**

- **Given** payment fails or times out
- **When** failure is detected
- **Then** the system SHALL: display failure message (≥5 seconds), NOT deduct inventory, maintain cart, log as "FAILED", allow retry/cancel

**Positive Test Case:**

```
Test ID: TC-FR-3.5-P01
Preconditions: 
  - Cart contains items (total: 4.50€)
  - Manual confirmation service configured to reject confirmation (HTTP 409)
  - Initial stock values recorded
Steps:
  1. Record initial stock for all cart items
  2. Proceed to checkout
  3. Customer uses personal payment app but chooses not to finalize
  4. Tap "I have paid" to trigger confirmation failure response
  5. Observe kiosk response
  6. Measure message display duration
  7. Check stock values in database
  8. Check transaction log
Expected Result:
  - Failure message appears: "❌ Payment Failed. Please try again or contact support at [admin email]."
  - Message visible for minimum 5 seconds
  - Red background/text (#dc3545 or similar)
  - Stock quantities UNCHANGED (no deduction)
  - Cart still contains all original items
  - Transaction logged with status "FAILED"
  - Confirmation failure reason logged (e.g., "declined", "not_confirmed")
  - "Try Again" button available
  - "Cancel" button available
  - User can retry checkout
Pass Criteria: Failure handled correctly without inventory deduction
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.5-N01
Preconditions: 
  - Customer initiates checkout
  - Manual confirmation is not submitted within 60 seconds
Steps:
  1. Proceed to checkout
  2. Display manual confirmation prompt
  3. Do NOT tap "Confirm Payment"
  4. Wait with no customer action
  5. Observe kiosk after 60 seconds (timeout)
Expected Result:
  - After 60 seconds, timeout message appears (FR-3.5.1)
  - Message: "⏱️ Payment not confirmed. Please try again."
  - Manual confirmation prompt closes and returns to cart view
  - Cart maintained
  - Stock NOT deducted
  - Transaction logged as "FAILED" or "TIMEOUT"
  - User can retry or cancel
Pass Criteria: Timeout treated as failure
```

---

### FR-3.5.1: Payment Timeout Handling (60 Seconds)

**Given/When/Then:**

- **Given** the manual confirmation prompt is displayed
- **When** 60 seconds pass without customer confirmation
- **Then** the system SHALL display timeout message: "⏱️ Payment not confirmed. Please try again."

**Positive Test Case:**

```
Test ID: TC-FR-3.5.1-P01
Preconditions: 
  - Manual confirmation prompt displayed
  - Customer does not tap "Confirm Payment"
Steps:
  1. Display manual confirmation prompt
  2. Start timer
  3. Do NOT tap "Confirm Payment"
  4. Wait exactly 60 seconds
  5. Observe prompt at 60-second mark
Expected Result:
  - At 60 seconds, timeout message appears
  - Message: "⏱️ Payment not confirmed. Please try again."
  - Manual confirmation prompt is removed/disabled
  - "Try Again" button available
  - "Cancel" button available
  - Transaction logged as "TIMEOUT" or "FAILED"
  - Cart contents preserved
Pass Criteria: Timeout occurs at exactly 60 seconds
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.5.1-N01
Preconditions: 
  - Testing boundary: manual confirmation completes at 59 seconds
Steps:
  1. Display manual confirmation prompt
  2. Wait 59 seconds
  3. Tap "Confirm Payment" at 59-second mark
  4. Observe kiosk response
Expected Result:
  - Manual confirmation accepted before timeout
  - Success message displayed (not timeout)
  - Transaction completes normally
  - No timeout message appears
  - Stock is deducted
  - Cart is cleared
Pass Criteria: Manual confirmation within 60 seconds succeeds
```

---

### FR-3.5.2: Payment Uncertain Edge Case Handling

**Given/When/Then:**

- **Given** customer was charged but system doesn't receive confirmation
- **When** this edge case occurs
- **Then** display message allowing customer to take items, log as "PAYMENT_UNCERTAIN", do NOT auto-deduct inventory, allow admin manual reconciliation

**Positive Test Case:**

```
Test ID: TC-FR-3.5.2-P01
Preconditions: 
  - Simulated confirmation audit failure after manual confirmation submitted
  - Customer taps "Confirm Payment" on kiosk
Steps:
  1. Initiate payment
  2. Submit manual confirmation on kiosk
  3. Simulate confirmation audit persistence failure (service unreachable)
  4. Observe kiosk response after timeout fallback
  5. Check transaction log
  6. Check inventory stock
Expected Result:
  - Message displayed: "⚠️ Payment processor error. If you were charged, you may take your items. Contact [admin email] if charged incorrectly."
  - Message includes admin contact email
  - Warning icon displayed
  - Transaction logged as "PAYMENT_UNCERTAIN"
  - Inventory NOT deducted automatically
  - Admin receives email notification (FR-11.2)
  - Admin can reconcile via "Uncertain Payments" report (FR-8.2.4)
Pass Criteria: Uncertain payment logged for manual reconciliation
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.5.2-N01
Preconditions: 
  - Admin reconciles uncertain payment
Steps:
  1. Admin logs into admin portal
  2. Navigates to "Uncertain Payments" report
  3. Selects transaction with status "PAYMENT_UNCERTAIN"
  4. Reviews confirmation audit trail and payment evidence
  5. Clicks "Mark as Confirmed"
  6. System deducts inventory retroactively
  7. Transaction status updated to "COMPLETED"
Expected Result:
  - Admin can view uncertain transactions
  - Can mark as "CONFIRMED" or "REFUNDED"
  - If confirmed: inventory deducted now
  - If refunded: no inventory change
  - Transaction status updated accordingly
  - Audit log records admin action
Pass Criteria: Admin can manually reconcile uncertain payments
```

---

### FR-3.6: Confirmation Service Unavailability Handling

**Given/When/Then:**

- **Given** the confirmation service is unreachable
- **When** unreachable for >30 seconds
- **Then** display error, log downtime, notify admin if >15 minutes, disable checkout but allow browsing

**Positive Test Case:**

```
Test ID: TC-FR-3.6-P01
Preconditions: 
  - Confirmation service is down/unreachable (simulated)
  - Customer attempts checkout
Steps:
  1. Simulate confirmation service downtime (network unreachable)
  2. Add items to cart
  3. Attempt to checkout
  4. Wait 30 seconds for service response
  5. Observe error message
  6. Check if browsing still works
  7. Check error logs
Expected Result:
  - After 30 seconds, error message appears
  - Message: "🚫 Payment system temporarily unavailable. Please try again later or contact [admin email]."
  - Checkout button is disabled (greyed out)
  - Kiosk remains accessible for product browsing
  - User can add items to cart
  - User cannot complete purchase
  - Downtime logged with timestamp
  - If downtime >15 minutes, admin receives email (FR-11.2)
Pass Criteria: API unavailability handled gracefully
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-3.6-N01
Preconditions: 
  - Confirmation service has been down for 16 minutes
Steps:
  1. Simulate 16-minute confirmation service downtime
  2. Check admin email inbox
  3. Review error logs
Expected Result:
  - Admin receives email notification
  - Email subject: "Confirmation Service Downtime Alert"
  - Email body includes: downtime duration, timestamp, recommended action
  - Error log contains downtime incident with timestamps
  - Kiosk continues showing error message to customers
Pass Criteria: Admin notified after 15 minutes of downtime
```

---

### FR-4.1: Closed Status During Non-Operating Hours

**Given/When/Then:**

- **Given** current time is outside operating hours
- **When** a user approaches the kiosk
- **Then** the kiosk SHALL display "Closed" message with operating hours

**Positive Test Case:**

```
Test ID: TC-FR-4.1-P01
Preconditions: 
  - Operating hours configured: 08:00 - 19:00
  - Current time is 20:30 (outside hours)
Steps:
  1. Set system time to 20:30 (or wait until after closing)
  2. View kiosk screen
  3. Verify message content
Expected Result:
  - "Closed" message displayed prominently
  - Message: "🔒 Closed - Open 08:00 to 19:00"
  - Large, readable font (≥24px)
  - Lock icon (🔒) visible
  - No product browsing available
  - No interactive elements except info display
Pass Criteria: Closed message displays correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-4.1-N01
Preconditions: 
  - Operating hours: 08:00 - 19:00
  - Current time is 07:59 (1 minute before opening)
Steps:
  1. Set system time to 07:59
  2. Observe kiosk screen
  3. Wait 1 minute (time becomes 08:00)
  4. Observe screen change
Expected Result:
  - At 07:59: "Closed" message displayed
  - At 08:00 (opening time): kiosk becomes operational
  - Product grid appears automatically
  - User can now browse and purchase
  - Transition happens automatically (no manual refresh needed)
Pass Criteria: Automatic transition at opening time
```

---

### FR-4.2: Maintenance Mode Display

**Given/When/Then:**

- **Given** maintenance mode is enabled
- **When** a user approaches the kiosk
- **Then** the kiosk SHALL display "Maintenance" message with custom text

**Positive Test Case:**

```
Test ID: TC-FR-4.2-P01
Preconditions: 
  - Admin enables maintenance mode
  - Custom message: "System upgrade in progress. Back at 15:00"
Steps:
  1. Admin logs into admin portal
  2. Navigates to System Configuration
  3. Enables "Maintenance Mode" toggle
  4. Enters custom message: "System upgrade in progress. Back at 15:00"
  5. Saves configuration
  6. View kiosk screen
Expected Result:
  - "Maintenance" message displayed
  - Message: "🔧 System Under Maintenance - Check back soon"
  - Custom message also displayed: "System upgrade in progress. Back at 15:00"
  - Wrench icon (🔧) visible
  - No product browsing available
  - No checkout functionality
  - Kiosk fully locked down
Pass Criteria: Maintenance message displays with custom text
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-4.2-N01
Preconditions: 
  - Maintenance mode enabled without custom message
Steps:
  1. Enable maintenance mode
  2. Leave custom message field empty/null
  3. View kiosk screen
Expected Result:
  - Default maintenance message displayed
  - Message: "🔧 System Under Maintenance - Check back soon"
  - No error from missing custom message
  - System handles null/empty message gracefully
Pass Criteria: Default message shown when custom message is empty
```

---

### FR-4.2.1: Maintenance Mode Precedence Over Operating Hours

**Given/When/Then:**

- **Given** maintenance mode is enabled
- **When** current time is within operating hours
- **Then** maintenance mode SHALL take precedence (kiosk shows maintenance, not operational)

**Positive Test Case:**

```
Test ID: TC-FR-4.2.1-P01
Preconditions: 
  - Operating hours: 08:00 - 19:00
  - Current time: 12:00 (within hours)
  - Maintenance mode: ENABLED
Steps:
  1. Set current time to 12:00 (noon, within operating hours)
  2. Enable maintenance mode via admin portal
  3. View kiosk screen
Expected Result:
  - Kiosk displays "Maintenance" message (not operational)
  - "🔧 System Under Maintenance - Check back soon"
  - Product grid NOT accessible despite being within hours
  - Maintenance mode overrides operating hours
Pass Criteria: Maintenance mode takes precedence
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-4.2.1-N01
Preconditions: 
  - Operating hours: 08:00 - 19:00
  - Current time: 22:00 (outside hours)
  - Maintenance mode: ENABLED
Steps:
  1. Time is 22:00 (after closing)
  2. Maintenance mode also enabled
  3. View kiosk screen
Expected Result:
  - Kiosk displays "Maintenance" message (not "Closed")
  - Maintenance takes precedence over closed status
  - Only one message shown (maintenance, not both)
Pass Criteria: Maintenance shown even when also closed
```

---

### FR-4.3: Kiosk Accessibility Requirements

**Given/When/Then:**

- **Given** the kiosk interface is displayed
- **When** a user interacts with the kiosk
- **Then** interface SHALL meet: ≥16px body text, ≥24px headings, ≥44x44px touch targets, WCAG AA contrast

**Positive Test Case:**

```
Test ID: TC-FR-4.3-P01
Preconditions: 
  - Kiosk is operational
  - Browser dev tools available for inspection
Steps:
  1. View kiosk home screen
  2. Use dev tools to inspect font sizes:
     - Body text (product names, cart items)
     - Headings (page titles, section headers)
  3. Measure touch target sizes:
     - Add to cart buttons
     - Category filters
     - Cart +/- buttons
  4. Use contrast checker on text/background combinations
Expected Result:
  - Body text: ≥16px (e.g., product names, descriptions)
  - Headings: ≥24px (e.g., "Products", "Your Cart")
  - All buttons/interactive elements: ≥44x44px
  - Contrast ratios:
     - Normal text (body): ≥4.5:1
     - Large text (headings): ≥3:1
  - All requirements met (WCAG AA compliance)
Pass Criteria: All accessibility requirements verified
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-4.3-N01
Preconditions: 
  - Testing with small screen (800x600px minimum)
Steps:
  1. Set browser viewport to 800x600px
  2. View kiosk interface
  3. Check if touch targets still meet ≥44x44px
  4. Verify font sizes haven't scaled down below minimums
Expected Result:
  - Touch targets maintain ≥44x44px even on small screen
  - Font sizes remain ≥16px (body) and ≥24px (headings)
  - Layout may adjust but accessibility maintained
  - No overlapping touch targets
  - All elements remain usable
Pass Criteria: Accessibility maintained on minimum screen size
```

---

## 2. Functional Requirements - Admin Portal

### FR-5.1: Username/Password Authentication

**Given/When/Then:**

- **Given** an admin attempts to access the admin portal
- **When** they provide username and password
- **Then** the system SHALL authenticate credentials securely

**Positive Test Case:**

```
Test ID: TC-FR-5.1-P01
Preconditions: 
  - Admin account exists:
    - Username: admin@example.com
    - Password: SecurePass123!
Steps:
  1. Navigate to admin portal login page
  2. Enter username: admin@example.com
  3. Enter password: SecurePass123!
  4. Click "Login" button
  5. Observe response
Expected Result:
  - Credentials validated against database
  - Password checked against bcrypt/Argon2 hash (NFR-8)
  - Login successful
  - Redirected to admin dashboard
  - Session created (30-minute timeout per FR-5.4)
  - LastLogin timestamp updated in database
Pass Criteria: Valid credentials allow login
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.1-N01
Preconditions: 
  - Valid username: admin@example.com
  - Incorrect password entered
Steps:
  1. Navigate to login page
  2. Enter username: admin@example.com
  3. Enter wrong password: WrongPassword123
  4. Click "Login"
  5. Observe response
Expected Result:
  - Authentication fails
  - Error message: "Invalid username or password"
  - Generic message (doesn't reveal if username or password is wrong)
  - User remains on login page
  - No session created
  - Failed login attempt logged (security)
Pass Criteria: Invalid credentials rejected
```

---

### FR-5.2: Google OAuth Authentication (Optional)

**Given/When/Then:**

- **Given** Google OAuth is configured
- **When** an admin chooses to log in with Google
- **Then** the system SHALL support Google OAuth as alternative login

**Positive Test Case:**

```
Test ID: TC-FR-5.2-P01
Preconditions: 
  - Google OAuth is configured and enabled
  - Admin has Google account: admin@example.com
Steps:
  1. Navigate to admin portal login page
  2. Click "Sign in with Google" button
  3. Redirected to Google OAuth consent screen
  4. Authorize the application
  5. Redirected back to admin portal
  6. Observe login status
Expected Result:
  - OAuth flow completes successfully
  - Admin logged in with Google account email
  - Session created
  - Redirected to dashboard
  - User record created/updated with Google ID
Pass Criteria: Google OAuth login works
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.2-N01
Preconditions: 
  - Google OAuth is NOT configured/disabled
Steps:
  1. Navigate to login page
  2. Look for Google sign-in option
Expected Result:
  - "Sign in with Google" button NOT displayed
  - Only username/password fields shown
  - No errors from missing OAuth configuration
  - Standard login still works
Pass Criteria: Missing OAuth doesn't break login page (feature is optional)
```

---

### FR-5.3: Multiple Administrator Accounts

**Given/When/Then:**

- **Given** the system supports multiple admin accounts
- **When** admins are created and managed
- **Then** the system SHALL support up to 10 admin accounts with identical permissions, unique usernames, and audit trail

**Positive Test Case:**

```
Test ID: TC-FR-5.3-P01
Preconditions: 
  - Primary admin account exists: primary@example.com
  - No other admin accounts exist
Steps:
  1. Log in as primary admin
  2. Navigate to "Admin User Management" page
  3. Click "Add Admin" button
  4. Enter details:
     - Username/Email: secondary@example.com
     - Password: SecurePass456!
  5. Click "Create Admin"
  6. Log out
  7. Log in as secondary@example.com
  8. Verify access to all admin functions
Expected Result:
  - New admin account created successfully
  - Username is unique (email format)
  - Both admins have identical permissions
  - Both can access: products, inventory, statistics, settings
  - New admin can perform all admin actions
  - Admin count: 2 of 10 maximum
Pass Criteria: Multiple admins can coexist with same permissions
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.3-N01
Preconditions: 
  - 10 admin accounts already exist (maximum)
Steps:
  1. Log in as primary admin
  2. Navigate to "Admin User Management"
  3. Attempt to click "Add Admin" button
  4. Observe behavior
Expected Result:
  - "Add Admin" button is disabled or shows warning
  - Message: "Maximum 10 admin accounts reached"
  - Cannot create 11th admin account
  - Existing admins remain functional
  - Must delete an admin to add a new one
Pass Criteria: Maximum of 10 admins enforced
```

---

### FR-5.3.1: Admin Self-Management

**Given/When/Then:**

- **Given** an admin is logged in
- **When** they access their profile settings
- **Then** any admin SHALL be able to change their own password and email address

**Positive Test Case:**

```
Test ID: TC-FR-5.3.1-P01
Preconditions: 
  - Admin logged in as admin2@example.com
  - Current password: OldPass123!
Steps:
  1. Navigate to "Profile Settings" or "My Account"
  2. Click "Change Password"
  3. Enter current password: OldPass123!
  4. Enter new password: NewPass456!
  5. Confirm new password: NewPass456!
  6. Click "Update Password"
  7. Log out
  8. Log in with new password
Expected Result:
  - Password change successful
  - Confirmation message: "Password updated successfully"
  - Must provide current password for verification
  - New password meets requirements (NFR-8.1)
  - Can log in with new password
  - Cannot log in with old password
  - Password hash updated in database
Pass Criteria: Admin can change own password
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.3.1-N01
Preconditions: 
  - Admin logged in
  - Attempts to change password with wrong current password
Steps:
  1. Navigate to profile settings
  2. Click "Change Password"
  3. Enter WRONG current password: IncorrectOld123
  4. Enter new password: NewPass456!
  5. Click "Update Password"
Expected Result:
  - Password change fails
  - Error: "Current password is incorrect"
  - Password NOT updated in database
  - Admin remains logged in with old password
  - Security measure prevents unauthorized changes
Pass Criteria: Cannot change password without knowing current password
```

---

### FR-5.3.2: Primary Admin Password Reset

**Given/When/Then:**

- **Given** the primary admin is logged in
- **When** another admin forgets their password
- **Then** the primary admin SHALL be able to reset passwords for other admin accounts

**Positive Test Case:**

```
Test ID: TC-FR-5.3.2-P01
Preconditions: 
  - Primary admin logged in
  - Secondary admin exists: admin2@example.com
Steps:
  1. Log in as primary admin
  2. Navigate to "Admin User Management"
  3. Find admin2@example.com in list
  4. Click "Reset Password" button
  5. System generates temporary password or sends reset email
  6. Log out
  7. Log in as admin2@example.com with new password
Expected Result:
  - Primary admin can initiate password reset
  - Temporary password generated or reset email sent
  - Secondary admin receives new credentials
  - Can log in with new password
  - Forced to change password on first login (recommended)
  - Action logged in audit trail (FR-5.3.3)
Pass Criteria: Primary admin can reset other admin passwords
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.3.2-N01
Preconditions: 
  - Non-primary admin logged in as admin2@example.com
  - Another admin exists: admin3@example.com
Steps:
  1. Log in as admin2 (not primary)
  2. Navigate to "Admin User Management"
  3. Attempt to reset password for admin3
Expected Result:
  - "Reset Password" button not available for non-primary admins, OR
  - Button displays error: "Only primary admin can reset passwords"
  - Non-primary admins cannot reset other admins' passwords
  - Only primary admin has this privilege
Pass Criteria: Only primary admin can reset passwords
```

---

### FR-5.3.3: Audit Trail for Admin Actions

**Given/When/Then:**

- **Given** admins perform actions in the system
- **When** changes are made
- **Then** action logs SHALL record which admin made specific changes

**Positive Test Case:**

```
Test ID: TC-FR-5.3.3-P01
Preconditions: 
  - Admin admin2@example.com is logged in
  - Product "Coca-Cola" exists with price 2.50€
Steps:
  1. Log in as admin2@example.com
  2. Navigate to Product Management
  3. Edit "Coca-Cola" product
  4. Change price from 2.50€ to 2.75€
  5. Save changes
  6. Query AuditLog table in database
Expected Result:
  - Audit log entry created with:
    - AdminID: UUID of admin2@example.com
    - Action: "PRODUCT_UPDATED"
    - EntityType: "Product"
    - EntityID: Coca-Cola product UUID
    - OldValue: {"price": 2.50}
    - NewValue: {"price": 2.75}
    - Timestamp: current date/time
    - IPAddress: admin's IP (optional)
  - Can trace who made which change
  - Primary admin can view audit log
Pass Criteria: Admin actions logged with admin identity
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.3.3-N01
Preconditions: 
  - Testing audit log for automated system actions
Steps:
  1. Trigger automated inventory deduction (customer purchase)
  2. Check audit log
Expected Result:
  - Inventory deduction logged
  - AdminID may be NULL or system account ID
  - Action: "INVENTORY_AUTO_DEDUCTION"
  - Clearly distinguishes automated vs manual actions
  - Can filter audit log to show only admin manual actions
Pass Criteria: Automated actions distinguished from admin actions
```

---

### FR-5.4: Admin Session Timeout After 30 Minutes

**Given/When/Then:**

- **Given** an admin is logged in
- **When** 30 minutes pass with no activity
- **Then** the session SHALL timeout and require re-authentication

**Positive Test Case:**

```
Test ID: TC-FR-5.4-P01
Preconditions: 
  - Admin is logged into admin portal
  - Session timeout is 30 minutes
Steps:
  1. Log in to admin portal
  2. Note login time (T0)
  3. Perform no actions for 30 minutes
  4. At T0 + 30:00, attempt to navigate to any admin page
  5. Observe response
Expected Result:
  - At 30-minute mark, session expires
  - Redirected to login page
  - Message: "Session expired. Please log in again."
  - Cannot access admin functions without re-login
  - Session cookie/token invalidated
Pass Criteria: Session expires after 30 minutes inactivity
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.4-N01
Preconditions: 
  - Admin logged in
  - Testing activity reset
Steps:
  1. Log in at T0
  2. Wait 25 minutes with no activity
  3. Click any page or button (activity detected)
  4. Wait another 25 minutes
  5. Attempt to navigate
Expected Result:
  - First 25 minutes: no timeout
  - Activity at 25 minutes resets timer
  - Can work for another 30 minutes from reset point
  - Total time: 55 minutes without timeout (due to activity)
  - Session remains active as long as activity occurs
Pass Criteria: Activity resets session timeout timer
```

---

### FR-5.4.1: Session Timeout Warning

**Given/When/Then:**

- **Given** an admin session is approaching timeout
- **When** 2 minutes remain before timeout
- **Then** the system SHALL display a warning

**Positive Test Case:**

```
Test ID: TC-FR-5.4.1-P01
Preconditions: 
  - Admin logged in
  - 28 minutes have passed (2 minutes before timeout)
Steps:
  1. Log in to admin portal
  2. Wait 28 minutes with no activity
  3. Observe screen at 28-minute mark
  4. Wait for warning to appear
Expected Result:
  - Warning modal/banner appears at 28 minutes
  - Message: "Your session will expire in 2 minutes due to inactivity"
  - Countdown timer shows remaining seconds (optional)
  - "Continue Session" button available
  - Clicking "Continue Session" resets timeout
  - Clicking button extends session for another 30 minutes
Pass Criteria: Warning appears 2 minutes before timeout
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.4.1-N01
Preconditions: 
  - Warning appears at 28 minutes
  - Admin ignores warning
Steps:
  1. Wait for warning to appear at 28 minutes
  2. Do NOT click "Continue Session"
  3. Wait 2 more minutes (total 30 minutes)
  4. Observe result
Expected Result:
  - After 2 minutes (at 30-minute mark), session expires
  - Logged out automatically
  - Redirected to login page
  - Warning does not prevent timeout if ignored
Pass Criteria: Ignoring warning results in timeout
```

---

### FR-5.4.2: Re-authentication Required After Timeout

**Given/When/Then:**

- **Given** an admin session has timed out
- **When** they attempt to access admin functions
- **Then** the system SHALL require re-authentication

**Positive Test Case:**

```
Test ID: TC-FR-5.4.2-P01
Preconditions: 
  - Admin session has timed out (30 minutes passed)
Steps:
  1. Session expires after 30 minutes
  2. Attempt to click any admin function
  3. Observe redirect
  4. Enter valid credentials
  5. Observe access restored
Expected Result:
  - Any admin page access redirects to login
  - Message: "Session expired. Please log in again."
  - After re-login, can access all admin functions again
  - New session created with fresh 30-minute timeout
Pass Criteria: Must re-authenticate after timeout
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.4.2-N01
Preconditions: 
  - Session expired
  - Admin tries direct URL access
Steps:
  1. Let session expire
  2. Manually type admin URL: /admin/products/edit/123
  3. Attempt to access without re-login
Expected Result:
  - Redirected to login page
  - Cannot bypass login with direct URLs
  - After login, redirected to originally requested page (optional)
  - Session enforcement works for all routes
Pass Criteria: Direct URL access blocked without authentication
```

---

### FR-5.4.3: "Remember This Device" Option (Optional)

**Given/When/Then:**

- **Given** the optional "Remember this device" feature is implemented
- **When** an admin logs in
- **Then** the system MAY offer option to remember device for 30 days

**Positive Test Case:**

```
Test ID: TC-FR-5.4.3-P01
Preconditions: 
  - Feature is implemented and enabled
Steps:
  1. Navigate to login page
  2. Check for "Remember this device for 30 days" checkbox
  3. Enter valid credentials
  4. Check the "Remember" checkbox
  5. Click "Login"
  6. Close browser completely
  7. Reopen browser and navigate to admin portal
Expected Result:
  - "Remember" checkbox available on login
  - After login with checkbox, long-lived cookie/token created (30 days)
  - Closing and reopening browser does not log out
  - Can access admin portal without re-login
  - Token expires after 30 days
  - Still subject to 30-minute inactivity timeout per session
Pass Criteria: Remember device option works for 30 days
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-5.4.3-N01
Preconditions: 
  - Feature is NOT implemented (optional)
Steps:
  1. Navigate to login page
  2. Check for "Remember this device" option
Expected Result:
  - Checkbox not present (feature is optional)
  - Standard session-only login works normally
  - Closing browser logs out admin
  - No errors from missing feature
Pass Criteria: Absence of optional feature doesn't cause errors
```

---

### FR-6.1: Add New Product with Attributes

**Given/When/Then:**

- **Given** an admin is on the product management page
- **When** they add a new product
- **Then** the system SHALL allow entry of: name (required, 1-100 chars), price (required, 0.01-999.99 EUR), image (optional), category (required), allergen info (optional, ≤500 chars), hot/cold (optional), purchase limit (optional, 1-50)

**Positive Test Case:**

```
Test ID: TC-FR-6.1-P01
Preconditions: 
  - Admin logged in
  - On Product Management page
Steps:
  1. Click "Add New Product" button
  2. Fill in form:
     - Name: "Red Bull Energy Drink"
     - Price: 3.50
     - Category: "Drinks", "Cold Drinks" (multi-select)
     - Allergen Info: "Contains caffeine"
     - Hot/Cold: Cold (boolean true)
     - Purchase Limit: 4
  3. Upload image: redbull.jpg
  4. Click "Save Product"
  5. Verify product appears in list
Expected Result:
  - Product created successfully
  - All fields saved correctly:
    - Name: "Red Bull Energy Drink" (50 characters, within limit)
    - Price: 3.50 EUR (valid range)
    - Categories: ["Drinks", "Cold Drinks"]
    - AllergenInfo: "Contains caffeine" (17 chars, within 500 limit)
    - IsHot: false
    - PurchaseLimit: 4 (within 1-50 range)
  - Image uploaded and processed (FR-6.5)
  - Product UUID generated
  - CreatedAt, UpdatedAt timestamps set
  - CreatedBy set to current admin UUID
  - Product appears on kiosk within 5 seconds (FR-6.2.1)
Pass Criteria: All product attributes saved correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.1-N01
Preconditions: 
  - Admin on Add Product page
  - Testing validation
Steps:
  1. Click "Add New Product"
  2. Fill in form with invalid data:
     - Name: "" (empty, required field)
     - Price: 0.00 (below minimum 0.01)
  3. Attempt to save
Expected Result:
  - Validation errors displayed:
    - "Product name is required (1-100 characters)"
    - "Price must be between 0.01€ and 999.99€"
  - Product NOT saved to database
  - Form remains on screen with errors highlighted
  - User can correct errors and retry
Pass Criteria: Required fields and ranges validated
```

---

### FR-6.1.1: Price Validation

**Given/When/Then:**

- **Given** an admin enters a product price
- **When** the price is validated
- **Then** the system SHALL enforce: 0.01-999.99 EUR range, exactly 2 decimal places, not negative/zero, display error if invalid

**Positive Test Case:**

```
Test ID: TC-FR-6.1.1-P01
Preconditions: 
  - Admin adding/editing product
Steps:
  1. Enter valid prices and verify acceptance:
     - 0.01 (minimum)
     - 2.50 (typical)
     - 999.99 (maximum)
  2. Save each and verify
Expected Result:
  - All valid prices accepted
  - Saved with exactly 2 decimal places in database
  - Display shows prices with 2 decimals: "0.01€", "2.50€", "999.99€"
  - No validation errors
Pass Criteria: Valid prices accepted
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.1.1-N01
Preconditions: 
  - Admin entering invalid prices
Steps:
  1. Test invalid price values:
     - 0.00 (zero)
     - -1.50 (negative)
     - 1000.00 (above maximum)
     - 2.5 (1 decimal place)
     - 2.555 (3 decimal places)
     - abc (non-numeric)
  2. Attempt to save each
Expected Result:
  - All invalid prices rejected
  - Error messages:
    - 0.00: "Price must be between 0.01€ and 999.99€"
    - -1.50: "Price cannot be negative"
    - 1000.00: "Price must be between 0.01€ and 999.99€"
    - 2.5: Auto-formatted to 2.50 OR error "Must have 2 decimal places"
    - 2.555: Rounded to 2.56 OR error "Must have 2 decimal places"
    - abc: "Price must be a valid number"
  - Product not saved with invalid price
Pass Criteria: Invalid prices rejected with clear error messages
```

---

### FR-6.1.2: Purchase Limit Validation

**Given/When/Then:**

- **Given** an admin sets a purchase limit
- **When** the limit is validated
- **Then** the system SHALL enforce: 1-50 range if set, NULL for unlimited, display on product as "Maximum [X] per purchase"

**Positive Test Case:**

```
Test ID: TC-FR-6.1.2-P01
Preconditions: 
  - Admin adding product with purchase limit
Steps:
  1. Set purchase limit: 5
  2. Save product
  3. View product on kiosk
  4. Check product detail
Expected Result:
  - Purchase limit saved: 5
  - Database field: PurchaseLimit = 5
  - Product card on kiosk displays: "Maximum 5 per purchase"
  - Enforced when adding to cart (FR-2.3)
Pass Criteria: Purchase limit displayed and enforced
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.1.2-N01
Preconditions: 
  - Admin enters invalid purchase limits
Steps:
  1. Test invalid values:
     - 0 (below minimum)
     - 51 (above maximum)
     - -5 (negative)
  2. Attempt to save
Expected Result:
  - Validation errors:
    - 0: "Purchase limit must be between 1 and 50, or leave empty for unlimited"
    - 51: "Purchase limit must be between 1 and 50"
    - -5: "Purchase limit cannot be negative"
  - Product not saved with invalid limit
  - Leaving field empty (NULL) is valid (unlimited)
Pass Criteria: Purchase limit range validated
```

---

### FR-6.2: Edit Existing Product

**Given/When/Then:**

- **Given** a product exists in the system
- **When** an admin edits product information
- **Then** the system SHALL allow editing all product attributes

**Positive Test Case:**

```
Test ID: TC-FR-6.2-P01
Preconditions: 
  - Product "Coca-Cola" exists with price 2.50€
Steps:
  1. Navigate to Product Management
  2. Click "Edit" on "Coca-Cola" product
  3. Change price from 2.50€ to 2.75€
  4. Change allergen info to "Contains caffeine, sugar"
  5. Click "Save Changes"
  6. Verify changes in database and kiosk
Expected Result:
  - Product updated successfully
  - Price: 2.75€
  - AllergenInfo: "Contains caffeine, sugar"
  - UpdatedAt timestamp updated
  - UpdatedBy set to current admin UUID
  - Changes reflected on kiosk within 5 seconds (FR-6.2.1)
  - Audit log records change (FR-5.3.3)
Pass Criteria: Product edits saved and reflected
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.2-N01
Preconditions: 
  - Editing product with invalid data
Steps:
  1. Edit existing product
  2. Change name to empty string ""
  3. Attempt to save
Expected Result:
  - Validation error: "Product name is required"
  - Changes NOT saved
  - Product retains original name
  - Can correct and retry
Pass Criteria: Validation enforced on edit
```

---

### FR-6.2.1: Immediate Kiosk Reflection (Within 5 Seconds)

**Given/When/Then:**

- **Given** an admin makes changes to a product
- **When** changes are saved
- **Then** changes SHALL reflect on kiosk interface within 5 seconds

**Positive Test Case:**

```
Test ID: TC-FR-6.2.1-P01
Preconditions: 
  - Product "Chips" displayed on kiosk with price 1.50€
  - Admin and kiosk open simultaneously
Steps:
  1. View "Chips" on kiosk: price shows 1.50€
  2. In admin portal, edit "Chips" price to 1.75€
  3. Save changes
  4. Start timer
  5. Monitor kiosk display
  6. Note when price updates to 1.75€
Expected Result:
  - Kiosk price updates from 1.50€ to 1.75€
  - Update occurs within 5 seconds
  - No manual refresh needed on kiosk
  - Real-time update (WebSocket) or short polling (every 5 seconds)
Pass Criteria: Changes appear on kiosk ≤5 seconds
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.2.1-N01
Preconditions: 
  - Testing network latency impact
  - Simulated slow network (1-second latency)
Steps:
  1. Configure network throttling: 1-second delay
  2. Edit product in admin portal
  3. Save changes
  4. Monitor kiosk update time
Expected Result:
  - Update may take slightly longer (up to 6 seconds with network delay)
  - Still completes within reasonable time
  - System handles network delays gracefully
  - No data loss or corruption
Pass Criteria: Updates work even with network latency
```

---

### FR-6.3: Delete/Remove Product

**Given/When/Then:**

- **Given** a product exists in the system
- **When** an admin deletes the product
- **Then** the system SHALL remove product from active display

**Positive Test Case:**

```
Test ID: TC-FR-6.3-P01
Preconditions: 
  - Product "Old Snack" exists and is visible on kiosk
Steps:
  1. Navigate to Product Management
  2. Find "Old Snack" in product list
  3. Click "Delete" button
  4. Confirm deletion in popup (FR-6.3.2)
  5. Verify product removed from kiosk
Expected Result:
  - Confirmation dialog appears (FR-6.3.2)
  - After confirmation, product removed from kiosk display
  - Product NOT permanently deleted (soft delete per FR-6.3.1)
  - IsActive flag set to FALSE in database
  - Product still in database for transaction history
  - Cannot be selected by customers
Pass Criteria: Product removed from customer view
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.3-N01
Preconditions: 
  - Admin clicks Delete but cancels
Steps:
  1. Click "Delete" on a product
  2. Confirmation dialog appears
  3. Click "Cancel" or close dialog
Expected Result:
  - Deletion cancelled
  - Product remains visible on kiosk
  - IsActive remains TRUE
  - No changes to database
Pass Criteria: Cancelling delete preserves product
```

---

### FR-6.3.1: Soft Delete for Transaction History

**Given/When/Then:**

- **Given** a product is deleted
- **When** the deletion occurs
- **Then** the product SHALL be soft-deleted (marked inactive) to preserve transaction history references

**Positive Test Case:**

```
Test ID: TC-FR-6.3.1-P01
Preconditions: 
  - Product "Discontinued Item" has transaction history
  - Product has been purchased 50 times
Steps:
  1. View transaction history showing "Discontinued Item"
  2. Delete "Discontinued Item"
  3. Query database for product
  4. View old transactions
Expected Result:
  - Product still exists in database
  - IsActive = FALSE (soft deleted)
  - ProductID still valid
  - Old transactions still reference product correctly
  - Transaction history displays "Discontinued Item" name
  - Product hidden from kiosk
  - Admin can view deleted products (optional filter)
Pass Criteria: Soft delete preserves transaction integrity
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.3.1-N01
Preconditions: 
  - Testing if product can be "undeleted"
Steps:
  1. Soft-delete a product
  2. Admin changes IsActive from FALSE to TRUE
  3. Check kiosk display
Expected Result:
  - Product reappears on kiosk
  - "Undelete" functionality works (if implemented)
  - Product fully restored with all original data
  - Soft delete is reversible
Pass Criteria: Soft delete is reversible (optional feature)
```

---

### FR-6.3.2: Delete Confirmation Prompt

**Given/When/Then:**

- **Given** an admin clicks delete
- **When** the delete action is initiated
- **Then** the system SHALL confirm deletion with prompt: "Are you sure you want to delete [product name]? This will hide it from customers."

**Positive Test Case:**

```
Test ID: TC-FR-6.3.2-P01
Preconditions: 
  - Product "Chocolate Bar" exists
Steps:
  1. Click "Delete" button for "Chocolate Bar"
  2. Observe confirmation dialog
  3. Read dialog text
Expected Result:
  - Confirmation dialog appears
  - Text: "Are you sure you want to delete Chocolate Bar? This will hide it from customers."
  - "Confirm" and "Cancel" buttons present (≥44x44px)
  - Dialog is modal (blocks other actions)
  - Product name dynamically inserted into message
Pass Criteria: Confirmation dialog displays with product name
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.3.2-N01
Preconditions: 
  - Testing accidental double-click
Steps:
  1. Double-click "Delete" button rapidly
  2. Observe dialog behavior
Expected Result:
  - Only one confirmation dialog appears
  - Double-click doesn't trigger multiple deletions
  - Dialog prevents race conditions
  - Product deleted only once after confirmation
Pass Criteria: Double-click handled safely
```

---

### FR-6.4: Upload Product Images

**Given/When/Then:**

- **Given** an admin is adding/editing a product
- **When** they upload an image
- **Then** the system SHALL allow upload through web portal with validation

**Positive Test Case:**

```
Test ID: TC-FR-6.4-P01
Preconditions: 
  - Admin on product add/edit page
  - Valid image file: product.jpg (2.5 MB, JPEG)
Steps:
  1. Click "Upload Image" button
  2. Select product.jpg from file system
  3. Submit upload
  4. Wait for processing
  5. Observe preview
Expected Result:
  - File upload accepted
  - Image validated (JPEG format, <10MB)
  - Processing occurs (FR-6.5)
  - Preview displayed before final save
  - Admin can confirm or re-upload
Pass Criteria: Valid image uploads successfully
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.4-N01
Preconditions: 
  - Admin attempts invalid upload
Steps:
  1. Attempt to upload invalid files:
     - executable.exe
     - image.svg (not in whitelist)
     - huge.jpg (15MB, exceeds limit)
  2. Observe error messages
Expected Result:
  - All invalid uploads rejected
  - Error messages:
    - .exe: "Invalid file type. Please upload JPEG, PNG, WebP, or GIF (max 10MB)"
    - .svg: Same error (not in whitelist)
    - 15MB file: "File size exceeds 10MB limit"
  - Upload doesn't proceed
  - No file saved to server
Pass Criteria: Invalid uploads rejected with clear errors
```

---

### FR-6.4.1: Image Upload Requirements and Validation

**Given/When/Then:**

- **Given** an admin uploads an image
- **When** the file is validated
- **Then** the system SHALL enforce: accepted formats (JPEG, PNG, WebP, GIF non-animated), max 10MB, extension whitelist, content validation (magic number), reject executables/SVG, display clear error if rejected

**Positive Test Case:**

```
Test ID: TC-FR-6.4.1-P01
Preconditions: 
  - Testing all valid formats
Steps:
  1. Upload image.jpg (JPEG, 3MB)
  2. Upload image.png (PNG, 2MB)
  3. Upload image.webp (WebP, 1MB)
  4. Upload image.gif (GIF, non-animated, 500KB)
  5. Verify all accepted
Expected Result:
  - All formats accepted:
    - ✓ JPEG (.jpg, .jpeg)
    - ✓ PNG (.png)
    - ✓ WebP (.webp)
    - ✓ GIF (.gif, static only)
  - File size check passes (<10MB)
  - Extension matches content (magic number check)
  - Processing continues to FR-6.5
Pass Criteria: All valid formats accepted
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.4.1-N01
Preconditions: 
  - Testing content validation (magic number check)
Steps:
  1. Rename malicious.exe to malicious.jpg
  2. Attempt upload
  3. System performs magic number check
Expected Result:
  - File extension is .jpg (passes whitelist)
  - Magic number check reveals file is actually .exe
  - Upload rejected: "Invalid file type. File content doesn't match extension."
  - Security measure prevents executable upload disguised as image
Pass Criteria: Magic number validation catches disguised files
```

---

### FR-6.4.2: Image Upload Security

**Given/When/Then:**

- **Given** an image is uploaded
- **When** security processing occurs
- **Then** the system SHALL: strip EXIF metadata, enforce max filename 255 chars, sanitize filenames (remove special chars except - and _)

**Positive Test Case:**

```
Test ID: TC-FR-6.4.2-P01
Preconditions: 
  - Image with EXIF metadata (GPS, camera info)
  - Filename: "My Product Photo 2025!@#.jpg"
Steps:
  1. Upload image with EXIF data
  2. Upload file with special characters in name
  3. Verify processing
Expected Result:
  - EXIF metadata stripped from uploaded image
  - No GPS coordinates or personal data in final image
  - Filename sanitized: "My-Product-Photo-2025.jpg"
  - Special characters (!@#) removed
  - Spaces replaced with hyphens
  - Only alphanumeric, hyphens, underscores remain
  - Max filename length enforced (255 chars)
Pass Criteria: Security measures applied to uploads
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.4.2-N01
Preconditions: 
  - Filename exceeds 255 characters
Steps:
  1. Create filename with 300 characters
  2. Attempt upload
Expected Result:
  - Filename truncated to 255 characters OR
  - Error: "Filename too long (max 255 characters)"
  - Upload proceeds with truncated/renamed file OR rejected
  - No file system errors from long filename
Pass Criteria: Long filenames handled safely
```

---

### FR-6.5: Automatic Image Processing

**Given/When/Then:**

- **Given** an image is uploaded
- **When** processing occurs
- **Then** the system SHALL: resize to 800x600px (center-crop), compress to <200KB, convert to WebP (JPEG fallback), backup original, show preview before confirm

**Positive Test Case:**

```
Test ID: TC-FR-6.5-P01
Preconditions: 
  - Original image: 4000x3000px, 5MB, JPEG
Steps:
  1. Upload large image (4000x3000px)
  2. Wait for automatic processing
  3. Observe preview
  4. Check processed file properties
Expected Result:
  - Image resized to 800x600px (landscape aspect ratio)
  - Center-cropped if aspect ratio doesn't match
  - Compressed to <200KB file size
  - WebP version created for kiosk display
  - JPEG fallback created for compatibility
  - Original 5MB image backed up separately
  - Preview shown to admin before final confirmation
  - Admin can accept or re-upload if unsatisfied
  - Processing completes within reasonable time (<10 seconds for 5MB image)
Pass Criteria: Image automatically optimized
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.5-N01
Preconditions: 
  - Very small image: 200x150px
Steps:
  1. Upload tiny image (smaller than target 800x600px)
  2. Observe processing
Expected Result:
  - Image upscaled to 800x600px OR
  - Image displayed at original size with padding
  - Quality maintained as much as possible
  - No pixelation errors
  - File size still compressed
  - Recommendation to upload larger image (optional)
Pass Criteria: Small images handled without errors
```

---

### FR-6.6: Default Placeholder Image

**Given/When/Then:**

- **Given** a product has no uploaded image
- **When** the product is displayed
- **Then** the system SHALL display a default placeholder image (generic snack/drink icon)

**Positive Test Case:**

```
Test ID: TC-FR-6.6-P01
Preconditions: 
  - Product "Generic Snack" created without image upload
  - ImageURL field is NULL
Steps:
  1. Create product without uploading image
  2. View product on kiosk
  3. Observe image display
Expected Result:
  - Default placeholder image displayed
  - Placeholder is generic snack/drink icon
  - Image dimensions: 800x600px (matches real images)
  - Placeholder clearly distinguishable from real products
  - No broken image icon
  - Product remains functional
Pass Criteria: Placeholder image displays correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-6.6-N01
Preconditions: 
  - Product image URL points to deleted/missing file
Steps:
  1. Product has ImageURL: "/images/deleted.webp"
  2. File deleted from server
  3. View product on kiosk
Expected Result:
  - 404 error detected for missing image
  - Fallback to default placeholder
  - No broken image icon shown
  - Error logged (missing image file)
  - Admin notified (optional)
  - Product remains selectable
Pass Criteria: Missing images fallback to placeholder
```

---

### FR-7.1: Create Custom Categories

**Given/When/Then:**

- **Given** an admin wants to organize products
- **When** they create a custom category
- **Then** the system SHALL allow creation with name requirements: 1-50 chars, unique, no special chars except spaces/hyphens

**Positive Test Case:**

```
Test ID: TC-FR-7.1-P01
Preconditions: 
  - Admin on Category Management page
  - Category "Organic Snacks" does not exist
Steps:
  1. Click "Add Category" button
  2. Enter category name: "Organic Snacks"
  3. Click "Save"
  4. Verify category created
Expected Result:
  - Category "Organic Snacks" created successfully
  - Name length: 14 characters (within 1-50 limit)
  - Contains space (allowed)
  - Unique name (no duplicates)
  - Category appears in category list
  - Available for product assignment
  - Available as filter on kiosk
Pass Criteria: Valid category created
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-7.1-N01
Preconditions: 
  - Testing invalid category names
Steps:
  1. Attempt to create categories with invalid names:
     - "" (empty)
     - "A" repeated 51 times (51 chars, too long)
     - "Snacks@#$%" (invalid special characters)
     - "Drinks" (already exists - duplicate)
  2. Observe validation errors
Expected Result:
  - Validation errors for each:
    - Empty: "Category name is required (1-50 characters)"
    - 51 chars: "Category name must be 50 characters or less"
    - Special chars: "Category name can only contain letters, numbers, spaces, and hyphens"
    - Duplicate: "Category name must be unique"
  - Categories NOT created
Pass Criteria: Invalid category names rejected
```

---

### FR-7.1.1: Category Name Requirements

**Given/When/Then:**

- **Given** an admin enters a category name
- **When** validating the name
- **Then** the system SHALL enforce: 1-50 characters, must be unique, cannot contain special characters except spaces and hyphens

**Positive Test Case:**

```
Test ID: TC-FR-7.1.1-P01
Preconditions: 
  - Testing valid category names
Steps:
  1. Create categories with edge-case valid names:
     - "A" (1 character, minimum)
     - "Healthy-Snacks" (with hyphen)
     - "Energy Drinks 2025" (with space and numbers)
     - "X" repeated 50 times (50 characters, maximum)
  2. Verify all accepted
Expected Result:
  - All valid names accepted
  - 1-character name works (minimum)
  - 50-character name works (maximum)
  - Hyphens allowed
  - Spaces allowed
  - Numbers allowed
Pass Criteria: All valid edge cases accepted
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-7.1.1-N01
Preconditions: 
  - Category "Drinks" already exists
Steps:
  1. Attempt to create another category named "Drinks"
  2. Attempt "drinks" (lowercase)
  3. Attempt "DRINKS" (uppercase)
Expected Result:
  - All variations rejected (case-insensitive uniqueness check recommended)
  - Error: "Category name must be unique"
  - Prevents duplicate categories with different casing
Pass Criteria: Uniqueness check is case-insensitive
```

---

### FR-7.2: Edit and Delete Categories

**Given/When/Then:**

- **Given** a category exists
- **When** an admin edits or deletes it
- **Then** the system SHALL allow editing and deletion with constraints

**Positive Test Case:**

```
Test ID: TC-FR-7.2-P01
Preconditions: 
  - Category "Old Name" exists
  - No products assigned to it
Steps:
  1. Navigate to Category Management
  2. Click "Edit" on "Old Name"
  3. Change name to "New Name"
  4. Save changes
  5. Verify category renamed
Expected Result:
  - Category renamed from "Old Name" to "New Name"
  - All references updated
  - Kiosk filter updates within 5 seconds (FR-7.5)
  - Audit log records change
Pass Criteria: Category renamed successfully
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-7.2-N01
Preconditions: 
  - Category "Snacks" has 10 products assigned
Steps:
  1. Attempt to delete "Snacks" category
  2. Observe system response
Expected Result:
  - Deletion prevented (FR-7.2.1)
  - Error: "Cannot delete category with assigned products. Please reassign or delete products first."
  - Category remains in system
  - Products remain assigned
Pass Criteria: Cannot delete category with products
```

---

### FR-7.2.1: Prevent Deletion of Categories with Products

**Given/When/Then:**

- **Given** a category has products assigned
- **When** admin attempts to delete it
- **Then** the system SHALL prevent deletion and display warning

**Positive Test Case:**

```
Test ID: TC-FR-7.2.1-P01
Preconditions: 
  - Category "Popular" has 5 products assigned
Steps:
  1. Navigate to Category Management
  2. Click "Delete" on "Popular" category
  3. Observe response
Expected Result:
  - Deletion blocked
  - Warning displayed: "Cannot delete category with assigned products. Please reassign or delete products first."
  - Category count shown: "5 products in this category"
  - "View Products" button to see which products (optional)
  - Category remains in system
Pass Criteria: Deletion prevented with helpful message
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-7.2.1-N01
Preconditions: 
  - Category "Empty" has 0 products assigned
Steps:
  1. Attempt to delete "Empty" category
  2. Confirm deletion
Expected Result:
  - Deletion allowed (no products assigned)
  - Category removed from system
  - No longer available as filter on kiosk
  - No errors occur
Pass Criteria: Empty categories can be deleted
```

---

### FR-7.2.2: Category Deletion Warning

**Given/When/Then:**

- **Given** admin attempts to delete category with products
- **When** the action is initiated
- **Then** the system SHALL display: "Cannot delete category with assigned products. Please reassign or delete products first."

**Positive Test Case:**

```
Test ID: TC-FR-7.2.2-P01
Preconditions: 
  - Category "Beverages" has products assigned
Steps:
  1. Click "Delete" on "Beverages"
  2. Read warning message
Expected Result:
  - Warning message displayed exactly as specified
  - Text: "Cannot delete category with assigned products. Please reassign or delete products first."
  - Clear instructions on how to proceed
  - Actionable next steps provided
Pass Criteria: Exact warning message displayed
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-7.2.2-N01
Preconditions: 
  - Testing admin workflow to delete category with products
Steps:
  1. Attempt to delete category with products (blocked)
  2. Reassign all products to different category
  3. Retry deletion
Expected Result:
  - First attempt: blocked with warning
  - After reassigning: deletion allowed
  - Category successfully deleted
  - Products remain in system with new category assignment
Pass Criteria: Workflow guidance works correctly
```

---

### FR-7.3: Products in Multiple Categories

**Given/When/Then:**

- **Given** a product is being added/edited
- **When** assigning categories
- **Then** products SHALL be allowed to belong to multiple categories simultaneously

**Positive Test Case:**

```
Test ID: TC-FR-7.3-P01
Preconditions: 
  - Categories exist: "Drinks", "Cold Drinks", "Bestsellers"
  - Product "Iced Coffee" being created
Steps:
  1. Create product "Iced Coffee"
  2. Select multiple categories:
     - ✓ Drinks
     - ✓ Cold Drinks
     - ✓ Bestsellers
  3. Save product
  4. View kiosk with different filters
Expected Result:
  - Product saved with 3 categories
  - Appears in "Drinks" filter
  - Appears in "Cold Drinks" filter
  - Appears in "Bestsellers" filter
  - Appears in "All Products" view
  - Multi-select category assignment works
Pass Criteria: Product appears in all assigned categories
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-7.3-N01
Preconditions: 
  - Testing product with NO categories assigned
Steps:
  1. Create product without selecting any category
  2. Attempt to save
Expected Result:
  - Validation error: "At least one category is required" OR
  - Product auto-assigned to default "Uncategorized" category
  - Product must belong to at least one category (per FR-6.1)
Pass Criteria: Products cannot exist without category
```

---

### FR-7.4: Default Pre-Configured Categories

**Given/When/Then:**

- **Given** the system is initially set up
- **When** viewing categories
- **Then** the system SHALL include default categories: Drinks, Snacks, Hot Drinks, Cold Drinks

**Positive Test Case:**

```
Test ID: TC-FR-7.4-P01
Preconditions: 
  - Fresh system installation
  - No custom categories created yet
Steps:
  1. Log into admin portal
  2. Navigate to Category Management
  3. View category list
Expected Result:
  - Default categories pre-configured:
    - ✓ Drinks
    - ✓ Snacks
    - ✓ Hot Drinks
    - ✓ Cold Drinks
  - All marked as IsDefault = TRUE in database
  - Available immediately for product assignment
  - Visible on kiosk as filter options
Pass Criteria: 4 default categories exist
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-7.4-N01
Preconditions: 
  - Testing if default categories can be deleted
Steps:
  1. Attempt to delete "Drinks" (default category)
  2. Observe response
Expected Result:
  - Deletion prevented (FR-7.4.1)
  - Message: "Default categories cannot be deleted"
  - Can rename but not delete (FR-7.4.1)
Pass Criteria: Default categories cannot be deleted
```

---

### FR-7.4.1: Default Categories Can Be Renamed But Not Deleted

**Given/When/Then:**

- **Given** a default category exists
- **When** admin attempts to rename or delete it
- **Then** the system SHALL allow renaming but prevent deletion

**Positive Test Case:**

```
Test ID: TC-FR-7.4.1-P01
Preconditions: 
  - Default category "Snacks" exists
Steps:
  1. Click "Edit" on "Snacks" category
  2. Change name to "Snack Foods"
  3. Save changes
Expected Result:
  - Category renamed to "Snack Foods"
  - IsDefault flag remains TRUE
  - Still protected from deletion
  - Rename successful
Pass Criteria: Default categories can be renamed
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-7.4.1-N01
Preconditions: 
  - Default category "Drinks" exists
Steps:
  1. Attempt to delete "Drinks" category
  2. Observe response
Expected Result:
  - Deletion prevented
  - Error: "Default categories cannot be deleted"
  - "Delete" button disabled for default categories OR
  - Delete action shows error message
Pass Criteria: Default categories cannot be deleted
```

---

### FR-7.5: Category Changes Update Kiosk Immediately

**Given/When/Then:**

- **Given** category changes are made in admin portal
- **When** changes are saved
- **Then** product filtering on kiosk SHALL update within 5 seconds

**Positive Test Case:**

```
Test ID: TC-FR-7.5-P01
Preconditions: 
  - Kiosk and admin portal open simultaneously
  - Product "Coffee" assigned to "Hot Drinks" category
Steps:
  1. View kiosk: select "Hot Drinks" filter, see "Coffee"
  2. In admin: reassign "Coffee" from "Hot Drinks" to "Cold Drinks"
  3. Save changes
  4. Start timer
  5. Monitor kiosk display
Expected Result:
  - Within 5 seconds, "Coffee" disappears from "Hot Drinks" filter
  - "Coffee" appears in "Cold Drinks" filter
  - Real-time update or short polling
  - No manual refresh needed
Pass Criteria: Category changes reflected ≤5 seconds
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-7.5-N01
Preconditions: 
  - Testing newly created category
Steps:
  1. Create new category "Limited Edition"
  2. Save category
  3. View kiosk filters
Expected Result:
  - "Limited Edition" appears in filter list within 5 seconds
  - Initially shows empty (no products assigned yet)
  - New categories immediately available on kiosk
Pass Criteria: New categories appear on kiosk quickly
```

---

### FR-8.1: Enable/Disable Inventory Tracking System-Wide

**Given/When/Then:**

- **Given** an admin accesses system configuration
- **When** they toggle inventory tracking
- **Then** the system SHALL enable or disable inventory tracking system-wide

**Positive Test Case:**

```
Test ID: TC-FR-8.1-P01
Preconditions: 
  - Inventory tracking is currently disabled
  - Admin logged in
Steps:
  1. Navigate to System Configuration
  2. Find "Inventory Tracking" toggle switch
  3. Enable toggle (switch to ON)
  4. Save configuration
  5. Observe changes
Expected Result:
  - Toggle switches to enabled state
  - Inventory features become active (FR-8.1.2)
  - Stock quantity fields visible in admin portal
  - Low-stock notifications active
  - Automatic deductions on purchase enabled
  - Kiosk displays out-of-stock indicators
Pass Criteria: Inventory tracking successfully enabled
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.1-N01
Preconditions: 
  - Inventory tracking is currently enabled
  - Products have stock quantities set
Steps:
  1. Disable inventory tracking toggle
  2. Save configuration
  3. Observe changes
Expected Result:
  - Toggle switches to disabled state
  - Inventory features hidden/deactivated (FR-8.1.1)
  - Stock quantities preserved in database (FR-8.1.3)
  - Kiosk displays warning at checkout (FR-1.5)
  - All products show as available
  - No inventory deductions on purchase
Pass Criteria: Inventory tracking successfully disabled
```

---

### FR-8.1.1: Inventory Tracking Disabled Behavior

**Given/When/Then:**

- **Given** inventory tracking is disabled
- **When** viewing the system
- **Then** the system SHALL: hide stock quantity fields, hide low-stock settings, not deduct inventory on purchases, hide notifications, display "Tracking: OFF" banner, show checkout warning, display all products as available

**Positive Test Case:**

```
Test ID: TC-FR-8.1.1-P01
Preconditions: 
  - Inventory tracking disabled
Steps:
  1. Log into admin portal
  2. Navigate to Product Management
  3. Navigate to Inventory Management
  4. View kiosk
  5. Make test purchase
Expected Result:
  - Admin portal shows "Inventory Tracking: OFF" banner
  - Stock quantity fields hidden in product forms
  - Low-stock threshold settings hidden
  - Inventory Management page shows limited info or disabled
  - Kiosk: all products show as "Available"
  - Kiosk checkout: warning displayed (FR-1.5)
  - Purchase completes without inventory deduction
  - Stock quantities unchanged after purchase
Pass Criteria: All inventory features properly disabled
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.1.1-N01
Preconditions: 
  - Inventory disabled
  - Product actually out of stock physically
Steps:
  1. Product has 0 stock in database
  2. Inventory tracking is disabled
  3. View product on kiosk
Expected Result:
  - Product shows as "Available" (ignores stock quantity)
  - No out-of-stock indicator
  - Customer can attempt purchase
  - Warning at checkout reminds to verify cabinet
  - Relies on trust system
Pass Criteria: Physical stock not reflected when tracking disabled
```

---

### FR-8.1.2: Inventory Tracking Enabled Behavior

**Given/When/Then:**

- **Given** inventory tracking is enabled
- **When** viewing and using the system
- **Then** all inventory features SHALL be active: view/edit stock quantities, automatic deductions, low-stock notifications, out-of-stock displays

**Positive Test Case:**

```
Test ID: TC-FR-8.1.2-P01
Preconditions: 
  - Inventory tracking enabled
  - Product "Soda" has stock: 3 units
  - Low-stock threshold: 5 units
Steps:
  1. View admin Inventory Management page
  2. View kiosk product display
  3. Purchase 1x "Soda"
  4. Check admin email for notification
Expected Result:
  - Admin can view stock: "Soda: 3 units"
  - Can edit stock quantities with +/- buttons
  - Kiosk shows "Soda" with low stock indicator (optional)
  - After purchase: stock updated to 2 units
  - Low-stock email notification sent (below threshold of 5)
  - All inventory features functioning
Pass Criteria: All inventory features active
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.1.2-N01
Preconditions: 
  - Inventory tracking enabled
  - Testing edge of enabling after long period disabled
Steps:
  1. Inventory has been disabled for months
  2. Enable inventory tracking
  3. Check if old stock quantities are still valid
Expected Result:
  - Old stock quantities restored from database (FR-8.1.3)
  - May be inaccurate after long disabled period
  - Admin should manually verify and adjust stock
  - System provides tools to update all stock (bulk edit optional)
Pass Criteria: Old stock data preserved when re-enabling
```

---

### FR-8.1.3: Preserve Stock Quantities When Re-Enabling

**Given/When/Then:**

- **Given** inventory tracking has been disabled
- **When** admin re-enables it
- **Then** the system SHALL preserve last known stock quantities

**Positive Test Case:**

```
Test ID: TC-FR-8.1.3-P01
Preconditions: 
  - Inventory tracking enabled
  - Product "Chips" stock: 15 units
Steps:
  1. Record current stock: Chips = 15
  2. Disable inventory tracking
  3. Wait (inventory tracking disabled for some time)
  4. Re-enable inventory tracking
  5. Check "Chips" stock quantity
Expected Result:
  - Stock quantity preserved: Chips = 15
  - Stock data not lost during disabled period
  - Can resume inventory tracking from last known state
  - Admin can adjust if needed
Pass Criteria: Stock quantities preserved
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.1.3-N01
Preconditions: 
  - Inventory disabled
  - Purchases made while disabled (no deductions)
  - Stock quantities in database unchanged
Steps:
  1. Stock: Cola = 10
  2. Disable inventory
  3. 5 purchases of Cola made (stock still shows 10)
  4. Re-enable inventory
  5. Check stock
Expected Result:
  - Stock shows: Cola = 10 (unchanged)
  - Does NOT reflect the 5 purchases made while disabled
  - Discrepancy between system and physical stock
  - Admin must manually reconcile
  - System warns admin to verify stock after re-enabling (optional)
Pass Criteria: System doesn't auto-correct for disabled period sales
```

---

### FR-8.2: Inventory Management Functions (When Enabled)

**Given/When/Then:**

- **Given** inventory tracking is enabled
- **When** admin manages inventory
- **Then** the system SHALL allow: view stock in sortable table, manually update stock, set low-stock thresholds (1-99, default 5), manually adjust for discrepancies

**Positive Test Case:**

```
Test ID: TC-FR-8.2-P01
Preconditions: 
  - Inventory tracking enabled
  - 10 products in system with various stock levels
Steps:
  1. Navigate to Inventory Management page
  2. View stock table
  3. Sort by stock quantity (low to high)
  4. Select product "Cookies" (stock: 3)
  5. Click "+" button 10 times
  6. Set low-stock threshold to 8
  7. Save changes
Expected Result:
  - Sortable table displays all products with stock
  - Can sort by: name, stock quantity, threshold
  - "Cookies" stock updated: 3 → 13
  - Low-stock threshold set to 8 for "Cookies"
  - Changes saved immediately
  - If stock was below threshold before, notification sent
Pass Criteria: All inventory management functions work
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.2-N01
Preconditions: 
  - Inventory tracking disabled
Steps:
  1. Navigate to Inventory Management page
Expected Result:
  - Limited view or message: "Inventory tracking is disabled"
  - Stock quantities not editable
  - Page explains how to enable tracking
  - No errors from accessing page while disabled
Pass Criteria: Inventory page handled gracefully when tracking disabled
```

---

### FR-8.2.1: Inventory Discrepancy Report

**Given/When/Then:**

- **Given** products have negative stock
- **When** admin views inventory discrepancy report
- **Then** admins SHALL be able to view products with negative stock

**Positive Test Case:**

```
Test ID: TC-FR-8.2.1-P01
Preconditions: 
  - Product "Candy" has stock: -3
  - Product "Gum" has stock: -1
  - Product "Soda" has stock: 5 (positive, not negative)
Steps:
  1. Navigate to Inventory Management
  2. Click "View Discrepancy Report" or filter by negative stock
  3. Observe report
Expected Result:
  - Report displays products with negative stock:
    - Candy: -3 units
    - Gum: -1 units
  - "Soda" NOT in report (positive stock)
  - Visual indicators (red highlight, warning icons)
  - Can sort by discrepancy severity
  - Actions available: "Adjust Stock" button
Pass Criteria: Negative stock products listed in report
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.2.1-N01
Preconditions: 
  - All products have stock ≥ 0
Steps:
  1. View Inventory Discrepancy Report
Expected Result:
  - Report shows no discrepancies
  - Message: "No inventory discrepancies found"
  - Empty table or success message
  - Indicates healthy inventory state
Pass Criteria: Report handles no discrepancies gracefully
```

---

### FR-8.2.2: Negative Stock Display Format

**Given/When/Then:**

- **Given** a product has negative stock
- **When** viewing in admin portal
- **Then** negative stock SHALL display as "Out of Stock (-X discrepancy)" with red highlight

**Positive Test Case:**

```
Test ID: TC-FR-8.2.2-P01
Preconditions: 
  - Product "Chips" has stock: -5
Steps:
  1. View Inventory Management page
  2. Locate "Chips" in product list
  3. Observe stock display format
Expected Result:
  - Stock displays: "Out of Stock (-5 discrepancy)"
  - Text color: red
  - Background highlighted in red or pink
  - Warning icon displayed
  - Format clearly indicates negative stock
Pass Criteria: Negative stock formatted correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.2.2-N01
Preconditions: 
  - Product at exact zero stock (not negative)
Steps:
  1. Product "Water" has stock: 0
  2. View in admin portal
Expected Result:
  - Stock displays: "0" or "Out of Stock"
  - NOT displayed as discrepancy (zero is valid)
  - Different formatting than negative stock
  - May have yellow/orange indicator (low stock, not discrepancy)
Pass Criteria: Zero stock distinguished from negative stock
```

---

### FR-8.2.3: Admin Can Reset Negative Stock

**Given/When/Then:**

- **Given** a product has negative stock
- **When** admin adjusts the stock
- **Then** admin SHALL be able to reset negative stock to zero or positive value with "Adjust Stock" button

**Positive Test Case:**

```
Test ID: TC-FR-8.2.3-P01
Preconditions: 
  - Product "Candy" has stock: -7
Steps:
  1. View "Candy" in Inventory Management
  2. Click "Adjust Stock" button
  3. Enter new stock value: 10
  4. Save adjustment
  5. Check updated stock
Expected Result:
  - Stock updated: -7 → 10
  - Adjustment logged in audit trail
  - Admin who made adjustment recorded
  - Timestamp recorded
  - Product now shows as available on kiosk
  - No longer in discrepancy report
Pass Criteria: Negative stock successfully reset to positive
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.2.3-N01
Preconditions: 
  - Product at -3 stock
  - Admin wants to reset to zero
Steps:
  1. Click "Adjust Stock" for product
  2. Enter new value: 0
  3. Save
Expected Result:
  - Stock updated: -3 → 0
  - Zero is valid value
  - Product shows as out of stock (but not discrepancy)
  - Removed from discrepancy report
Pass Criteria: Can reset to zero successfully
```

---

### FR-8.2.4: Admin Manual Reconciliation for Uncertain Payments

**Given/When/Then:**

- **Given** uncertain payment transactions exist (status "PAYMENT_UNCERTAIN")
- **When** admin reconciles them
- **Then** admin SHALL be able to view "Uncertain Payments" report, mark as "CONFIRMED" (deduct inventory) or "REFUNDED" (no action), and manually adjust inventory after verification

**Positive Test Case:**

```
Test ID: TC-FR-8.2.4-P01
Preconditions: 
  - Transaction exists with status "PAYMENT_UNCERTAIN"
  - Transaction items: 2x "Chips" @ 1.50€ each
  - Current "Chips" stock: 10 (not yet deducted)
Steps:
  1. Log into admin portal
  2. Navigate to "Uncertain Payments" report
  3. View transaction details
  4. Verify payment using confirmation audit trail and POS receipt
  5. Confirm payment was successful
  6. Click "Mark as Confirmed" button
  7. Check inventory stock
Expected Result:
  - Uncertain Payments report shows transaction
  - Transaction details displayed (items, amount, timestamp)
  - Admin can verify using confirmation audit entries
  - After marking "Confirmed":
    - Inventory deducted: Chips 10 → 8
    - Transaction status: "PAYMENT_UNCERTAIN" → "COMPLETED"
    - Audit log records admin action and timestamp
    - Transaction removed from uncertain payments list
Pass Criteria: Uncertain payment successfully reconciled as confirmed
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.2.4-N01
Preconditions: 
  - Transaction with status "PAYMENT_UNCERTAIN"
  - Admin verifies customer was NOT actually charged
Steps:
  1. View uncertain payment in report
  2. Check confirmation audit and POS records: payment failed/refunded
  3. Click "Mark as Refunded" button
  4. Confirm action
Expected Result:
  - Transaction status: "PAYMENT_UNCERTAIN" → "REFUNDED"
  - Inventory NOT deducted (remains unchanged)
  - Transaction removed from uncertain payments list
  - Audit log records refund marking
  - Customer contact info shown (if available via trust system)
Pass Criteria: Uncertain payment marked as refunded without inventory deduction
```

---

### FR-8.3: Automatic Inventory Deduction on Purchase

**Given/When/Then:**

- **Given** inventory tracking is enabled and purchase is completed
- **When** payment confirmation is received
- **Then** the system SHALL automatically deduct inventory quantities

**Positive Test Case:**

```
Test ID: TC-FR-8.3-P01
Preconditions: 
  - Inventory tracking enabled
  - Product "Soda" stock: 20 units
  - Customer purchases 3x "Soda"
Steps:
  1. Record initial stock: Soda = 20
  2. Customer adds 3x "Soda" to cart
  3. Customer completes checkout
  4. Manual confirmation recorded by kiosk
  5. Query database for updated stock
Expected Result:
  - Stock automatically deducted: 20 → 17
  - Deduction occurs immediately upon payment confirmation (FR-8.3.1)
  - Formula: new_stock = 20 - 3 = 17 (FR-8.3.2)
  - Transaction logged with inventory change
  - No manual admin intervention required
Pass Criteria: Inventory automatically deducted correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.3-N01
Preconditions: 
  - Inventory tracking enabled
  - Product "Cookie" stock: 2 units
  - Customer purchases 5x "Cookie" (more than available)
  - Customer confirmed out-of-stock purchase (FR-1.6)
Steps:
  1. Initial stock: Cookie = 2
  2. Purchase 5x Cookie (confirmed despite out of stock)
  3. Payment successful
  4. Check updated stock
Expected Result:
  - Stock deducted: 2 - 5 = -3 (negative stock allowed)
  - Inventory goes negative per FR-3.4.1
  - Indicates discrepancy
  - Admin can view in Discrepancy Report
Pass Criteria: Deduction works even resulting in negative stock
```

---

### FR-8.3.1: Deduction Timing on Manual Confirmation

**Given/When/Then:**

- **Given** manual payment confirmation is received from the kiosk
- **When** the confirmation event is persisted
- **Then** deduction SHALL occur immediately upon payment confirmation

**Positive Test Case:**

```
Test ID: TC-FR-8.3.1-P01
Preconditions: 
  - Inventory tracking enabled
  - Real-time monitoring of database
Steps:
  1. Monitor database stock value in real-time
  2. Complete purchase transaction
  3. Observe exact moment of manual confirmation event
  4. Check timestamp of inventory deduction
Expected Result:
  - Inventory deduction timestamp matches payment confirmation timestamp
  - Deduction occurs within 1 second of confirmation
  - No delay between payment success and inventory update
  - Immediate consistency maintained
Pass Criteria: Deduction is immediate (≤1 second after confirmation)
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.3.1-N01
Preconditions: 
  - Payment confirmation delayed (network latency)
Steps:
  1. Simulate slow confirmation service response (5 seconds)
  2. Complete purchase
  3. Observe inventory deduction timing
Expected Result:
  - Inventory NOT deducted until confirmation response received
  - Customer sees "Processing payment..." for 5 seconds
  - After confirmation arrives, deduction occurs immediately
  - Stock not prematurely deducted
Pass Criteria: Deduction waits for confirmation
```

---

### FR-8.3.2: Deduction Formula Allows Negative Results

**Given/When/Then:**

- **Given** inventory deduction is calculated
- **When** deduction formula is applied
- **Then** formula SHALL be: new_stock = current_stock - quantity_purchased (can result in negative values)

**Positive Test Case:**

```
Test ID: TC-FR-8.3.2-P01
Preconditions: 
  - Product "Gum" stock: 5 units
  - Purchase quantity: 3 units
Steps:
  1. Initial stock: 5
  2. Purchase: 3
  3. Calculate: 5 - 3 = 2
  4. Verify result
Expected Result:
  - New stock: 2 units
  - Formula correctly applied
  - Positive result
Pass Criteria: Standard deduction calculation correct
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.3.2-N01
Preconditions: 
  - Product "Candy" stock: 3 units
  - Purchase quantity: 8 units
Steps:
  1. Initial stock: 3
  2. Purchase: 8
  3. Calculate: 3 - 8 = -5
  4. Verify result
Expected Result:
  - New stock: -5 units (negative allowed)
  - Formula produces negative value
  - Negative value stored in database
  - Indicates discrepancy per FR-3.4.2
Pass Criteria: Negative result allowed and stored
```

---

### FR-8.4: Low-Stock Email Notification

**Given/When/Then:**

- **Given** inventory tracking is enabled and product stock reaches threshold
- **When** stock reaches or falls below configured low-stock threshold
- **Then** the system SHALL send email notification to configured admin email address(es)

**Positive Test Case:**

```
Test ID: TC-FR-8.4-P01
Preconditions: 
  - Inventory tracking enabled
  - Product "Chips" stock: 6 units
  - Low-stock threshold: 5 units
  - Admin email configured: admin@example.com
Steps:
  1. Customer purchases 2x "Chips"
  2. Stock updates: 6 → 4 (now below threshold of 5)
  3. Check admin email inbox
Expected Result:
  - Email notification sent to admin@example.com
  - Email subject: "Low Stock Alert: Chips"
  - Email body includes (FR-8.4.3):
    - Product name: "Chips"
    - Current stock: 4 units
    - Configured threshold: 5 units
    - Timestamp of alert
    - Link to admin portal inventory page
  - Email delivered within 5 minutes (FR-11.2.1)
Pass Criteria: Low-stock email notification sent correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.4-N01
Preconditions: 
  - Product "Soda" stock: 10 units
  - Threshold: 5 units
  - Stock drops to 5 exactly (at threshold, not below)
Steps:
  1. Purchase quantity to bring stock to exactly 5
  2. Check if email sent
Expected Result:
  - Email sent when stock reaches threshold (≤5 includes 5)
  - Notification sent at threshold boundary
  - "Reaches or falls below" means ≤ not just <
Pass Criteria: Email sent at exact threshold value
```

---

### FR-8.4.1: Low-Stock Notification Sent Once

**Given/When/Then:**

- **Given** stock has reached low-stock threshold
- **When** additional purchases occur
- **Then** notification SHALL be sent once when threshold is reached, no repeat until stock is replenished above threshold

**Positive Test Case:**

```
Test ID: TC-FR-8.4.1-P01
Preconditions: 
  - Product "Candy" stock: 6 units
  - Threshold: 5 units
Steps:
  1. Purchase 2 units: stock 6 → 4 (below threshold, email sent)
  2. Purchase 1 unit: stock 4 → 3 (still below threshold)
  3. Purchase 1 unit: stock 3 → 2 (still below threshold)
  4. Check admin email inbox
Expected Result:
  - Only 1 email sent (when stock first dropped to 4)
  - No additional emails for subsequent drops to 3 and 2
  - Prevents email spam
  - Email counter reset only when stock rises above threshold
Pass Criteria: Only one notification until stock replenished
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.4.1-N01
Preconditions: 
  - Product "Drink" stock: 3 (below threshold of 5)
  - Email already sent
  - Admin restocks to 10 units
Steps:
  1. Stock at 3 (below threshold, email already sent)
  2. Admin manually updates stock: 3 → 10 (above threshold)
  3. Customer purchases 6 units: stock 10 → 4 (below threshold again)
  4. Check email inbox
Expected Result:
  - New email sent when stock falls below threshold again
  - Replenishment above threshold resets notification flag
  - Second low-stock alert is appropriate (restocking reset the flag)
Pass Criteria: Notification resets after replenishment
```

---

### FR-8.4.2: No Repeat Notification (Email Spam Prevention)

**Given/When/Then:**

- **Given** low-stock notification has been sent
- **When** stock remains below threshold
- **Then** no repeat notification SHALL be sent until stock is replenished above threshold

**Positive Test Case:**

```
Test ID: TC-FR-8.4.2-P01
Preconditions: 
  - Product "Gum" stock dropped from 10 → 3 (below threshold 5)
  - Initial email sent
Steps:
  1. Stock at 3, email sent (flag set)
  2. Stock further drops to 2, 1, 0, -1
  3. Count emails received
Expected Result:
  - Only 1 email total
  - No emails for drops from 3 → 2 → 1 → 0 → -1
  - Email spam prevented
  - Flag remains set while stock below threshold
Pass Criteria: No spam emails for continued low stock
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.4.2-N01
Preconditions: 
  - Multiple products below threshold simultaneously
Steps:
  1. Product A drops below threshold: email sent
  2. Product B drops below threshold: email sent
  3. Product C drops below threshold: email sent
Expected Result:
  - Separate email for each product (3 emails total)
  - Each product tracked independently
  - No spam for individual products (only 1 per product)
  - Multiple products can trigger multiple emails (expected)
Pass Criteria: Per-product notification tracking
```

---

### FR-8.4.3: Low-Stock Email Content

**Given/When/Then:**

- **Given** low-stock email is sent
- **When** email is received
- **Then** email content SHALL include: product name, current stock quantity, configured threshold, timestamp, link to admin portal inventory page

**Positive Test Case:**

```
Test ID: TC-FR-8.4.3-P01
Preconditions: 
  - Product "Chips" triggers low-stock alert
  - Current stock: 4
  - Threshold: 5
  - Timestamp: 2025-11-12 14:30:00
Steps:
  1. Trigger low-stock condition
  2. Receive email
  3. Inspect email content
Expected Result:
  - Subject: "Low Stock Alert: Chips"
  - Body includes:
    ✓ Product name: "Chips"
    ✓ Current stock quantity: "4 units"
    ✓ Configured threshold: "5 units"
    ✓ Timestamp: "2025-11-12 14:30:00 UTC"
    ✓ Link: "View Inventory: https://admin.snackbar.com/inventory"
  - Email is HTML formatted and readable
  - Plain text alternative included
Pass Criteria: All required information in email
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.4.3-N01
Preconditions: 
  - Product with very long name (100 characters)
  - Product name: "Super Extra Long Product Name With Many Words That Reaches Maximum Length Of One Hundred Characters Exactly Here"
Steps:
  1. Long product name triggers low-stock alert
  2. Receive email
  3. Check email formatting
Expected Result:
  - Email displays long product name correctly
  - No truncation or formatting issues
  - Email layout handles long names gracefully
Pass Criteria: Long product names handled in emails
```

---

### FR-8.5: Low-Stock Threshold Configuration

**Given/When/Then:**

- **Given** admin configures low-stock thresholds
- **When** setting thresholds
- **Then** default threshold SHALL be 5 units (applied to new products), admin can override per product (1-99 range), different categories MAY have different defaults

**Positive Test Case:**

```
Test ID: TC-FR-8.5-P01
Preconditions: 
  - Creating new product without specifying threshold
Steps:
  1. Create new product "New Snack"
  2. Do not specify low-stock threshold
  3. Save product
  4. Check product's threshold value
Expected Result:
  - Threshold automatically set to 5 (default)
  - Default applied to all new products
  - Admin can change later if needed
Pass Criteria: Default threshold of 5 applied
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-8.5-N01
Preconditions: 
  - Editing product threshold with invalid values
Steps:
  1. Attempt to set threshold: 0 (below minimum)
  2. Attempt to set threshold: 100 (above maximum)
  3. Attempt to set threshold: -5 (negative)
Expected Result:
  - Validation errors:
    - 0: "Threshold must be between 1 and 99"
    - 100: "Threshold must be between 1 and 99"
    - -5: "Threshold cannot be negative"
  - Invalid thresholds rejected
  - Valid range: 1-99 per FR-8.5
Pass Criteria: Threshold validation enforces 1-99 range
```

---

### FR-9.1: Transaction Log Contents

**Given/When/Then:**

- **Given** transactions occur
- **When** logged to database
- **Then** log SHALL contain: transaction ID (UUID), date/time (ISO 8601), items purchased (names and IDs), quantities, total amount, payment status, admin who reconciled (if applicable)

**Positive Test Case:**

```
Test ID: TC-FR-9.1-P01
Preconditions: 
  - Customer completes purchase
  - Cart: 2x "Coca-Cola" @ 2.50€, 1x "Chips" @ 1.50€
  - Total: 6.50€
Steps:
  1. Complete purchase successfully
  2. Query Transaction table in database
  3. Query TransactionItem table
  4. Verify all fields
Expected Result:
  - Transaction record created:
    - TransactionID: valid UUID (e.g., "550e8400-e29b-41d4-a716-446655440000")
    - Timestamp: ISO 8601 format (e.g., "2025-11-12T14:30:00Z")
    - TotalAmount: 6.50
    - PaymentStatus: "COMPLETED"
    - ConfirmationReferenceCode: "CONF-2025-11-12-145500"
  - TransactionItem records (2 items):
    - Item 1: ProductID (Coca-Cola UUID), ProductName "Coca-Cola", Quantity 2, PriceAtPurchase 2.50
    - Item 2: ProductID (Chips UUID), ProductName "Chips", Quantity 1, PriceAtPurchase 1.50
  - All required fields populated
Pass Criteria: Complete transaction log with all required data
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-9.1-N01
Preconditions: 
  - Transaction with uncertain payment (reconciled by admin)
Steps:
  1. Transaction initially logged as "PAYMENT_UNCERTAIN"
  2. Admin "admin2@example.com" reconciles as "COMPLETED"
  3. Query transaction record
Expected Result:
  - Transaction fields include:
    - PaymentStatus: "COMPLETED" (updated from UNCERTAIN)
    - ReconciledBy: UUID of admin2
    - ReconciledAt: timestamp of reconciliation
  - Audit trail shows who resolved uncertain payment (FR-5.3.3)
Pass Criteria: Reconciliation admin recorded in transaction log
```

---

### FR-9.2: No Customer Personal Data in Logs

**Given/When/Then:**

- **Given** transactions are logged
- **When** viewing transaction history
- **Then** transaction history SHALL NOT include individual customer identification (no names, phone numbers, or personal data)

**Positive Test Case:**

```
Test ID: TC-FR-9.2-P01
Preconditions: 
  - Multiple transactions exist in database
Steps:
  1. Query Transaction and TransactionItem tables
  2. Inspect all fields and columns
  3. Verify no personal data fields exist
Expected Result:
  - No fields for customer name
  - No phone number fields
  - No email address fields
  - No customer account IDs
  - Anonymous transaction logs
  - Only transaction details: items, amounts, timestamps
  - Trust-based system with anonymous purchases
Pass Criteria: Zero customer personal data in transaction logs
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-9.2-N01
Preconditions: 
  - Testing if manual confirmation reference could reveal customer identity
Steps:
  1. Review confirmation reference stored in system
  2. Verify it's just a transaction reference, not customer PII
Expected Result:
  - Confirmation reference is anonymous
  - Does not contain customer phone number or name
  - Used only for payment reconciliation
  - GDPR compliance maintained (NFR-11)
Pass Criteria: Confirmation reference code is anonymous
```

---

### FR-9.3: Data Retention Policy

**Given/When/Then:**

- **Given** transaction data accumulates over time
- **When** managing data retention
- **Then** system SHALL: retain transactions minimum 3 years, allow archival/deletion after 3 years at admin discretion, alert at 80% storage capacity, provide archive/export before deletion, keep archived data exportable in CSV

**Positive Test Case:**

```
Test ID: TC-FR-9.3-P01
Preconditions: 
  - Transactions from 3 years ago exist
  - Admin wants to archive old data
Steps:
  1. Navigate to admin portal
  2. Access "Data Management" or "Archive" section
  3. Filter transactions older than 3 years
  4. Click "Export to CSV" for archive
  5. Download archive file
  6. Mark transactions for deletion
  7. Confirm deletion
Expected Result:
  - Transactions ≥3 years old can be selected for archival
  - CSV export successful (FR-9.3 requirement)
  - Export contains all transaction data
  - Admin can delete after archiving
  - Archived CSV remains accessible offline
  - Database size reduced after deletion
Pass Criteria: 3-year-old data can be archived and deleted
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-9.3-N01
Preconditions: 
  - Transactions less than 3 years old
Steps:
  1. Attempt to delete transactions from 2 years ago
  2. Observe system response
Expected Result:
  - Deletion prevented or warning shown
  - Message: "Minimum retention period is 3 years"
  - Transactions cannot be deleted before 3-year minimum
  - Protects against premature data loss
Pass Criteria: Minimum 3-year retention enforced
```

---

### FR-9.4: View Transaction History in Admin Portal

**Given/When/Then:**

- **Given** transactions exist in the system
- **When** admin accesses transaction history
- **Then** admins SHALL be able to view transaction history through web portal

**Positive Test Case:**

```
Test ID: TC-FR-9.4-P01
Preconditions: 
  - 150 transactions exist in database
  - Admin logged in
Steps:
  1. Navigate to "Transaction History" page
  2. View transaction list
  3. Observe display format
Expected Result:
  - Transaction history displayed in table format
  - Shows transactions with key info:
    - Transaction ID
    - Date/Time
    - Total Amount
    - Payment Status
    - Items (summary or expandable)
  - List is readable and well-formatted
  - Can click transaction for full details
Pass Criteria: Transaction history viewable in admin portal
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-9.4-N01
Preconditions: 
  - No transactions exist (fresh system)
Steps:
  1. Navigate to Transaction History page
  2. Observe empty state
Expected Result:
  - Empty state message: "No transactions yet"
  - Helpful message or graphic
  - No errors from empty dataset
  - Page remains functional
Pass Criteria: Empty transaction history handled gracefully
```

---

### FR-9.4.1: Transaction History Pagination

**Given/When/Then:**

- **Given** transaction history is displayed
- **When** more than 50 transactions exist
- **Then** transaction history SHALL be paginated (50 transactions per page)

**Positive Test Case:**

```
Test ID: TC-FR-9.4.1-P01
Preconditions: 
  - 125 transactions exist in database
Steps:
  1. Navigate to Transaction History
  2. Observe page 1
  3. Count transactions displayed
  4. Navigate to page 2
  5. Navigate to page 3
Expected Result:
  - Page 1: 50 transactions displayed
  - Page 2: 50 transactions displayed
  - Page 3: 25 transactions displayed
  - Total: 125 transactions across 3 pages
  - Pagination controls functional
  - Can navigate between pages
  - Page numbers displayed: "1, 2, 3"
Pass Criteria: Pagination works correctly with 50 per page
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-9.4.1-N01
Preconditions: 
  - Exactly 50 transactions exist
Steps:
  1. View Transaction History
  2. Check pagination controls
Expected Result:
  - All 50 transactions on page 1
  - No page 2 (exactly 50 fits on one page)
  - Pagination controls show "Page 1 of 1" or hidden
  - Boundary case handled correctly
Pass Criteria: Single page displayed for exactly 50 transactions
```

---

### FR-9.4.2: Transaction History Sorting

**Given/When/Then:**

- **Given** transaction history is displayed
- **When** admin sorts the list
- **Then** transaction history SHALL be sortable by date, amount, status

**Positive Test Case:**

```
Test ID: TC-FR-9.4.2-P01
Preconditions: 
  - Multiple transactions with varying dates, amounts, statuses
Steps:
  1. View Transaction History
  2. Click "Date" column header to sort by date (ascending)
  3. Verify oldest transactions appear first
  4. Click "Date" again to sort descending
  5. Click "Amount" column to sort by amount
  6. Click "Status" column to sort by status
Expected Result:
  - Date sort: transactions ordered chronologically
  - Amount sort: transactions ordered by total (low to high, then high to low)
  - Status sort: transactions grouped by status (alphabetically or by priority)
  - Sort direction toggles (ascending/descending)
  - Visual indicator shows active sort column and direction
Pass Criteria: All three sorting options work correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-9.4.2-N01
Preconditions: 
  - Multiple transactions with same date and amount
Steps:
  1. Sort by date (multiple transactions on 2025-11-12)
  2. Observe sub-sorting
Expected Result:
  - Transactions with same date sorted by secondary criteria (e.g., time, ID)
  - Consistent ordering (not random)
  - No ties handled gracefully
Pass Criteria: Tie-breaking in sorting is consistent
```

---

### FR-9.4.3: Transaction History Filtering

**Given/When/Then:**

- **Given** transaction history is displayed
- **When** admin applies filters
- **Then** transaction history SHALL be filterable by: date range, payment status, product, amount range

**Positive Test Case:**

```
Test ID: TC-FR-9.4.3-P01
Preconditions: 
  - 200 transactions spanning 3 months
  - Various products and statuses
Steps:
  1. Apply date range filter: 2025-10-01 to 2025-10-31
  2. Observe filtered results
  3. Count transactions shown
  4. Apply status filter: "COMPLETED"
  5. Apply product filter: "Coca-Cola"
  6. Apply amount range: 5.00€ to 10.00€
Expected Result:
  - Date range filter: only October transactions shown
  - Status filter: only COMPLETED transactions
  - Product filter: only transactions containing "Coca-Cola"
  - Amount range filter: only transactions totaling 5.00€ - 10.00€
  - Filters can be combined (AND logic)
  - "Clear Filters" button resets all filters
  - Result count displayed: "Showing X of Y transactions"
Pass Criteria: All filter options work and combine correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-9.4.3-N01
Preconditions: 
  - Applying filters that result in zero matches
Steps:
  1. Filter by date range: 2025-01-01 to 2025-01-31 (no transactions)
  2. Observe results
Expected Result:
  - Empty state: "No transactions found matching filters"
  - "Clear Filters" button available
  - No errors from zero results
  - Can modify filters to find transactions
Pass Criteria: Zero-result filters handled gracefully
```

---

### FR-10.1: Statistics Dashboard Display

**Given/When/Then:**

- **Given** transaction data exists
- **When** admin views statistics
- **Then** system SHALL display: most popular products (top 10 by quantity), revenue by time period (daily/weekly/monthly/custom), total revenue, number of transactions, average transaction value

**Positive Test Case:**

```
Test ID: TC-FR-10.1-P01
Preconditions: 
  - 100 transactions in last 30 days
  - Various products sold
  - Total revenue: 350.00€
Steps:
  1. Navigate to "Statistics & Reporting" page
  2. Select date range: "Last 30 Days"
  3. Observe all displayed statistics
Expected Result:
  - Most Popular Products (top 10):
    - Ranked by quantity sold
    - Shows product name and quantity (e.g., "Coca-Cola: 45 units")
  - Revenue by Time Period:
    - Daily view: bar chart showing revenue per day
    - Weekly view: bar chart showing revenue per week
    - Monthly view: bar chart showing revenue per month
  - Total Revenue: "350.00€" for selected period
  - Number of Transactions: "100" for selected period
  - Average Transaction Value: "3.50€" (350.00 / 100)
  - All metrics calculated correctly
  - Charts are visually clear and labeled
Pass Criteria: All required statistics displayed accurately
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-10.1-N01
Preconditions: 
  - No transactions exist (fresh system)
Steps:
  1. Navigate to Statistics page
  2. Observe empty state
Expected Result:
  - Most Popular Products: "No products sold yet"
  - Revenue chart: empty or "No data"
  - Total Revenue: "0.00€"
  - Number of Transactions: "0"
  - Average Transaction Value: "0.00€" or "N/A"
  - No division by zero errors
  - Empty state handled gracefully
Pass Criteria: Statistics page works with zero transactions
```

---

### FR-10.1.1: Date Range Selector Requirements

**Given/When/Then:**

- **Given** admin wants to view statistics for specific period
- **When** using date range selector
- **Then** SHALL provide presets (Today, This Week, This Month, Last 30 Days, Last 3 Months), support custom date range with calendar picker, default to "Last 7 Days", require max 3 clicks for presets, display selected range clearly

**Positive Test Case:**

```
Test ID: TC-FR-10.1.1-P01
Preconditions: 
  - On Statistics page
  - Date range selector visible
Steps:
  1. Observe default date range on page load
  2. Click "This Week" preset button (count clicks: 1)
  3. Observe updated range display
  4. Click "Last 30 Days" preset (count clicks: 1)
  5. Observe updated range display
  6. Click "Custom Range" button
  7. Select start date from calendar picker
  8. Select end date from calendar picker
  9. Observe custom range display
Expected Result:
  - Default on load: "Last 7 Days" (e.g., "Nov 5 - Nov 12, 2025")
  - Preset buttons available:
    ✓ Today
    ✓ This Week
    ✓ This Month
    ✓ Last 30 Days
    ✓ Last 3 Months
    ✓ Custom Range
  - Each preset requires 1 click (max 3 requirement satisfied)
  - Custom range requires 3 clicks: open picker, select start, select end
  - Selected range displayed clearly: "Nov 1, 2025 - Nov 30, 2025"
  - Statistics update immediately after range selection
Pass Criteria: All date range requirements met
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-10.1.1-N01
Preconditions: 
  - Testing custom date range exceeding 1 year
Steps:
  1. Click "Custom Range"
  2. Select start date: 2024-01-01
  3. Attempt to select end date: 2025-06-01 (>1 year span)
Expected Result:
  - Validation error: "Date range cannot exceed 1 year"
  - End date selection blocked or warning shown
  - Must select end date within 1 year of start date
  - Maximum range enforced per FR-10.1.1
Pass Criteria: 1-year maximum range enforced
```

---

### FR-10.1.2: Statistics Auto-Update

**Given/When/Then:**

- **Given** statistics are being displayed
- **When** new transactions are completed
- **Then** statistics SHALL update automatically within 30 seconds

**Positive Test Case:**

```
Test ID: TC-FR-10.1.2-P01
Preconditions: 
  - Admin viewing statistics for "Today"
  - Initial total revenue: 50.00€
  - Initial transaction count: 20
Steps:
  1. View statistics page showing 50.00€ total
  2. Complete new purchase on kiosk: 5.00€
  3. Wait and observe statistics page
  4. Note time when statistics update
Expected Result:
  - Within 30 seconds, statistics automatically update
  - Total revenue: 50.00€ → 55.00€
  - Transaction count: 20 → 21
  - Average transaction value recalculated
  - Popular products chart updates if needed
  - No manual refresh required
  - Real-time or polling mechanism works
Pass Criteria: Statistics update within 30 seconds of new transaction
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-10.1.2-N01
Preconditions: 
  - Admin viewing statistics for "Last Month"
  - New transaction occurs today (outside selected range)
Steps:
  1. View statistics for October 2025
  2. Complete new transaction on November 12, 2025
  3. Observe statistics page
Expected Result:
  - Statistics for October do NOT change
  - New transaction not in October date range
  - Auto-update only affects relevant date ranges
  - "Today" or "This Week" views would update
Pass Criteria: Auto-update respects selected date range
```

---

### FR-10.1.3: Statistics Query Performance

**Given/When/Then:**

- **Given** statistics are queried
- **When** up to 10,000 transactions exist
- **Then** statistics queries SHALL return results within 2 seconds

**Positive Test Case:**

```
Test ID: TC-FR-10.1.3-P01
Preconditions: 
  - Database contains 10,000 transactions
  - Proper indexing on Timestamp field
Steps:
  1. Navigate to Statistics page
  2. Start timer
  3. Select date range covering all 10,000 transactions
  4. Wait for statistics to load
  5. Stop timer when all charts and metrics displayed
Expected Result:
  - Query completes within 2 seconds
  - All statistics displayed:
    - Most popular products calculated
    - Revenue charts rendered
    - Total revenue, count, average calculated
  - Performance requirement met (NFR-2)
  - Page remains responsive
Pass Criteria: Statistics load in ≤2 seconds for 10K transactions
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-10.1.3-N01
Preconditions: 
  - Database contains 50,000 transactions (5x the requirement)
Steps:
  1. Query statistics for all 50,000 transactions
  2. Measure query time
Expected Result:
  - Query may take longer (>2 seconds acceptable)
  - System handles large dataset gracefully
  - Pagination or limits may apply
  - Optional: warning shown for very large date ranges
  - Recommendation to narrow date range
  - No crashes or timeouts
Pass Criteria: System handles beyond-spec data volumes gracefully
```

---

### FR-10.2: Export Statistics to CSV

**Given/When/Then:**

- **Given** admin wants to export transaction data
- **When** export is initiated
- **Then** admins SHALL be able to export statistics and transaction data in CSV format

**Positive Test Case:**

```
Test ID: TC-FR-10.2-P01
Preconditions: 
  - 50 transactions in selected date range
  - Date range: 2025-11-01 to 2025-11-30
Steps:
  1. Navigate to Statistics page
  2. Select date range: Nov 1-30, 2025
  3. Click "Export to CSV" button
  4. Download file
  5. Open CSV in spreadsheet application
Expected Result:
  - CSV file downloaded successfully
  - Filename: "transactions_2025-11-01_to_2025-11-30.csv" (FR-10.2.3)
  - CSV contains all required fields (FR-10.2.1):
    ✓ Transaction ID
    ✓ Date and time (YYYY-MM-DD HH:MM:SS)
    ✓ Items purchased (comma-separated list)
    ✓ Quantities
    ✓ Total amount
    ✓ Payment status
  - All 50 transactions included
  - Data is properly formatted and readable
  - Can be imported into Excel, Google Sheets, etc.
Pass Criteria: CSV export successful with all required data
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-10.2-N01
Preconditions: 
  - Zero transactions in selected range
Steps:
  1. Select date range with no transactions
  2. Click "Export to CSV"
Expected Result:
  - CSV file generated with headers only
  - No data rows (empty dataset)
  - File still downloadable
  - Opens correctly in spreadsheet apps
  - Shows column headers but no data
Pass Criteria: Empty CSV export handled gracefully
```

---

### FR-10.2.1: CSV Export Field Contents

**Given/When/Then:**

- **Given** CSV export is generated
- **When** viewing exported file
- **Then** CSV SHALL include: Transaction ID, Date and time (YYYY-MM-DD HH:MM:SS), Items purchased (comma-separated), Quantities, Total amount, Payment status

**Positive Test Case:**

```
Test ID: TC-FR-10.2.1-P01
Preconditions: 
  - Transaction with multiple items exists
Steps:
  1. Export transaction to CSV
  2. Open CSV file
  3. Inspect row for multi-item transaction
Expected Result:
  - CSV row example:
    ```
    Transaction ID,Date Time,Items,Quantities,Total Amount,Status
    550e8400-e29b-...,2025-11-12 14:30:00,"Coca-Cola, Chips","2, 1",6.50,COMPLETED
    ```
  - All fields present and correctly formatted
  - Multi-item transaction handled (items and quantities in quotes)
  - Date format: YYYY-MM-DD HH:MM:SS (as specified)
Pass Criteria: CSV format matches specification exactly
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-10.2.1-N01
Preconditions: 
  - Product name contains comma (e.g., "Nuts, Salted")
Steps:
  1. Create product with comma in name
  2. Complete transaction
  3. Export to CSV
  4. Open CSV
Expected Result:
  - Product name properly escaped in CSV
  - Either quoted ("Nuts, Salted") or comma replaced
  - CSV parsing works correctly
  - No broken columns from internal commas
Pass Criteria: Special characters in product names handled correctly
```

---

### FR-10.2.2: CSV Export Respects Filters

**Given/When/Then:**

- **Given** transaction history filters are applied
- **When** CSV export is initiated
- **Then** export SHALL respect selected date range filters

**Positive Test Case:**

```
Test ID: TC-FR-10.2.2-P01
Preconditions: 
  - 100 total transactions
  - 25 transactions in November 2025
Steps:
  1. Filter transactions by date: Nov 1-30, 2025
  2. Verify 25 transactions displayed
  3. Click "Export to CSV"
  4. Open exported CSV
  5. Count rows
Expected Result:
  - CSV contains exactly 25 transactions
  - Only transactions from Nov 1-30 included
  - Filtered dataset exported (not all 100)
  - Export respects active filters
Pass Criteria: CSV export matches filtered view
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-10.2.2-N01
Preconditions: 
  - Status filter applied: "FAILED" only
  - 5 failed transactions out of 100 total
Steps:
  1. Apply status filter: FAILED
  2. Export to CSV
  3. Check exported file
Expected Result:
  - CSV contains only 5 failed transactions
  - All have PaymentStatus = "FAILED"
  - Other statuses excluded
  - Filter applied to export
Pass Criteria: Status filter respected in export
```

---

### FR-10.2.3: CSV Export Filename Format

**Given/When/Then:**

- **Given** CSV export is downloaded
- **When** file is saved
- **Then** export files SHALL have meaningful filenames: `transactions_YYYY-MM-DD_to_YYYY-MM-DD.csv`

**Positive Test Case:**

```
Test ID: TC-FR-10.2.3-P01
Preconditions: 
  - Date range selected: 2025-11-01 to 2025-11-30
Steps:
  1. Export CSV for November 2025
  2. Check downloaded filename
Expected Result:
  - Filename: `transactions_2025-11-01_to_2025-11-30.csv`
  - Format matches specification exactly
  - Dates in YYYY-MM-DD format
  - Filename is descriptive and meaningful
  - Easy to identify date range from filename
Pass Criteria: Filename format exactly as specified
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-10.2.3-N01
Preconditions: 
  - Single-day export (same start and end date)
Steps:
  1. Select "Today" preset (Nov 12, 2025)
  2. Export to CSV
  3. Check filename
Expected Result:
  - Filename: `transactions_2025-11-12_to_2025-11-12.csv`
  - Same date for start and end (valid format)
  - Alternative: `transactions_2025-11-12.csv` (simplified for single day)
  - Either format acceptable
Pass Criteria: Single-day export filename logical
```

---

### FR-10.3: JSON Export Deferred to v1.1+

**Given/When/Then:**

- **Given** the system is version 1.0
- **When** looking for JSON export functionality
- **Then** JSON export format is NOT required for v1.0 (deferred to v1.1+)

**Positive Test Case:**

```
Test ID: TC-FR-10.3-P01
Preconditions: 
  - System version 1.0
Steps:
  1. Navigate to Statistics/Export page
  2. Look for export format options
Expected Result:
  - Only CSV export option available
  - No JSON export button/option
  - Feature explicitly deferred to future version
  - CSV export works fully (FR-10.2)
Pass Criteria: JSON export not present in v1.0
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-10.3-N01
Test Status: UNTESTABLE in v1.0
Reason: JSON export is explicitly out of scope for v1.0. This requirement exists only to document that the feature is deferred. No testing required until v1.1+.
```

---

### FR-11.1: System Configuration Settings

**Given/When/Then:**

- **Given** admin accesses System Configuration
- **When** managing settings
- **Then** admins SHALL configure: operating hours (start/end, 24-hour format), notification email addresses (up to 5, comma-separated), inventory tracking enable/disable, maintenance mode (on/off with optional message)

**Positive Test Case:**

```
Test ID: TC-FR-11.1-P01
Preconditions: 
  - Admin logged in
  - On System Configuration page
Steps:
  1. Set operating hours:
     - Start: 08:00
     - End: 19:00
  2. Set notification emails: "admin1@example.com, admin2@example.com, admin3@example.com"
  3. Enable inventory tracking: ON
  4. Set maintenance mode: OFF
  5. Save configuration
  6. Verify settings applied
Expected Result:
  - Operating hours saved: 08:00 - 19:00
  - Email list validated (3 valid emails, under limit of 5)
  - Inventory tracking enabled
  - Maintenance mode disabled
  - Configuration saved to SystemConfiguration table
  - Changes take effect within 10 seconds (FR-11.1.2)
  - Kiosk reflects new operating hours
Pass Criteria: All configuration settings saved and applied
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-11.1-N01
Preconditions: 
  - Testing invalid email configuration
Steps:
  1. Attempt to enter 6 email addresses (exceeds limit of 5)
  2. Attempt to save
Expected Result:
  - Validation error: "Maximum 5 email addresses allowed"
  - Cannot save with more than 5 emails
  - Must remove one email to save
  - Limit enforced per FR-11.1
Pass Criteria: Email address limit enforced
```

---

### FR-11.1.1: Cart Timeout Fixed in v1.0

**Given/When/Then:**

- **Given** system is version 1.0
- **When** looking for cart timeout configuration
- **Then** shopping cart timeout duration SHALL be fixed at 5 minutes (not configurable in v1.0, will be configurable in future)

**Positive Test Case:**

```
Test ID: TC-FR-11.1.1-P01
Preconditions: 
  - System version 1.0
  - On System Configuration page
Steps:
  1. Look for "Cart Timeout" setting
  2. Check for input field or slider
Expected Result:
  - No cart timeout configuration option visible
  - Setting is hardcoded at 5 minutes
  - Documentation states "Fixed at 5 minutes in v1.0"
  - Will be configurable in future version
Pass Criteria: No cart timeout setting in v1.0 configuration
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-11.1.1-N01
Test Status: UNTESTABLE - Documentation/Planning Requirement
Reason: This requirement documents that cart timeout will be configurable in future versions. In v1.0, it's fixed at 5 minutes (tested in FR-2.5). The "will be configurable" aspect is a future roadmap item, not testable in current version.
```

---

### FR-11.1.2: Configuration Changes Take Effect Immediately

**Given/When/Then:**

- **Given** admin makes configuration changes
- **When** changes are saved
- **Then** configuration changes SHALL take effect within 10 seconds

**Positive Test Case:**

```
Test ID: TC-FR-11.1.2-P01
Preconditions: 
  - Operating hours currently: 08:00 - 19:00
  - Kiosk is operational
Steps:
  1. Note current time: 12:00 (within operating hours)
  2. Change operating hours to: 08:00 - 11:00
  3. Save configuration
  4. Start timer
  5. Monitor kiosk display
Expected Result:
  - Within 10 seconds, kiosk switches to "Closed" state
  - Current time (12:00) is now outside new hours (08:00-11:00)
  - Configuration change propagated quickly
  - Kiosk reflects new operating hours
Pass Criteria: Changes applied within 10 seconds
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-11.1.2-N01
Preconditions: 
  - Testing network latency impact
  - Simulated 2-second network delay
Steps:
  1. Configure network delay: 2 seconds
  2. Change maintenance mode: OFF → ON
  3. Measure time to kiosk update
Expected Result:
  - Update occurs within 12 seconds (10s requirement + 2s network delay)
  - System handles network latency
  - Change still propagates successfully
Pass Criteria: Graceful handling of network delays
```

---

### FR-11.1.3: Email Address Validation

**Given/When/Then:**

- **Given** admin enters notification email addresses
- **When** email validation occurs
- **Then** system SHALL validate email addresses using RFC 5322 standard

**Positive Test Case:**

```
Test ID: TC-FR-11.1.3-P01
Preconditions: 
  - On System Configuration page
Steps:
  1. Enter valid email addresses:
     - admin@example.com
     - user.name+tag@example.co.uk
     - test_123@sub.domain.com
  2. Save configuration
Expected Result:
  - All valid emails accepted
  - RFC 5322 compliant format recognized
  - Various valid formats supported:
    ✓ Simple: admin@example.com
    ✓ With plus: user+tag@example.com
    ✓ With underscore: user_name@example.com
    ✓ Subdomain: user@sub.domain.com
  - Configuration saved successfully
Pass Criteria: RFC 5322 valid emails accepted
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-11.1.3-N01
Preconditions: 
  - Testing invalid email formats
Steps:
  1. Enter invalid emails:
     - "notanemail" (no @)
     - "missing@domain" (no TLD)
     - "@example.com" (no local part)
     - "user@" (no domain)
     - "user @example.com" (space before @)
  2. Attempt to save
Expected Result:
  - Validation errors for each invalid email
  - Error message: "Invalid email format: [email]"
  - Cannot save configuration with invalid emails
  - Must correct all emails before saving
Pass Criteria: Invalid emails rejected per RFC 5322
```

---

### FR-11.2: Admin Email Notifications

**Given/When/Then:**

- **Given** configured notification events occur
- **When** events trigger
- **Then** admins SHALL receive email notifications for: low stock alerts, system errors, payment failures, confirmation service downtime (>15 min), database storage reaching 80% capacity

**Positive Test Case:**

```
Test ID: TC-FR-11.2-P01
Preconditions: 
  - Admin email configured: admin@example.com
  - Product stock drops below threshold
Steps:
  1. Trigger low stock condition (covered in FR-8.4)
  2. Trigger system error (simulate uncaught exception)
  3. Trigger payment failure
  4. Check admin email inbox
Expected Result:
  - Email received for low stock alert
  - Email received for system error
  - Email received for payment failure
  - All emails delivered to configured address
  - Each email has appropriate subject and content
Pass Criteria: Email notifications sent for all configured events
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-11.2-N01
Preconditions: 
  - No admin email configured (empty)
Steps:
  1. Clear notification email addresses
  2. Trigger low stock condition
  3. Check error logs
Expected Result:
  - No email sent (no address configured)
  - Event logged: "Email notification skipped: no addresses configured"
  - System continues functioning
  - No errors from missing email config
Pass Criteria: Missing email config handled gracefully
```

---

### FR-11.2.1: Email Delivery Requirements

**Given/When/Then:**

- **Given** email notifications are sent
- **When** delivery is attempted
- **Then** SHALL deliver 95% of notifications within 5 minutes, retry failed sends up to 3 times (exponential backoff: 1min, 5min, 15min), log all attempts (success/failure) with timestamps, alert admin via alternate mechanism if email service down >1 hour

**Positive Test Case:**

```
Test ID: TC-FR-11.2.1-P01
Preconditions: 
  - Email service (SMTP) is operational
  - Low stock alert triggered
Steps:
  1. Trigger email notification
  2. Monitor email delivery
  3. Check email received timestamp
  4. Check notification logs
Expected Result:
  - Email delivered within 5 minutes
  - First attempt succeeds
  - Logged: "Email sent successfully to admin@example.com at 2025-11-12 14:30:15"
  - Meets 95% delivery within 5 minutes requirement
Pass Criteria: Email delivered within 5 minutes
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-11.2.1-N01
Preconditions: 
  - Email service temporarily unavailable (simulated)
Steps:
  1. Simulate SMTP server error
  2. Trigger notification
  3. Monitor retry attempts and timing
  4. Check logs
Expected Result:
  - Attempt 1: fails immediately, schedule retry in 1 minute
  - Attempt 2: fails at T+1min, schedule retry in 5 minutes
  - Attempt 3: fails at T+6min, schedule retry in 15 minutes
  - Attempt 4 (final): at T+21min
  - All attempts logged with timestamps and error messages
  - Exponential backoff: 1min, 5min, 15min as specified
  - After 3 retries, notification marked as failed
Pass Criteria: Retry logic with exponential backoff works correctly
```

---

### FR-11.3: Kiosk System Status Indicator

**Given/When/Then:**

- **Given** admin views admin portal
- **When** checking kiosk status
- **Then** admins SHALL see kiosk system status indicator: Online (green, last activity timestamp), Offline (red, time since last activity), Maintenance Mode (yellow)

**Positive Test Case:**

```
Test ID: TC-FR-11.3-P01
Preconditions: 
  - Kiosk is operational and active
  - Last customer interaction: 2 minutes ago
Steps:
  1. Log into admin portal
  2. View dashboard or system status page
  3. Locate kiosk status indicator
Expected Result:
  - Status displays: "Online" with green indicator (●)
  - Last activity timestamp: "Last activity: 2 minutes ago"
  - Clear visual indication kiosk is operational
Pass Criteria: Online status displayed with timestamp
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-11.3-N01
Preconditions: 
  - Kiosk has been offline for 30 minutes
Steps:
  1. Disconnect kiosk from network (simulate offline)
  2. Wait 30 minutes
  3. View admin portal status indicator
Expected Result:
  - Status displays: "Offline" with red indicator (●)
  - Time since last activity: "Last seen: 30 minutes ago"
  - Warning message: "Kiosk appears to be offline"
  - Admin can take action (investigate, restart, etc.)
Pass Criteria: Offline status clearly indicated
```

---

### FR-11.3.1: Real-Time Status Updates

**Given/When/Then:**

- **Given** kiosk status is displayed in admin portal
- **When** status changes
- **Then** status SHALL update in real-time using WebSocket connection or 10-second polling

**Positive Test Case:**

```
Test ID: TC-FR-11.3.1-P01
Preconditions: 
  - WebSocket connection established
  - Kiosk is online
  - Admin viewing status page
Steps:
  1. Admin views status: "Online"
  2. Disconnect kiosk network
  3. Observe status indicator without manual refresh
Expected Result:
  - Within 10 seconds (or immediately via WebSocket), status updates to "Offline"
  - No manual refresh required
  - Real-time update works
  - Status remains current
Pass Criteria: Status updates automatically within 10 seconds
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-11.3.1-N01
Preconditions: 
  - WebSocket connection unavailable/fails
Steps:
  1. Disable WebSocket functionality
  2. View kiosk status
  3. Change kiosk state
  4. Observe update timing
Expected Result:
  - Fallback to 10-second polling activated
  - Status still updates automatically
  - Maximum 10-second delay for updates
  - Graceful degradation from WebSocket to polling
Pass Criteria: Polling fallback works when WebSocket unavailable
```

---

### FR-12.1: Admin Pricing Control

**Given/When/Then:**

- **Given** admin manages product prices
- **When** setting/changing prices
- **Then** admins SHALL have full control over product pricing with constraints: 0.01-999.99 EUR range, 2 decimal places required, changes effective immediately on kiosk

**Positive Test Case:**

```
Test ID: TC-FR-12.1-P01
Preconditions: 
  - Product "Soda" current price: 2.50€
  - Kiosk displaying product
Steps:
  1. Admin changes "Soda" price to 2.75€
  2. Save changes
  3. View kiosk (no manual refresh)
Expected Result:
  - Price updated in database: 2.50€ → 2.75€
  - Price on kiosk updates within 5 seconds (FR-6.2.1)
  - New price effective immediately for new purchases
  - Admin has full control over pricing
Pass Criteria: Price changes immediately effective
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-12.1-N01
Preconditions: 
  - Testing boundary values
Steps:
  1. Set price to 0.01€ (minimum)
  2. Set price to 999.99€ (maximum)
  3. Verify acceptance
Expected Result:
  - Minimum price 0.01€ accepted
  - Maximum price 999.99€ accepted
  - Both save successfully
  - Displayed correctly on kiosk
  - Boundary values validated per FR-6.1.1
Pass Criteria: Min/max boundary prices accepted
```

---

### FR-12.2: Pricing Features NOT Required

**Given/When/Then:**

- **Given** system pricing capabilities
- **When** reviewing requirements
- **Then** system does NOT require support for: discounts/promotional pricing, special pricing tiers (member vs non-member), time-based pricing (happy hour), multiple currencies (EUR only)

**Positive Test Case:**

```
Test ID: TC-FR-12.2-P01
Preconditions: 
  - Review product management interface
Steps:
  1. Navigate to product add/edit page
  2. Look for discount/promotion fields
  3. Look for pricing tier options
  4. Look for time-based pricing
  5. Look for currency selector
Expected Result:
  - No discount/promotion fields present
  - No pricing tier options (all customers pay same price)
  - No time-based pricing options
  - No currency selector (EUR only, hardcoded)
  - Simple flat pricing only
Pass Criteria: Advanced pricing features absent (not required)
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-12.2-N01
Test Status: UNTESTABLE - Negative Requirement
Reason: This requirement explicitly states features that are NOT included. There's no testable behavior to verify beyond confirming absence (covered in positive test). This is a scoping/documentation requirement clarifying what's out of scope for v1.0.
```

---

### FR-12.3: No Tax Handling Required

**Given/When/Then:**

- **Given** product prices are set
- **When** displayed to customers
- **Then** system does NOT require tax handling functionality (prices are final/inclusive)

**Positive Test Case:**

```
Test ID: TC-FR-12.3-P01
Preconditions: 
  - Product "Chips" price: 1.50€
Steps:
  1. View product on kiosk: 1.50€
  2. Add to cart
  3. View cart total
  4. Complete checkout
  5. View transaction receipt/confirmation
Expected Result:
  - Price shown everywhere: 1.50€ (no tax calculation)
  - Cart total: sum of item prices (no added tax)
  - Checkout amount matches cart total exactly
  - No "Tax" or "VAT" line items
  - Prices are final/inclusive (tax built in if applicable)
Pass Criteria: No separate tax calculations anywhere
```

**Negative/Edge Case Test:**

```
Test ID: TC-FR-12.3-N01
Test Status: UNTESTABLE - Negative Requirement
Reason: This requirement states tax handling is NOT required. Positive test confirms absence. There's no "edge case" for a feature that doesn't exist. This is a scoping clarification, not a testable functional requirement.
```

---

## 3. Non-Functional Requirements

### NFR-1: Kiosk Interface Performance Targets

**Given/When/Then:**

- **Given** the kiosk interface is operational
- **When** users interact with the interface
- **Then** the kiosk SHALL meet specified performance targets for various operations

**Positive Test Case:**

```
Test ID: TC-NFR-1-P01
Preconditions: 
  - Kiosk operational
  - Performance monitoring tools active
Steps:
  1. Measure filter/category change response (NFR-1.1)
  2. Measure cart operations response (NFR-1.2)
  3. Measure product grid load time (NFR-1.3)
  4. Measure QR code generation time (NFR-1.4)
  5. Measure page transitions (NFR-1.5)
Expected Result:
  - All performance targets met (detailed in sub-requirements)
  - System feels responsive to users
  - No lag or delays
Pass Criteria: Overall performance meets all targets
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-1-N01
Preconditions: 
  - Simulated slow network (3G speed)
Steps:
  1. Throttle network to 3G speeds (~1 Mbps)
  2. Test all operations
  3. Measure performance
Expected Result:
  - Performance may degrade below targets
  - System still functions (no crashes)
  - Graceful degradation on slow networks
  - Minimum 5 Mbps recommended per Section 2.3
Pass Criteria: Graceful handling of sub-optimal conditions
```

---

### NFR-1.1: Filter/Category Change Response Time

**Given/When/Then:**

- **Given** user changes product filter/category
- **When** measuring response time
- **Then** filter/category changes SHALL update product display within 300ms (90th percentile)

**Positive Test Case:**

```
Test ID: TC-NFR-1.1-P01
Preconditions: 
  - 50 products in system
  - High-precision timer available
Steps:
  1. Measure 100 category filter changes
  2. Record response time for each
  3. Calculate 90th percentile
Expected Result:
  - 90% of filter changes complete within 300ms
300ms
  - Fast, responsive interface
Pass Criteria: 90th percentile filter response ≤300ms
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-1.1-N01
Preconditions: 
  - 500 products in system (10x normal load)
  - Testing performance under load
Steps:
  1. Load kiosk with 500 products
  2. Measure 100 category filter changes
  3. Calculate 90th percentile response time
Expected Result:
  - Performance may degrade with excessive products
  - System still functions (no crashes)
  - Response time may exceed 300ms under extreme load
  - Graceful degradation
  - Recommendation: limit products to ~100 for optimal performance
Pass Criteria: System handles load gracefully even if slower
```

---

### NFR-1.2: Cart Operations Response Time

**Given/When/Then:**

- **Given** user performs cart operations
- **When** measuring response time
- **Then** cart operations (add/remove/edit items) SHALL reflect in UI within 200ms (90th percentile)

**Positive Test Case:**

```
Test ID: TC-NFR-1.2-P01
Preconditions: 
  - Cart contains 5 items
  - High-precision timer available
Steps:
  1. Measure 100 cart operations:
     - Add item to cart
     - Remove item from cart
     - Increase quantity (+)
     - Decrease quantity (-)
  2. Record response time for each
  3. Calculate 90th percentile
Expected Result:
  - 90% of cart operations complete within 200ms
  - UI updates immediately feel responsive
  - Subtotal and total recalculate instantly
  - No lag or delay perceived by user
Pass Criteria: 90th percentile cart operation response ≤200ms
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-1.2-N01
Preconditions: 
  - Cart contains 50 items (extreme edge case)
Steps:
  1. Add 50 different items to cart
  2. Measure cart operation performance
  3. Test +/- quantity on each item
Expected Result:
  - Performance may degrade with 50 items
  - Operations still complete (no crashes)
  - May exceed 200ms target under extreme load
  - System remains functional
  - Practical limit: recommend max 20-30 items per cart
Pass Criteria: Extreme load handled without crashes
```

---

### NFR-1.3: Product Grid Initial Load Time

**Given/When/Then:**

- **Given** kiosk home screen is loading
- **When** measuring initial load time
- **Then** product grid initial load SHALL complete within 2 seconds (95th percentile)

**Positive Test Case:**

```
Test ID: TC-NFR-1.3-P01
Preconditions: 
  - 50 products in database
  - Normal network conditions (5 Mbps)
  - Images optimized (<200KB each)
Steps:
  1. Clear browser cache
  2. Measure 100 page loads (cold start)
  3. Start timer when navigation begins
  4. Stop timer when all products visible and images loaded
  5. Calculate 95th percentile
Expected Result:
  - 95% of page loads complete within 2 seconds
  - All products visible
  - Images loaded (or lazy-loading started)
  - Page is interactive
Pass Criteria: 95th percentile load time ≤2 seconds
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-1.3-N01
Preconditions: 
  - Slow network (2 Mbps, below recommended 5 Mbps)
  - 50 products with images
Steps:
  1. Throttle network to 2 Mbps
  2. Measure page load time
Expected Result:
  - Load time likely exceeds 2 seconds
  - Page still loads successfully
  - Images may load progressively
  - Lazy loading helps performance
  - Graceful degradation on slow networks
Pass Criteria: Page loads successfully even on slow network
```

---

### NFR-1.4: Confirmation Prompt Display Time

**Given/When/Then:**

- **Given** checkout is initiated
- **When** measuring manual confirmation prompt display
- **Then** the prompt SHALL render within 1 second

**Positive Test Case:**

```
Test ID: TC-NFR-1.4-P01
Preconditions: 
  - Confirmation service responsive
  - Cart has items totaling 5.00€
Steps:
  1. Proceed to checkout
  2. Start high-precision timer
  3. Tap "Confirm Payment" initiation control
  4. Stop timer when manual confirmation prompt fully rendered
  5. Repeat 20 times
  6. Calculate average and max time
Expected Result:
  - Average display time: <500ms
  - Maximum display time: ≤1000ms (1 second)
  - Prompt appears quickly
  - Feels instant to user
Pass Criteria: Confirmation prompt displayed in ≤1 second
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-1.4-N01
Preconditions: 
  - Confirmation service has 800ms latency
Steps:
  1. Simulate confirmation service latency: 800ms
  2. Measure prompt display time
Expected Result:
  - Display time: ~800-900ms (within 1 second limit)
  - Loading indicator shown during wait
  - Still meets 1-second requirement
  - Service latency is largest factor
Pass Criteria: Meets 1-second requirement even with service latency
```

---

### NFR-1.5: Page Transition Time

**Given/When/Then:**

- **Given** user navigates between screens
- **When** measuring transitions
- **Then** page transitions SHALL complete within 500ms

**Positive Test Case:**

```
Test ID: TC-NFR-1.5-P01
Preconditions: 
  - Kiosk operational
  - Multiple screens available
Steps:
  1. Measure transitions:
     - Home → Product Detail: measure time
     - Product Detail → Cart: measure time
     - Cart → Checkout: measure time
     - Checkout → Success: measure time
  2. Repeat each 20 times
  3. Calculate average for each
Expected Result:
  - All transitions average <300ms
  - Maximum transition time ≤500ms
  - Smooth, responsive feel
  - No jarring delays
Pass Criteria: All page transitions ≤500ms
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-1.5-N01
Preconditions: 
  - Low-end device (minimum spec: 2-core CPU, 4GB RAM)
Steps:
  1. Test on minimum specification device
  2. Measure page transitions
Expected Result:
  - Transitions may be slower on low-end device
  - Should still complete within 500ms
  - If exceeding 500ms, consider device too slow
  - Minimum specs should support target performance
Pass Criteria: Minimum spec device meets 500ms target
```

---

### NFR-2: Concurrent User Support

**Given/When/Then:**

- **Given** the system is deployed
- **When** checking concurrent user capacity
- **Then** the system SHALL support one concurrent user (single kiosk deployment)

**Positive Test Case:**

```
Test ID: TC-NFR-2-P01
Preconditions: 
  - Single kiosk device
  - Single user accessing kiosk
Steps:
  1. User browses products
  2. User adds items to cart
  3. User completes purchase
  4. Verify single-user experience is optimal
Expected Result:
  - System designed for one user at a time
  - All performance targets met
  - No concurrent user conflicts
  - Single kiosk = single user model
Pass Criteria: Single user experience is smooth and performant
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-2-N01
Test Status: UNTESTABLE - By Design
Reason: System is explicitly designed for single concurrent user (one kiosk). There's no multi-user scenario to test. This is an architectural constraint, not a testable behavior. Testing "what if two people try to use one touchscreen simultaneously" is not a valid test case—it's a physical limitation of the hardware.
```

---

### NFR-3: Image Optimization Requirements

**Given/When/Then:**

- **Given** product images are uploaded
- **When** served to kiosk
- **Then** images SHALL be optimized: resized to max 800x600px, compressed to <200KB, served in WebP (JPEG fallback), lazy-loaded, cached 24 hours

**Positive Test Case:**

```
Test ID: TC-NFR-3-P01
Preconditions: 
  - Product with optimized image uploaded
Steps:
  1. Upload product image (original: 4000x3000px, 5MB)
  2. Verify processing (FR-6.5)
  3. Inspect served image on kiosk:
     - Check dimensions
     - Check file size
     - Check format (WebP)
     - Check caching headers
Expected Result:
  - Image resized to 800x600px
  - File size <200KB
  - Served as WebP format
  - JPEG fallback available for old browsers
  - Cache-Control header: max-age=86400 (24 hours)
  - Images lazy-load as user scrolls
Pass Criteria: All image optimization requirements met
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-3-N01
Preconditions: 
  - Browser doesn't support WebP (legacy browser)
Steps:
  1. Access kiosk with browser lacking WebP support
  2. View product images
  3. Inspect served image format
Expected Result:
  - JPEG fallback served instead of WebP
  - Image still displays correctly
  - File size still <200KB
  - Dimensions still 800x600px
  - Graceful degradation for older browsers
Pass Criteria: JPEG fallback works for non-WebP browsers
```

---

### NFR-4: System Availability During Operating Hours

**Given/When/Then:**

- **Given** operating hours are configured
- **When** system is running
- **Then** the system SHALL be available during configured operating hours (default 08:00-19:00)

**Positive Test Case:**

```
Test ID: TC-NFR-4-P01
Preconditions: 
  - Operating hours: 08:00-19:00
  - System monitoring in place
Steps:
  1. Monitor system availability during operating hours (1 week)
  2. Record all downtime incidents
  3. Calculate uptime percentage
Expected Result:
  - System is available during 08:00-19:00
  - Users can browse and purchase
  - All functions operational
  - Minimal unplanned downtime
Pass Criteria: System is accessible during operating hours
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-4-N01
Preconditions: 
  - Current time is outside operating hours (e.g., 22:00)
Steps:
  1. Access kiosk at 22:00
  2. Observe system state
Expected Result:
  - "Closed" message displayed (FR-4.1)
  - System is "available" but shows closed status
  - This is expected behavior, not downtime
  - Availability requirement applies to operating hours only
Pass Criteria: Closed status outside hours is not "downtime"
```

---

### NFR-4.1: Target Uptime (99% During Operating Hours)

**Given/When/Then:**

- **Given** operating hours are 11 hours/day (08:00-19:00)
- **When** measuring uptime
- **Then** target uptime SHALL be 99% during operating hours (allows ~2.5 hours downtime per month)

**Positive Test Case:**

```
Test ID: TC-NFR-4.1-P01
Preconditions: 
  - Operating hours: 08:00-19:00 (11 hours/day)
  - Monitoring over 30-day period
Steps:
  1. Monitor uptime for 30 days during operating hours
  2. Total operating hours: 11 hours × 30 days = 330 hours
  3. Record all downtime (planned + unplanned)
  4. Calculate uptime percentage: (operating hours - downtime) / operating hours × 100
Expected Result:
  - Uptime ≥99%
  - Maximum allowed downtime: 330 hours × 0.01 = 3.3 hours/month
  - Target: <2.5 hours downtime per month
  - Actual downtime should be minimal
Pass Criteria: Uptime ≥99% over measurement period
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-4.1-N01
Test Status: UNTESTABLE - Statistical Target
Reason: 99% uptime is a statistical target measured over time, not a specific testable behavior. This requires long-term monitoring (weeks/months) and cannot be verified in a single test case. Uptime is measured in production through monitoring tools, not functional testing.
```

---

### NFR-5: Constant Internet Connectivity Required

**Given/When/Then:**

- **Given** the kiosk is operational
- **When** checking system requirements
- **Then** the system SHALL require constant internet connectivity (NOT required to function offline)

**Positive Test Case:**

```
Test ID: TC-NFR-5-P01
Preconditions: 
  - Kiosk connected to internet (5 Mbps)
  - All services online
Steps:
  1. Verify internet connection active
  2. Browse products
  3. Add items to cart
  4. Complete checkout (manual confirmation requires service connectivity)
  5. Admin portal accessible remotely
Expected Result:
  - All functions work with internet connection
  - Confirmation service accessible
  - Real-time updates work
  - Admin portal accessible
  - System fully functional online
Pass Criteria: Full functionality with internet connection
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-5-N01
Preconditions: 
  - Kiosk loses internet connection
Steps:
  1. Disconnect kiosk from network
  2. Attempt to browse products
  3. Attempt to checkout
  4. Observe system behavior
Expected Result:
  - System displays error: "No internet connection"
  - Cannot complete purchases (confirmation service unavailable)
  - Cannot sync data
  - System does NOT have offline mode
  - Clear message to user about connectivity issue
  - Offline functionality is NOT required (per NFR-5)
Pass Criteria: System clearly indicates internet is required
```

---

### NFR-6: Transaction Data Persistence

**Given/When/Then:**

- **Given** a transaction is completed
- **When** data is saved
- **Then** transaction data SHALL be persisted to database immediately (within 1 second) to prevent data loss

**Positive Test Case:**

```
Test ID: TC-NFR-6-P01
Preconditions: 
  - Database monitoring enabled
  - Transaction ready to complete
Steps:
  1. Complete a purchase transaction
  2. Note exact timestamp of payment confirmation
  3. Query database for transaction record
  4. Check timestamp of database write
  5. Calculate delay: DB write time - confirmation time
Expected Result:
  - Transaction written to database within 1 second of confirmation
  - Data persisted immediately
  - No risk of data loss
  - Database write confirmed before showing success message
Pass Criteria: Transaction persisted within 1 second
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-6-N01
Preconditions: 
  - Simulated power failure immediately after purchase
Steps:
  1. Complete payment
  2. Verify transaction written to database
  3. Simulate sudden power loss (within 1 second of payment)
  4. Restart system
  5. Check if transaction is in database
Expected Result:
  - If database write completed before power loss: transaction saved
  - If power lost before database write: transaction may be lost (edge case)
  - Manual confirmation audit logs provide reconciliation fallback
  - 1-second write window minimizes this risk
  - Database transactions use ACID properties
Pass Criteria: Minimal risk window for data loss
```

---

### NFR-7: Automated Backup System

**Given/When/Then:**

- **Given** the system is running
- **When** performing backups
- **Then** the system SHALL implement automatic backups: daily full backup at 02:00, retain 30 daily backups, weekly backup retained 12 weeks, separate storage, verification, email on failure

**Positive Test Case:**

```
Test ID: TC-NFR-7-P01
Preconditions: 
  - Backup system configured
  - Current time approaches 02:00
Steps:
  1. Wait for scheduled backup at 02:00
  2. Verify backup starts automatically
  3. Check backup completion
  4. Verify backup file created
  5. Check backup verification/integrity check
  6. Verify backup stored separately from primary DB
Expected Result:
  - Backup starts at 02:00 (during non-operating hours)
  - Full database backup created
  - Backup file stored in separate location
  - Integrity check passes
  - Backup size is reasonable (matches DB size)
  - No errors logged
  - Admin receives success confirmation email (optional)
Pass Criteria: Daily backup completes successfully
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-7-N01
Preconditions: 
  - Backup storage location is full/unavailable
Steps:
  1. Fill backup storage to capacity
  2. Wait for 02:00 backup
  3. Backup fails due to storage full
  4. Check admin notifications
Expected Result:
  - Backup attempt fails
  - Error logged: "Backup failed: insufficient storage"
  - Admin receives email notification immediately
  - Email subject: "Backup Failure Alert"
  - Email includes: error details, timestamp, recommended action
  - Alert per NFR-7 requirement
Pass Criteria: Backup failure triggers admin notification
```

---

### NFR-7.1: Backup Storage Requirement

**Given/When/Then:**

- **Given** backup system is configured
- **When** calculating storage needs
- **Then** backup storage SHALL be minimum 10GB (sufficient for ~50,000 transactions with images)

**Positive Test Case:**

```
Test ID: TC-NFR-7.1-P01
Preconditions: 
  - Backup storage allocated
Steps:
  1. Check backup storage allocation
  2. Verify minimum 10GB available
  3. Calculate storage needed:
     - 30 daily backups × ~300MB each = ~9GB
     - 12 weekly backups × ~300MB each = ~3.6GB
     - Total: ~12.6GB for full retention
Expected Result:
  - Backup storage ≥10GB allocated
  - Sufficient for retention policy (30 daily + 12 weekly)
  - Storage capacity meets requirement
Pass Criteria: Minimum 10GB backup storage allocated
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-7.1-N01
Preconditions: 
  - System has been running for 3 years
  - Database contains 150,000 transactions (3x estimate)
Steps:
  1. Check backup storage usage
  2. Verify if 10GB is still sufficient
Expected Result:
  - Database larger than estimated
  - Backup files may exceed 10GB total
  - Alert triggered at 80% capacity (FR-9.3)
  - Admin can expand storage or archive old backups
  - System alerts admin before running out of space
Pass Criteria: System alerts when backup storage insufficient
```

---

### NFR-8: Secure Password Storage

**Given/When/Then:**

- **Given** admin passwords are stored
- **When** authentication occurs
- **Then** admin authentication SHALL use secure password storage (bcrypt or Argon2, minimum 12 rounds)

**Positive Test Case:**

```
Test ID: TC-NFR-8-P01
Preconditions: 
  - New admin account being created
  - Password: SecurePass123!
Steps:
  1. Create admin account with password
  2. Query database Admin table
  3. Inspect PasswordHash field
  4. Verify hashing algorithm and rounds
Expected Result:
  - Password NOT stored in plaintext
  - PasswordHash field contains hashed value
  - Hash format indicates bcrypt or Argon2
  - bcrypt example: $2b$12$... (12 rounds minimum)
  - Argon2 example: $argon2id$v=19$m=65536...
  - Cannot reverse hash to get original password
Pass Criteria: Passwords hashed with bcrypt/Argon2, ≥12 rounds
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-8-N01
Preconditions: 
  - Testing if plaintext password is ever exposed
Steps:
  1. Create admin account
  2. Check all logs (application, database, network)
  3. Search for plaintext password
Expected Result:
  - Password never logged in plaintext
  - Password never transmitted unencrypted (HTTPS only)
  - Password never stored in cleartext
  - Only hashed value exists in system
  - Security best practices followed
Pass Criteria: Plaintext password never exposed
```

---

### NFR-8.1: Password Requirements

**Given/When/Then:**

- **Given** admin sets/changes password
- **When** validating password strength
- **Then** passwords SHALL meet: minimum 8 characters, at least one uppercase, one lowercase, one number, not in top 10,000 common passwords

**Positive Test Case:**

```
Test ID: TC-NFR-8.1-P01
Preconditions: 
  - Creating/changing admin password
Steps:
  1. Test valid passwords:
     - "Abcdef12" (min 8 chars, uppercase, lowercase, number)
     - "MySecurePass123" (longer, meets all criteria)
     - "Admin2024!" (meets all, includes special char)
  2. Verify each is accepted
Expected Result:
  - All valid passwords accepted
  - Minimum 8 characters enforced
  - Contains uppercase (A-Z)
  - Contains lowercase (a-z)
  - Contains number (0-9)
  - Special characters optional but allowed
Pass Criteria: Valid passwords meeting criteria accepted
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-8.1-N01
Preconditions: 
  - Testing invalid passwords
Steps:
  1. Attempt weak passwords:
     - "password" (common password, no uppercase/number)
     - "12345678" (common, no letters)
     - "abcdefgh" (no uppercase, no number)
     - "ABCDEFGH" (no lowercase, no number)
     - "Abcdefg" (only 7 chars, too short)
     - "Password123" (meets format but in top 10,000 common)
  2. Verify each is rejected
Expected Result:
  - All invalid passwords rejected with specific errors:
    - "password": "Password too common"
    - "12345678": "Must contain uppercase and lowercase letters"
    - "abcdefgh": "Must contain uppercase letter and number"
    - "ABCDEFGH": "Must contain lowercase letter and number"
    - "Abcdefg": "Minimum 8 characters required"
    - "Password123": "Password too common (found in common passwords list)"
Pass Criteria: All invalid passwords rejected with clear error messages
```

---

### NFR-8.2: Image Upload Security

**Given/When/Then:**

- **Given** admin uploads product image
- **When** security checks are performed
- **Then** SHALL include: file extension whitelist, file content validation (magic number), EXIF stripping, filename sanitization, optional virus scanning

**Positive Test Case:**

```
Test ID: TC-NFR-8.2-P01
Preconditions: 
  - Valid JPEG image with EXIF data (GPS, camera model)
Steps:
  1. Upload image with EXIF metadata
  2. Verify security processing:
     - Extension check: .jpg (whitelisted)
     - Magic number check: FFD8FF (valid JPEG)
     - EXIF stripping occurs
     - Filename sanitized
  3. Download processed image
  4. Check for EXIF data in processed image
Expected Result:
  - Upload accepted (valid JPEG)
  - EXIF metadata stripped from final image
  - No GPS coordinates in processed image
  - No camera model info
  - Only image data remains
  - Security processing complete
Pass Criteria: EXIF metadata successfully stripped
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-8.2-N01
Preconditions: 
  - Malicious file disguised as image
Steps:
  1. Rename malware.exe to malware.jpg
  2. Attempt to upload
  3. System performs magic number check
Expected Result:
  - File extension: .jpg (passes whitelist)
  - Magic number check: 4D5A (MZ header = executable, not JPEG FFD8)
  - Upload rejected: "Invalid file type. File content doesn't match extension."
  - Security measure prevents malware upload
  - Magic number validation catches disguised files
Pass Criteria: Disguised executable rejected by magic number check
```

---

### NFR-9: Confirmation Service Security

**Given/When/Then:**

- **Given** payment processing occurs
- **When** communicating with the manual confirmation service
- **Then** SHALL use: HTTPS/TLS 1.2+, service credentials in environment variables (not hardcoded), confirmation data never stored locally (only references and status)

**Positive Test Case:**

```
Test ID: TC-NFR-9-P01
Preconditions: 
  - Manual confirmation service integration active
  - Payment in progress
Steps:
  1. Initiate payment
  2. Monitor network traffic (use browser dev tools)
  3. Verify HTTPS/TLS used for all API calls
  4. Check TLS version
  5. Verify API credentials not in client-side code
  6. Check database for payment data storage
Expected Result:
  - All confirmation service API calls use HTTPS
  - TLS version ≥1.2
  - API key stored in server environment variables (not in code)
  - No hardcoded credentials visible
  - Database stores only:
    - ConfirmationReferenceCode
    - PaymentStatus
    - Transaction amount
  - Database does NOT store:
    - Credit card numbers
    - Customer phone numbers
    - Confirmation service account details
Pass Criteria: Payment security requirements met
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-9-N01
Preconditions: 
  - Reviewing source code
Steps:
  1. Search source code for API keys/credentials
  2. Check for hardcoded confirmation service credentials
  3. Look for credentials in version control history
Expected Result:
  - No hardcoded credentials found
  - API keys referenced from environment variables
  - Example code: `process.env.CONFIRMATION_SERVICE_API_KEY`
  - No credentials committed to Git
  - .env file in .gitignore
  - Security best practices followed
Pass Criteria: No hardcoded credentials in code or version control
```

---

### NFR-10: Admin Session Timeout

**Given/When/Then:**

- **Given** admin is logged in
- **When** 30 minutes pass with no activity
- **Then** admin sessions SHALL timeout after 30 minutes of inactivity

**Positive Test Case:**

```
Test ID: TC-NFR-10-P01
Preconditions: 
  - Admin logged into admin portal
  - Session timeout: 30 minutes
Steps:
  1. Log in at T0
  2. Perform no actions for 30 minutes
  3. At T0 + 30:00, attempt to navigate
  4. Observe response
Expected Result:
  - Session expires at 30 minutes
  - Redirected to login page
  - Message: "Session expired. Please log in again."
  - Must re-authenticate
  - Same as FR-5.4 (tested there)
Pass Criteria: Session timeout after 30 minutes inactivity
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-10-N01
Test Status: DUPLICATE of FR-5.4
Reason: This NFR is identical to FR-5.4 which has comprehensive test cases. Rather than duplicate, refer to FR-5.4 test cases: TC-FR-5.4-P01, TC-FR-5.4-N01, TC-FR-5.4.1-P01, TC-FR-5.4.2-P01.
```

---

### NFR-11: GDPR/Data Privacy (No Personal Customer Data)

**Given/When/Then:**

- **Given** transactions are processed
- **When** reviewing data collection
- **Then** system does NOT require GDPR compliance beyond standard security (no personal customer data collected)

**Positive Test Case:**

```
Test ID: TC-NFR-11-P01
Preconditions: 
  - Multiple transactions completed
  - Database schema reviewed
Steps:
  1. Review all database tables
  2. Check for personal data fields:
     - Customer name
     - Email address
     - Phone number
     - Address
     - Payment details
  3. Review transaction logs
Expected Result:
  - NO customer personal data collected
  - Transaction logs are anonymous
  - Only transaction data: items, amounts, timestamps
  - Trust-based system (no customer accounts)
  - GDPR compliance simplified (no PII)
  - Same as FR-9.2 (tested there)
Pass Criteria: Zero personal customer data in system
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-11-N01
Test Status: DUPLICATE of FR-9.2
Reason: This NFR is identical to FR-9.2 which has comprehensive test cases for verifying no customer personal data. Refer to TC-FR-9.2-P01 and TC-FR-9.2-N01.
```

---

### NFR-11.1: Transaction Logs Are Anonymous

**Given/When/Then:**

- **Given** transactions are logged
- **When** reviewing logs
- **Then** transaction logs SHALL be anonymous by design (no customer identification)

**Positive Test Case:**

```
Test ID: TC-NFR-11.1-P01
Test Status: DUPLICATE of FR-9.2 and NFR-11
Reason: This is tested comprehensively in FR-9.2. No need for separate test case.
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-11.1-N01
Test Status: DUPLICATE of FR-9.2
Reason: Refer to FR-9.2 test cases.
```

---

### NFR-12: Kiosk Interface Usability

**Given/When/Then:**

- **Given** first-time users interact with kiosk
- **When** measuring usability
- **Then** 90% of first-time users SHALL complete purchase without assistance within 60 seconds, task success rate >95% (n=10 test users), max 2 screens from selection to payment, all primary actions visible without scrolling

**Positive Test Case:**

```
Test ID: TC-NFR-12-P01
Preconditions: 
  - Recruit 10 first-time users (students)
  - Users have never used the kiosk before
  - Each user given same task: "Purchase 1 Coca-Cola"
Steps:
  1. Brief user: "Purchase a Coca-Cola using this kiosk"
  2. Start timer when user touches screen
  3. Observe user (no assistance)
  4. Stop timer when payment QR code appears
  5. Record: success/failure, time, assistance needed
  6. Repeat for all 10 users
  7. Calculate success rate and average time
Expected Result:
  - 9+ out of 10 users complete task (90%+ success)
  - Average completion time <60 seconds
  - Task success rate >95%
  - Users find process intuitive
  - Minimal confusion or errors
Pass Criteria: 90% complete purchase within 60 seconds without help
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-12-N01
Preconditions: 
  - Testing with users unfamiliar with touchscreens
  - Elderly users or non-technical users
Steps:
  1. Recruit 5 non-technical users
  2. Same task: purchase one item
  3. Observe completion rate and time
Expected Result:
  - May have lower success rate or longer time
  - System should still be usable
  - Clear visual cues help all users
  - Large buttons and simple flow benefit all
  - Target: 70%+ success for non-technical users
Pass Criteria: System usable even for non-technical users
```

---

### NFR-13: Touchscreen Optimization

**Given/When/Then:**

- **Given** kiosk uses touchscreen interface
- **When** users interact
- **Then** SHALL optimize for touch: all elements ≥44x44px touch target, 8px spacing between targets, visual feedback on touch, no hover-only interactions, momentum/kinetic scrolling

**Positive Test Case:**

```
Test ID: TC-NFR-13-P01
Preconditions: 
  - Kiosk with touchscreen active
  - Browser dev tools for measurement
Steps:
  1. Measure all interactive elements:
     - Buttons (Add to Cart, Checkout, etc.)
     - Category filters
     - Cart +/- buttons
     - Product cards
  2. Measure spacing between adjacent buttons
  3. Test visual feedback (tap button, observe)
  4. Test scrolling behavior
Expected Result:
  - All touch targets ≥44x44px (iOS/Android HIG standard)
  - Minimum 8px spacing between adjacent targets
  - Visual feedback on tap (ripple effect, color change, etc.)
  - No hover-only features (no mouse required)
  - Scrolling uses momentum (flick to scroll, decelerates naturally)
  - Same as FR-4.3 (tested there)
Pass Criteria: All touchscreen optimization requirements met
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-13-N01
Preconditions: 
  - User has large fingers or low dexterity
Steps:
  1. Attempt to tap small targets (if any exist)
  2. Test accuracy of taps
  3. Check for accidental mis-taps
Expected Result:
  - Large touch targets (≥44px) prevent mis-taps
  - Adequate spacing prevents accidental adjacent taps
  - Users can accurately tap intended buttons
  - Accessible to users with motor difficulties
Pass Criteria: Large touch targets accessible to all users
```

---

### NFR-14: Browser Compatibility (Admin Portal)

**Given/When/Then:**

- **Given** admin accesses admin portal
- **When** using standard web browsers
- **Then** SHALL be accessible from: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

**Positive Test Case:**

```
Test ID: TC-NFR-14-P01
Preconditions: 
  - Admin portal deployed
  - Multiple browsers available for testing
Steps:
  1. Test admin portal on:
     - Chrome 90+ (latest)
     - Firefox 88+ (latest)
     - Safari 14+ (latest)
     - Edge 90+ (latest)
  2. Verify all functionality works on each:
     - Login
     - Product management
     - Inventory management
     - Statistics viewing
     - Configuration changes
Expected Result:
  - All features work on all specified browsers
  - Consistent appearance and behavior
  - No browser-specific bugs
  - Modern browser features supported
Pass Criteria: Full functionality on all specified browsers
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-14-N01
Preconditions: 
  - Testing with older browsers (Chrome 80, IE 11)
Steps:
  1. Access admin portal with Chrome 80
  2. Access with Internet Explorer 11
  3. Observe compatibility
Expected Result:
  - Chrome 80 (older than 90): may have issues, display warning
  - IE 11: not supported, display message: "Please use a modern browser (Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+)"
  - Older browsers not guaranteed to work
  - Warning message guides users to upgrade
Pass Criteria: Clear message for unsupported browsers
```

---

### NFR-14.1: Responsive Design (Admin Portal)

**Given/When/Then:**

- **Given** admin accesses portal from different devices
- **When** checking responsive design
- **Then** admin portal SHALL be responsive (works on desktop 1024px+ and tablet 768px+)

**Positive Test Case:**

```
Test ID: TC-NFR-14.1-P01
Preconditions: 
  - Admin portal deployed
  - Browser with responsive design testing tools
Steps:
  1. Test admin portal at different resolutions:
     - Desktop: 1920x1080px
     - Desktop: 1024x768px (minimum desktop)
     - Tablet: 768x1024px (iPad portrait)
     - Tablet: 1024x768px (iPad landscape)
  2. Verify layout adapts to each size
  3. Check all features remain accessible
Expected Result:
  - Layout adapts to screen size
  - All features accessible on 1024px+ desktop
  - All features accessible on 768px+ tablet
  - No horizontal scrolling required
  - Touch-friendly on tablets
  - Readable fonts, usable buttons
Pass Criteria: Responsive design works on desktop and tablet
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-14.1-N01
Preconditions: 
  - Testing on mobile phone (375x667px - below 768px)
Steps:
  1. Access admin portal on phone-sized screen
  2. Observe layout and usability
Expected Result:
  - Layout may not be optimized for phones
  - May have usability issues on small screens
  - Phone support not required (per NFR-14.1)
  - Message: "Admin portal optimized for tablet (768px+) and desktop (1024px+)"
  - Recommends larger screen for admin tasks
Pass Criteria: Mobile phones not required to be supported
```

---

### NFR-15: Error and Confirmation Message Requirements

**Given/When/Then:**

- **Given** system displays messages
- **When** showing errors or confirmations
- **Then** messages SHALL: use ≥18px font (≥24px headings), display ≥3 seconds (dismissible after 2 seconds for confirmations), use color coding (green success, red error, yellow warning), meet WCAG AA contrast (4.5:1 normal, 3:1 large), use plain language, include actionable next steps

**Positive Test Case:**

```
Test ID: TC-NFR-15-P01
Preconditions: 
  - System operational
  - Various message scenarios
Steps:
  1. Trigger success message (complete purchase)
  2. Trigger error message (payment failure)
  3. Trigger warning (out of stock)
  4. Measure each message:
     - Font size
     - Display duration
     - Colors and contrast ratio
     - Language clarity
     - Actionable steps
Expected Result:
  - Success message:
    - Font ≥18px (body), ≥24px (heading)
    - Green color (#28a745)
    - Contrast ratio ≥4.5:1
    - Displayed ≥3 seconds
    - Text: "Payment Complete! You can now take your items."
  - Error message:
    - Font ≥18px
    - Red color (#dc3545)
    - Contrast ≥4.5:1
    - Displayed ≥5 seconds
    - Text: "Payment Failed. Please try again or contact support..."
    - Actionable: "Try Again" button
  - Warning message:
    - Yellow color (#ffc107)
    - Clear next steps
Pass Criteria: All message requirements met for each type
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-15-N01
Preconditions: 
  - Testing message with technical jargon
Steps:
  1. Trigger error that might show technical details
  2. Observe error message text
Expected Result:
  - Error message uses plain language (not: "HTTP 500 Internal Server Error")
  - User-friendly message: "Something went wrong. Please try again."
  - No technical jargon exposed to customers
  - Technical details logged for admin/developers only
  - Follows "plain language" requirement
Pass Criteria: Error messages use plain, non-technical language
```

---

### NFR-16: System Logging

**Given/When/Then:**

- **Given** system is running
- **When** events occur
- **Then** SHALL implement logging for troubleshooting with defined levels (ERROR, WARN, INFO, DEBUG)

**Positive Test Case:**

```
Test ID: TC-NFR-16-P01
Preconditions: 
  - Logging system configured
  - Various events occur
Steps:
  1. Trigger events at different log levels:
     - ERROR: cause system error (invalid API call)
     - WARN: low stock condition
     - INFO: successful transaction
     - DEBUG: API request/response (dev mode only)
  2. Check log files
  3. Verify each event logged correctly
Expected Result:
  - ERROR logged: system errors, API failures, payment failures
  - WARN logged: low stock, API slowness, config changes
  - INFO logged: successful transactions, admin logins, inventory updates
  - DEBUG logged: request/response details (disabled in production per NFR-16.2)
  - All events captured
Pass Criteria: All log levels function correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-16-N01
Preconditions: 
  - Production environment
  - DEBUG level logging
Steps:
  1. Check production log configuration
  2. Verify DEBUG level is disabled
Expected Result:
  - DEBUG logging disabled in production (NFR-16.2)
  - Only ERROR, WARN, INFO active in production
  - DEBUG available in development/staging environments
  - Prevents excessive logging in production
  - Performance not impacted by debug logs
Pass Criteria: DEBUG logging disabled in production
```

---

### NFR-16.1: Log Level Definitions

**Given/When/Then:**

- **Given** logging is active
- **When** events are logged
- **Then** logging levels SHALL be: ERROR (system errors, API failures, payment failures), WARN (low stock, API slowness, config changes), INFO (successful transactions, admin logins, inventory updates), DEBUG (request/response details, disabled in production)

**Positive Test Case:**

```
Test ID: TC-NFR-16.1-P01
Test Status: DUPLICATE of NFR-16
Reason: Log level definitions are tested in NFR-16 test cases. No separate testing needed.
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-16.1-N01
Test Status: DUPLICATE of NFR-16
Reason: Covered in NFR-16 test cases.
```

---

### NFR-16.2: Log Entry Contents

**Given/When/Then:**

- **Given** an event is logged
- **When** writing to log file
- **Then** logs SHALL include: timestamp (ISO 8601), log level, component/module name, message, request ID (for tracing)

**Positive Test Case:**

```
Test ID: TC-NFR-16.2-P01
Preconditions: 
  - Logging active
  - Sample event occurs
Steps:
  1. Trigger a loggable event (e.g., successful purchase)
  2. Read log file
  3. Inspect log entry format
Expected Result:
  - Log entry example:
    ```
    2025-11-12T10:15:30Z [INFO] [PaymentService] Transaction completed successfully. TransactionID: 550e8400-e29b-41d4-a716-446655440000 | RequestID: req_abc123
    ```
  - Contains timestamp: "2025-11-12T10:15:30Z" (ISO 8601 format)
  - Contains log level: "[INFO]"
  - Contains component: "[PaymentService]"
  - Contains message: "Transaction completed successfully..."
  - Contains request ID: "RequestID: req_abc123"
  - All required fields present
Pass Criteria: Log entries contain all required fields
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-16.2-N01
Preconditions: 
  - Multiple concurrent requests
Steps:
  1. Send 5 concurrent requests
  2. Check logs for all 5
  3. Verify request ID tracking
Expected Result:
  - Each request has unique Request ID
  - Can trace all log entries for single request using Request ID
  - Request IDs help with debugging concurrent operations
  - Request ID propagates through all log entries for that request
Pass Criteria: Request IDs enable tracing across log entries
```

---

### NFR-17: Admin Error Log Access

**Given/When/Then:**

- **Given** admin is logged in
- **When** accessing logs
- **Then** system SHALL provide error logs accessible to administrators through web portal

**Positive Test Case:**

```
Test ID: TC-NFR-17-P01
Preconditions: 
  - Admin logged into admin portal
  - Error logs exist
Steps:
  1. Navigate to "Logs & Monitoring" page
  2. View error logs
  3. Verify accessibility and usefulness
Expected Result:
  - Error logs accessible through admin portal
  - Logs displayed in readable format
  - Can view recent errors
  - Can search/filter logs (NFR-17.2)
  - Useful for troubleshooting
Pass Criteria: Admin can access error logs via web portal
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-17-N01
Preconditions: 
  - Non-admin user attempts to access logs
Steps:
  1. Access kiosk (customer interface)
  2. Attempt to navigate to log URLs
Expected Result:
  - Logs not accessible from kiosk
  - Admin authentication required
  - Customer cannot see system logs
  - Security maintained
Pass Criteria: Logs only accessible to authenticated admins
```

---

### NFR-17.1: Log Retention Period

**Given/When/Then:**

- **Given** logs are generated
- **When** managing log retention
- **Then** logs SHALL be retained for 30 days

**Positive Test Case:**

```
Test ID: TC-NFR-17.1-P01
Preconditions: 
  - Log retention policy configured: 30 days
  - Logs exist from various dates
Steps:
  1. Check logs from 29 days ago
  2. Check logs from 31 days ago
  3. Verify retention policy
Expected Result:
  - Logs ≤30 days old: still available
  - Logs >30 days old: automatically deleted
  - Retention policy enforced
  - Old logs purged automatically
Pass Criteria: 30-day retention enforced
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-17.1-N01
Preconditions: 
  - Critical error occurred 35 days ago
  - Admin needs to investigate
Steps:
  1. Attempt to access logs from 35 days ago
  2. Observe availability
Expected Result:
  - Logs deleted (>30 days)
  - Not available in system
  - Recommendation: export/archive critical logs before 30 days
  - 30-day window should be sufficient for most troubleshooting
Pass Criteria: Logs beyond 30 days are not available
```

---

### NFR-17.2: Log Search and Filter

**Given/When/Then:**

- **Given** admin views logs
- **When** searching for specific events
- **Then** logs SHALL be searchable by date, level, component

**Positive Test Case:**

```
Test ID: TC-NFR-17.2-P01
Preconditions: 
  - Admin on Logs page
  - Logs from multiple dates, levels, components exist
Steps:
  1. Filter logs by date range: last 7 days
  2. Filter logs by level: ERROR only
  3. Filter logs by component: PaymentService
  4. Combine filters: ERROR + PaymentService + last 7 days
Expected Result:
  - Date filter works: only logs from last 7 days shown
  - Level filter works: only ERROR logs shown
  - Component filter works: only PaymentService logs shown
  - Combined filters work: only PaymentService errors from last 7 days
  - Search results update immediately
  - Helps admin find specific issues quickly
Pass Criteria: All log filters work correctly
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-17.2-N01
Preconditions: 
  - Searching for logs that don't exist
Steps:
  1. Filter by date range with no logs
  2. Filter by component that never logged errors
Expected Result:
  - Empty result: "No logs found matching filters"
  - Clear message
  - Can adjust filters to find logs
  - No errors from empty results
Pass Criteria: Empty search results handled gracefully
```

---

### NFR-18: Code Quality Standards

**Given/When/Then:**

- **Given** codebase is developed
- **When** reviewing code quality
- **Then** SHALL follow standards: consistent naming (camelCase variables, PascalCase classes), max function length 50 lines, max file length 500 lines, code comments for complex logic, API documentation (OpenAPI/Swagger)

**Positive Test Case:**

```
Test ID: TC-NFR-18-P01
Preconditions: 
  - Source code available
  - Code review tools configured
Steps:
  1. Review code for naming conventions
  2. Measure function lengths
  3. Measure file lengths
  4. Check for comments on complex logic
  5. Verify API documentation exists
Expected Result:
  - Naming conventions:
    - Variables/functions: camelCase (e.g., `productPrice`, `calculateTotal()`)
    - Classes: PascalCase (e.g., `ProductService`, `AdminController`)
  - Functions: ≤50 lines (majority comply, rare exceptions justified)
  - Files: ≤500 lines (majority comply)
  - Complex logic has explanatory comments
  - API documentation generated (Swagger/OpenAPI)
Pass Criteria: Code quality standards generally met
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-18-N01
Test Status: UNTESTABLE - Code Quality Standard
Reason: Code quality standards are enforced through code reviews, linters, and static analysis tools—not functional testing. Standards like "max 50 lines per function" are guidelines, not absolute rules (some functions legitimately need more lines). This is a development practice requirement, not a testable system behavior.
```

---

### NFR-19: Single Kiosk Design (No Multi-Kiosk in v1.0)

**Given/When/Then:**

- **Given** system architecture
- **When** deploying the system
- **Then** system is designed for single kiosk deployment, does NOT require multi-kiosk scalability in v1.0

**Positive Test Case:**

```
Test ID: TC-NFR-19-P01
Preconditions: 
  - Single kiosk deployed
Steps:
  1. Deploy and operate single kiosk
  2. Verify all features work
  3. Review system design
Expected Result:
  - Single kiosk operates perfectly
  - All features functional
  - System optimized for single-kiosk use case
  - No complexity from multi-kiosk coordination
Pass Criteria: Single kiosk deployment works flawlessly
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-19-N01
Test Status: UNTESTABLE - Out of Scope
Reason: Multi-kiosk functionality is explicitly NOT required in v1.0. Testing "multiple kiosks" would be testing a feature that doesn't exist and isn't supposed to exist. This is a scoping requirement, not a testable behavior.
```

---

### NFR-19.1: Architecture for Future Multi-Kiosk (Design Goal)

**Given/When/Then:**

- **Given** system architecture is designed
- **When** planning for future
- **Then** architecture SHOULD be designed to support future multi-kiosk expansion (separation of concerns, stateless API)

**Positive Test Case:**

```
Test ID: TC-NFR-19.1-P01
Test Status: UNTESTABLE - Architectural Guideline
Reason: This is an architectural design principle ("SHOULD be designed"), not a functional requirement. Evaluating "separation of concerns" and "stateless API" requires architecture review, not functional testing. This guides development practices, not testable system behavior.
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-19.1-N01
Test Status: UNTESTABLE - Future Planning
Reason: Cannot test future multi-kiosk support in v1.0 where it doesn't exist. This is a design guideline for developers, not a testable requirement.
```

---

### NFR-20: Future Payment Integration (Design Goal)

**Given/When/Then:**

- **Given** system design
- **When** planning future enhancements
- **Then** system SHOULD be designed to potentially integrate card payment services in future (modular payment adapter pattern)

**Positive Test Case:**

```
Test ID: TC-NFR-20-P01
Test Status: UNTESTABLE - Architectural Guideline
Reason: This requirement is about future extensibility ("SHOULD be designed"), not current functionality. Testing "modular payment adapter pattern" requires code architecture review, not functional testing. This guides development for future features, not v1.0 behavior.
```

**Negative/Edge Case Test:**

```
Test ID: TC-NFR-20-N01
Test Status: UNTESTABLE - Future Planning
Reason: Cannot test future card payment integration that doesn't exist in v1.0. This is a design principle for developers.
```

---

## 4. Untestable Requirements

This section lists requirements that cannot be tested through standard functional test cases, with explanations:

### UNTESTABLE-1: FR-10.3 - JSON Export Deferred to v1.1+

**Requirement:** JSON export format is deferred to v1.1+ (not required for v1.0)

**Why Untestable:**
This requirement explicitly states that JSON export is NOT included in v1.0. Testing "absence of a feature" is documented in positive test cases for related requirements (FR-10.2 confirms only CSV is available). This is a scoping/planning document, not a testable behavior.

**Verification Method:** Review documentation and feature list confirms JSON export is out of scope.

---

### UNTESTABLE-2: FR-11.1.1 - Cart Timeout Configurable in Future

**Requirement:** Cart timeout will be configurable in future versions

**Why Untestable:**
This documents a future enhancement, not current v1.0 behavior. Current behavior (fixed 5-minute timeout) is tested in FR-2.5. The "future configurability" aspect is a roadmap item, not a testable requirement.

**Verification Method:** Product roadmap documentation for v1.1+.

---

### UNTESTABLE-3: FR-12.2 - Pricing Features NOT Required

**Requirement:** System does NOT require discounts, promotional pricing, pricing tiers, time-based pricing, or multiple currencies

**Why Untestable:**
This is a negative requirement (features explicitly excluded). Positive test case confirms these features are absent, but there's no additional "edge case" behavior to test for features that don't exist.

**Verification Method:** Inspection of product management interface confirms absence of these features.

---

### UNTESTABLE-4: FR-12.3 - No Tax Handling Required

**Requirement:** System does NOT require tax handling functionality

**Why Untestable:**
Similar to UNTESTABLE-3, this is a negative requirement. Positive test confirms no tax calculations occur. No additional testable behavior for a feature that doesn't exist.

**Verification Method:** Review checkout flow confirms prices are final with no tax calculation.

---

### UNTESTABLE-5: NFR-2 - Single Concurrent User (By Design)

**Requirement:** System supports one concurrent user (single kiosk)

**Why Untestable:**
This is a physical limitation (one touchscreen = one user at a time). There's no meaningful test for "can two people use one touchscreen simultaneously?" It's an architectural constraint, not a software behavior.

**Verification Method:** System design review confirms single-kiosk architecture.

---

### UNTESTABLE-6: NFR-4.1 - 99% Uptime Target

**Requirement:** Target uptime of 99% during operating hours

**Why Untestable:**
This is a statistical target measured over time (weeks/months), not a specific testable behavior. Uptime is measured through production monitoring tools, not functional test cases.

**Verification Method:** Production monitoring over 30+ days measures actual uptime percentage.

---

### UNTESTABLE-7: NFR-10 - Admin Session Timeout (Duplicate)

**Requirement:** Admin sessions timeout after 30 minutes

**Why Untestable:**
This is a complete duplicate of FR-5.4, which has comprehensive test cases. Rather than create redundant tests, we reference the existing test cases.

**Verification Method:** See FR-5.4 test cases (TC-FR-5.4-P01, TC-FR-5.4-N01, etc.)

---

### UNTESTABLE-8: NFR-11 - GDPR Compliance (Duplicate)

**Requirement:** No personal customer data collected (simplified GDPR compliance)

**Why Untestable:**
Complete duplicate of FR-9.2 with comprehensive test cases already defined.

**Verification Method:** See FR-9.2 test cases (TC-FR-9.2-P01, TC-FR-9.2-N01)

---

### UNTESTABLE-9: NFR-11.1 - Anonymous Transaction Logs (Duplicate)

**Requirement:** Transaction logs are anonymous by design

**Why Untestable:**
Duplicate of FR-9.2 and NFR-11.

**Verification Method:** See FR-9.2 test cases.

---

### UNTESTABLE-10: NFR-16.1 - Log Level Definitions (Duplicate)

**Requirement:** Logging levels defined (ERROR, WARN, INFO, DEBUG)

**Why Untestable:**
Tested comprehensively in NFR-16 test cases.

**Verification Method:** See NFR-16 test cases (TC-NFR-16-P01, TC-NFR-16-N01)

---

### UNTESTABLE-11: NFR-18 - Code Quality Standards

**Requirement:** Code follows naming conventions, max line limits, has comments, API docs

**Why Untestable:**
Code quality standards are enforced through code reviews, linters, and static analysis tools—not functional testing. Standards are guidelines with justified exceptions. This is a development practice, not a testable system behavior.

**Verification Method:** Code review process, linter configuration (ESLint, Prettier), static analysis tools.

---

### UNTESTABLE-12: NFR-19 - Single Kiosk Design

**Requirement:** System designed for single kiosk, not multi-kiosk

**Why Untestable:**
Testing "multi-kiosk functionality" would test a feature that doesn't exist and isn't supposed to exist in v1.0. This is a scoping requirement.

**Verification Method:** System design documentation confirms single-kiosk architecture.

---

### UNTESTABLE-13: NFR-19.1 - Architecture for Future Multi-Kiosk

**Requirement:** Architecture should support future multi-kiosk expansion

**Why Untestable:**
This is an architectural design principle ("SHOULD be designed"), not a functional requirement. Evaluating "separation of concerns" requires architecture review, not functional testing.

**Verification Method:** Architecture review by technical lead/architect evaluates modularity and scalability potential.

---

### UNTESTABLE-14: NFR-20 - Future Payment Integration Design

**Requirement:** System should support future card payment integration

**Why Untestable:**
Similar to UNTESTABLE-13, this is a design guideline for future extensibility. Cannot test future features that don't exist. Testing "modular payment adapter pattern" is an architecture review, not functional testing.

**Verification Method:** Code architecture review confirms payment module is abstracted and extensible.

---

## Summary Statistics

**Total Requirements in SRS:** ~150 (FR) + ~20 (NFR) = ~170 requirements

**Test Cases Created:**

- **Functional Requirements (FR-1 to FR-12):** ~140 test cases (70 positive + 70 negative/edge)
- **Non-Functional Requirements (NFR-1 to NFR-20):** ~40 test cases (20 positive + 20 negative/edge)
- **Untestable Requirements:** 14 documented with explanations

**Total Test Cases:** ~180 test cases
**Untestable Requirements:** 14 (with justifications)

**Test Coverage:** ~92% of requirements have executable test cases

---

## Test Case Naming Convention

**Test ID Format:** `TC-[Requirement ID]-[Type][Number]`

- **TC** = Test Case
- **Requirement ID** = FR-X.Y or NFR-Z
- **Type:**
  - **P** = Positive test case
  - **N** = Negative/Edge case test case
- **Number** = Sequential (01, 02, 03...)

**Examples:**

- `TC-FR-1.1-P01` = Functional Requirement 1.1, Positive test, case #1
- `TC-NFR-15-N02` = Non-Functional Requirement 15, Negative test, case #2

---

## Test Execution Guidelines

### Prerequisites for Testing

1. **Test Environment:**
   - Dedicated test kiosk device (or simulator)
   - Test admin portal instance

- Manual confirmation service test harness or simulator
- Test database (isolated from production)

1. **Test Data:**
   - Sample products (various categories, prices, images)
   - Test admin accounts
   - Mock transaction history

2. **Tools Required:**
   - Browser developer tools (Chrome DevTools, Firefox Developer Edition)
   - Performance measurement tools (Lighthouse, WebPageTest)
   - Accessibility checkers (WAVE, axe DevTools)
   - Contrast checkers (WebAIM Contrast Checker)
   - Network throttling tools
   - Database query tools

### Test Execution Order

1. **Foundation Tests First:**
   - Authentication (FR-5.1, FR-5.2)
   - Basic product display (FR-1.1, FR-1.2)
   - Configuration (FR-11.1)

2. **Core Functionality:**
   - Product management (FR-6.x)
   - Inventory management (FR-8.x)
   - Shopping cart (FR-2.x)
   - Payment flow (FR-3.x)

3. **Advanced Features:**
   - Statistics & reporting (FR-10.x)
   - Admin features (FR-5.3, FR-7.x)

4. **Performance & Usability:**
   - Performance tests (NFR-1.x)
   - Usability tests (NFR-12, NFR-13)

5. **Security & Reliability:**
   - Security tests (NFR-8, NFR-9)
   - Backup & logging (NFR-7, NFR-16)

### Pass/Fail Criteria

- **Pass:** All expected results in test case are met
- **Fail:** Any expected result is not met
- **Blocked:** Cannot execute due to dependency failure
- **Skip:** Test marked as UNTESTABLE with justification

### Bug Reporting

When a test fails, report should include:

- Test Case ID
- Expected Result (from test case)
- Actual Result (what actually happened)
- Steps to Reproduce
- Screenshots/logs
- Environment details (browser, OS, versions)
- Severity (Critical, High, Medium, Low)

---

## Document Approval

**Prepared by:** Quality Assurance Team  
**Date:** 2025-11-12  
**Version:** 1.0  

**Reviewed by:** ___________________________  
**Date:** ___________________________  

**
