# snackbar

Self-Service Snack Bar Kiosk System

## Documentation

This repository contains requirements engineering documentation and automated acceptance tests for a self-service kiosk system.

### Requirements Documentation
- **[User Stories](reqeng/user_stories.md)** - User stories for customer and administrator roles (US-001 to US-068)
- **[Software Requirements Specification](reqeng/Software_Requirements_Specification_v1.2.md)** - Detailed functional and non-functional requirements
- **[Test Cases](reqeng/Test_Cases_v1.1.md)** - Comprehensive test cases for all requirements

### Automated Acceptance Tests
- **[Robot Framework Tests](tests/)** - 160 automated acceptance tests in Robot Framework format across 12 test suites
  - Customer user stories (30 tests): Product browsing, shopping cart, payment/checkout, system status
  - Administrator user stories (100 tests): Authentication, product/category/inventory management, transactions, statistics, system configuration, monitoring
  - System/technical user stories (30 tests): Performance, security, integration, and communication
  - Edge cases, performance, accessibility, and security tests included
  - See [Test Summary](tests/TEST_SUMMARY.md) for details

### Audits & Compliance
- **[Traceability Audit Report](docs/audits/traceability_audit_report.md)** - 100% coverage audit confirming all 68 user stories have corresponding test cases

## Technology Stack
- **Backend**: Node.js 24.11 LTS with Express.js 5.1
- **Frontend**: React 19.2
- **Database**: PostgreSQL 16+
- **Payment**: MobilePay API integration
- **Testing**: Robot Framework with SeleniumLibrary

## Getting Started

### Running Acceptance Tests

```bash
# Install test dependencies
pip install -r tests/requirements.txt

# Run all acceptance tests
robot tests/acceptance/

# Run specific test suite
robot tests/acceptance/customer_product_browsing.robot

# Run by tag (e.g., high-priority tests only)
robot --include high-priority tests/acceptance/
```

See [tests/README.md](tests/README.md) for detailed testing documentation.

## Project Status

- ✅ Requirements documentation complete (v1.2)
- ✅ User stories defined (68 stories)
- ✅ Test cases documented (180+ test cases)
- ✅ Automated acceptance tests created (160 tests across 12 test suites)
- ✅ Traceability audit completed (100% coverage - all 68 user stories covered)
- 🚧 Implementation in progress

## License

This is a student project for educational purposes.
