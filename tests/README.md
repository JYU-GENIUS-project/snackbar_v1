# Robot Framework Acceptance Tests for Snackbar Kiosk System

This directory contains Robot Framework acceptance tests for the Snackbar Self-Service Kiosk System based on the user stories defined in `/reqeng/user_stories.md`.

## Overview

The tests are organized by functional areas and user story categories:

- **customer_product_browsing.robot** - Product browsing and discovery (US-001 to US-005)
- **customer_shopping_cart.robot** - Shopping cart management (US-006 to US-010)
- **customer_payment_checkout.robot** - Payment and checkout (US-011 to US-015)
- **admin_authentication_products.robot** - Admin authentication and product management (US-019 to US-028)
- **admin_inventory_management.robot** - Inventory management (US-032 to US-038)

## Prerequisites

### Install Robot Framework and Dependencies

```bash
# Install Robot Framework
pip install robotframework

# Install Selenium Library for Robot Framework
pip install robotframework-seleniumlibrary

# Install WebDriver for your browser (Chrome example)
# On Mac with Homebrew:
brew install chromedriver

# On Ubuntu/Debian:
sudo apt-get install chromium-chromedriver

# Or download manually from:
# https://sites.google.com/chromium.org/driver/
```

### Configure Test Environment

1. **Set up the application**: Ensure the Snackbar Kiosk application and Admin Portal are running and accessible.

2. **Configure URLs** in `tests/resources/common.robot`:
   ```robot
   ${KIOSK_URL}    http://localhost:3000
   ${ADMIN_URL}    http://localhost:3000/admin
   ```

3. **Configure test credentials** in `tests/resources/common.robot`:
   ```robot
   ${VALID_ADMIN_USERNAME}    admin
   ${VALID_ADMIN_PASSWORD}    SecurePass123!
   ```

## Running Tests

### Run All Tests

```bash
# From the repository root
robot tests/acceptance/

# Or from the tests directory
cd tests
robot acceptance/
```

### Run Specific Test Suite

```bash
# Run only customer product browsing tests
robot tests/acceptance/customer_product_browsing.robot

# Run only admin tests
robot tests/acceptance/admin_authentication_products.robot
```

### Run Tests by Tag

```bash
# Run all high-priority tests
robot --include high-priority tests/acceptance/

# Run all customer tests
robot --include customer tests/acceptance/

# Run all admin tests
robot --include admin tests/acceptance/

# Run specific user story
robot --include US-001 tests/acceptance/

# Run multiple tags
robot --include customerANDproduct-browsing tests/acceptance/
```

### Run Tests with Custom Browser

```bash
# Use Firefox instead of Chrome
robot --variable BROWSER:Firefox tests/acceptance/

# Use headless Chrome
robot --variable BROWSER:headlesschrome tests/acceptance/
```

### Generate Test Reports

Robot Framework automatically generates three files after test execution:

- **report.html** - High-level test execution report
- **log.html** - Detailed execution log with keywords and screenshots
- **output.xml** - Machine-readable test results

```bash
# Custom output directory
robot --outputdir results tests/acceptance/

# Custom report names
robot --report my_report.html --log my_log.html tests/acceptance/
```

## Test Structure

### Gherkin-Style Test Cases

Tests are written in Gherkin-style (Given-When-Then) for readability:

```robot
*** Test Cases ***
US-001: View Products In Grid Layout
    [Documentation]    As a customer, I want to view all products in a grid layout...
    [Tags]    US-001    grid-layout    product-display
    
    Given the kiosk is operational
    When the customer views the home screen
    Then products should be displayed in a grid layout
    And each product should show an image
    And each product should show a name
    And each product should show a price
```

### Resource Files

**common.robot** contains:
- Common keywords used across all test suites
- Shared variables (URLs, credentials, timeouts)
- Helper functions for verification and interaction

### Test Data

Sample test data files are located in `/tests/data/`:
- `test_product.jpg` - Sample product image for testing uploads
- `large_test_image.jpg` - Large image for testing optimization

## Test Coverage

### High-Priority User Stories Covered

#### Customer Stories (Kiosk Interface)
- **US-001 to US-005**: Product browsing and discovery
- **US-006 to US-010**: Shopping cart management
- **US-011 to US-015**: Payment and checkout

#### Administrator Stories (Admin Portal)
- **US-019 to US-020**: Authentication and session management
- **US-023 to US-028**: Product management
- **US-032 to US-038**: Inventory management

### Total Test Cases

- **25+ acceptance test cases** covering high-priority user stories
- **Edge cases** included for critical scenarios
- **Performance tests** for QR code generation and real-time updates
- **Security tests** for authentication and session management

## Continuous Integration

### Example GitHub Actions Workflow

```yaml
name: Robot Framework Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        pip install robotframework robotframework-seleniumlibrary
        sudo apt-get install chromium-chromedriver
    
    - name: Start application
      run: |
        # Start your application here
        npm install && npm start &
        sleep 10
    
    - name: Run Robot Framework tests
      run: |
        robot --outputdir results tests/acceptance/
    
    - name: Upload test results
      uses: actions/upload-artifact@v2
      if: always()
      with:
        name: robot-results
        path: results/
```

## Best Practices

### 1. Test Independence
Each test should be independent and not rely on the execution order or state from other tests.

### 2. Use Tags Effectively
Tag tests by:
- User story ID (US-001, US-002, etc.)
- Functional area (customer, admin, payment, etc.)
- Priority (high-priority, medium-priority, etc.)
- Test type (edge-case, performance, security, etc.)

### 3. Page Object Pattern
For larger test suites, consider implementing the Page Object pattern to separate test logic from UI locators.

### 4. Wait Strategies
- Use explicit waits (`Wait Until Element Is Visible`) instead of fixed sleeps
- Set appropriate timeouts based on expected response times

### 5. Error Handling
- Include negative test cases to verify error handling
- Test edge cases and boundary conditions

## Troubleshooting

### Common Issues

1. **WebDriver Not Found**
   ```
   Solution: Install ChromeDriver and ensure it's in your PATH
   brew install chromedriver  # Mac
   sudo apt-get install chromium-chromedriver  # Linux
   ```

2. **Element Not Found**
   ```
   Solution: Check that element IDs match the actual application
   Use browser dev tools to inspect elements
   ```

3. **Timeout Errors**
   ```
   Solution: Increase timeout values in common.robot
   ${SELENIUM_TIMEOUT}    20s
   ```

4. **Browser Window Issues**
   ```
   Solution: Run in headless mode or maximize window
   robot --variable BROWSER:headlesschrome tests/acceptance/
   ```

### Debug Mode

Run tests with verbose logging:

```bash
robot --loglevel DEBUG tests/acceptance/customer_product_browsing.robot
```

## Contributing

When adding new tests:

1. Follow the existing structure and naming conventions
2. Use Gherkin-style keywords (Given-When-Then)
3. Add appropriate tags for filtering
4. Include documentation strings
5. Add both positive and edge case tests
6. Update this README if adding new test suites

## References

- [Robot Framework User Guide](https://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html)
- [SeleniumLibrary Documentation](https://robotframework.org/SeleniumLibrary/SeleniumLibrary.html)
- [User Stories Documentation](../reqeng/user_stories.md)
- [Test Cases Documentation](../reqeng/Test_Cases_v1.1.md)
- [Software Requirements Specification](../reqeng/Software_Requirements_Specification_v1.2.md)

## License

This test suite is part of the Snackbar Kiosk System project.
