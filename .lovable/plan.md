## UPI Scanner Payment Flow

### 1. Database Migration
- Add a `upi_orders` table to track manual UPI payments (customer details, product, screenshot URL, status: pending/approved/rejected)
- Store UPI QR image URL and UPI ID in existing `settings` table

### 2. Admin Settings
- Add "UPI Settings" section in Settings tab: upload QR code image + UPI ID text field

### 3. New Page: `/pay-upi`
- Product selection (with URL pre-select support like WhatsApp order page)
- Customer details form (name, email, phone)
- Display the static UPI QR code from admin settings
- Show amount to pay
- Optional screenshot upload
- Submit button → creates entry in `upi_orders` table → sends Telegram alert to admin

### 4. Admin: UPI Orders Tab
- List of pending UPI orders with customer details, product, amount, screenshot (if uploaded)
- Approve button → triggers the same `process-order-delivery` pipeline (creates order, order items, sends emails/WhatsApp)
- Reject button → marks as rejected

### 5. Flow
Customer scans QR → pays in their UPI app → optionally uploads screenshot → submits → Admin gets Telegram alert → Admin verifies payment in bank app → clicks Approve → Customer receives download links via email/WhatsApp

Shall I proceed?