# Test Cases Documentation for Snackbar Kiosk System v1.1  
**Project:** Snackbar Kiosk System  
**Version:** 1.1  
**Date:** 2025-11-12  
  
## Table of Contents  
1. [Functional Requirements](#functional-requirements)  
2. [Non-Functional Requirements](#non-functional-requirements)  
3. [Untestable Requirements](#untestable-requirements)  
  
---  
  
## Functional Requirements  
### FR-1.1  
**Acceptance Criterion:**  
Given the kiosk is operational, When a customer interacts with the system, Then the system should respond adequately.  

#### Positive Test Case  
- **Test ID:** TC-FR-1.1-P  
- **Preconditions:** Kiosk is powered on and operational.  
- **Steps:**  
  1. Approach the kiosk.  
  2. Touch the screen to initiate interaction.  
- **Expected Results:** The kiosk displays the main menu.  

#### Negative Test Case  
- **Test ID:** TC-FR-1.1-N  
- **Preconditions:** Kiosk is malfunctioning.  
- **Steps:**  
  1. Approach the kiosk.  
  2. Attempt to interact with a non-responsive screen.  
- **Expected Results:** Error message is displayed indicating the system is down.  

### FR-12.3  
**Acceptance Criterion:**  
Given a user wants to check order status, When they enter their order ID, Then the system should display the order status.  

...  
  
## Non-Functional Requirements  
### NFR-1  
**Acceptance Criterion:**  
Given peak usage times, When the system is accessed, Then it should maintain stability without crashes.  

#### Positive Test Case  
- **Test ID:** TC-NFR-1-P  
- **Preconditions:** System is under heavy load.  
- **Steps:**  
  1. Simulate 100 simultaneous users accessing the kiosk.  
- **Expected Results:** System remains stable, no crashes occur.  

### NFR-20  
**Acceptance Criterion:**  
Given accessibility measures, When a user with disabilities interacts with the kiosk, Then the system should provide sufficient support.  

...  
  
## Untestable Requirements  
- **Requirement ID:** FR-3.5  
**Explanation:** This requirement involves an external system not under our control, thus cannot be tested.  

---  
This document provides a comprehensive approach to testing the Snackbar Kiosk System according to the SRS v1.1.