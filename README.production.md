# API Server - Production Hardening

## Quick start (Docker)
```bash
docker compose up --build -d
# API at http://localhost:4000
```

## Environment
- `PORT` (default 4000)
- `ADMIN_PIN` admin actions
- `BUSINESS_NAME`, `UPI_ID`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (mandatory for payment links)
- `RAZORPAY_WEBHOOK_SECRET` (recommended for webhook)
- Persisted data: volume `/app/data` mounts `data/db.json`

## Security
- Adds `helmet` and rate limiting
- CORS restrict via `CORS_ORIGIN` (optional)

## Webhooks
- Payment Link callback: `GET /payments/webhook`
- Razorpay event webhook: `POST /payments/razorpay-webhook` with `x-razorpay-signature`