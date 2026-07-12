# Sprint 12 - Billing & Trial Automation Report

## Overview
This sprint introduced a fully automated, hands-free billing and trial lifecycle to Deployly MVP. We implemented a 24-hour free trial, Razorpay payment processing for a flat 30-day Pro Plan, and robust background enforcement of account suspensions.

## Achievements
- **Trial Lifecycle**: Users receive exactly 24 hours of trial access upon registration, followed immediately by a generous 30-minute grace period.
- **Background Enforcement (Cron Job)**: 
  - We implemented an hourly `node-cron` background worker inside `server.js` (`cron/billingCron.js`). 
  - This cron seamlessly suspends users whose trials or paid plans have elapsed, stopping their active PM2 instances and temporarily shifting static assets to a 404 void (`storage/suspended_sites`), fulfilling the requirement of safely retaining files for 30 days without modifying the Nginx setup.
  - Accounts suspended for over 30 days are automatically flagged `eligible_for_deletion = TRUE`.
- **Payment Processing**: 
  - Introduced `/api/billing/upgrade` which generates Razorpay payment links.
  - Introduced `/api/billing/webhook` that cryptographically authenticates incoming payloads from Razorpay, captures the payment entity, immediately resets the `paid_until` date to +30 Days, restores static site directories, and revives PM2 instances automatically.
- **Frontend Dashboard Upgrade**: 
  - The React Dashboard now features a reactive status banner detailing exact hours and minutes remaining for the current billing lifecycle phase.
  - Added new `BillingHistory` page to list transactional audits and a `Support` page for queries.
- **QA Automation**: Delivered `qa_sprint12.js` to mock and validate the chronological flow of trials, grace periods, suspensions, and webhook restorations.

## Documentation
- `BILLING_SETUP.md`
- `RAZORPAY_SETUP.md`
