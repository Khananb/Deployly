# Billing Lifecycle Setup

This document describes the automated billing and trial lifecycle built into Deployly.

## 1. Automated Trial & Grace Period
When a user signs up, the `authService` automatically allocates a 24-hour free trial (`trial_start_at` and `trial_end_at`). 

Once the 24 hours expire, the user enters a **30-Minute Grace Period**. During this phase, their websites remain completely functional.

## 2. Suspension Enforcement (Cron)
A background process runs every hour (`cron/billingCron.js`). This script handles automated suspension logic:
- **Grace to Suspended**: If the 30-minute grace period ends without payment, the user's status becomes `suspended`. 
- **Active Paid to Suspended**: If a 30-day paid plan expires (`paid_until < NOW()`), the user is similarly suspended.

**Suspension Mechanism:**
To ensure zero reliance on modifying Nginx rules dynamically:
1. **Node Websites**: The Cron script elegantly shuts down active PM2 processes linked to the suspended user.
2. **Static Websites**: The user's `storage/sites/{userId}` directories are moved to `storage/suspended_sites/{userId}`. This instantly results in a 404 for Nginx, taking the site offline while preserving the file integrity.

## 3. Data Retention & Deletion
Deployly does not aggressively delete websites. When a user is suspended for more than 30 consecutive days, the cron job marks the user as `eligible_for_deletion = TRUE`. A separate script (to be implemented) will handle absolute data wiping.

## 4. Account Restoration
When a successful webhook hits `/api/billing/webhook`, the backend instantly:
1. Grants 30 days of `paid_until`.
2. Restores static websites by renaming the folder back to `storage/sites`.
3. Re-spawns PM2 processes for Node applications.
