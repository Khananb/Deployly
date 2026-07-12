# Razorpay Integration Setup

Deployly uses Razorpay to process payments for the 30-Day Pro Plan. 

## 1. Create a Razorpay Account
- Go to [Razorpay](https://razorpay.com/) and create a merchant account.
- Complete the KYC process to enable Live Mode.

## 2. Generate API Keys
1. Navigate to **Settings > API Keys** in the Razorpay Dashboard.
2. Click **Generate Key**.
3. Copy the `Key Id` and `Key Secret`.
4. Add them to your `backend/.env` file:
```env
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

## 3. Configure Webhooks
Webhooks are essential to activate user accounts automatically after a successful payment.

1. Navigate to **Settings > Webhooks** in the Razorpay Dashboard.
2. Click **Add New Webhook**.
3. **Webhook URL**: Enter your production API URL (e.g., `https://api.deployly.online/api/billing/webhook`).
4. **Secret**: Generate a random secure string (e.g., `crypto.randomBytes(32).toString('hex')`).
5. Add the secret to your `backend/.env` file:
```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```
6. **Active Events**: Check the following boxes:
   - `payment.captured`
   - `payment_link.paid`
7. Save the webhook.

## 4. Verification
Once configured, test the flow by running the mock script `qa_sprint12.js` to ensure the cryptographic signature validation succeeds.
