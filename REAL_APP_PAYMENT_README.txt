
RAZORPAY PAYMENT INTEGRATION (what I added)

1) Server endpoint added: POST /payments/create_link
   - Request body: { amount: <number in INR>, customer: {name, phone, email?}, description? }
   - Response: { ok:true, url: '<razorpay_short_url>', raw: { ... } }

2) How it works (quick):
   - Mobile calls backend /payments/create_link with amount & customer.
   - Backend creates a Razorpay Payment Link using your Razorpay key & secret and returns a short URL.
   - Mobile opens the short_url (Linking.openURL) so user completes payment in browser / UPI apps.
   - After payment, you can check webhook or manually check order status in admin panel (/admin).

3) Setup steps:
   a) Create Razorpay account and get KEY_ID and KEY_SECRET.
   b) In api_server_node root, create a .env and set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
   c) Start the server (npm install; npm start)
   d) From mobile app (CheckoutScreen) after placing order, call /payments/create_link to get payment URL and open it.

4) Admin panel added at: http://<your-server>/admin
   - Lists orders and allows status update (requires admin pin prompt).

5) Notes & Next steps:
   - For production, configure Webhooks in Razorpay dashboard and implement /payments/webhook to verify payments and update order status automatically.
   - For a first release, Payment Links is easiest because you don't need to integrate native SDKs or EAS builds.
   - Push notifications (FCM) and SMS (MSG91/Twilio) remain to be configured; I can add detailed steps if you want.
