# Security Specification: Price Alert App

## Data Invariants
1. A PriceAlert MUST belong to the user with the matching userId in its path.
2. An alert cannot be updated by anyone other than the owner.

## The "Dirty Dozen" Payloads (Conceptual Rejections)
1. List all alerts for any user. (Should fail)
2. Create an alert in another user's path. (Should fail)
3. Update trigger value for an alert belonging to other user. (Should fail)
4. Create an alert with an invalid condition. (Should fail)
5. Delete an alert belonging to other user. (Should fail)
6. Write a stock symbol to an alert that is > 128 chars. (Should fail)
7. Update alert with a junk-character ID. (Should fail)
8. Update an alert and modify its document ID path using a malicious string. (Should fail)
9. Update an alert field that is not in the allowlist. (Should fail)
10. Attempt to overwrite a system-only field (if any). (Should fail)
11. Update an alert with an invalid type (number in a string field). (Should fail)
12. Update an alert with a negative valuation (if violation). (Should fail)
