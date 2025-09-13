
# Sharma Tiffin — Mobile App (Expo)

## Quick start
1. Install Node.js LTS.
2. `npm i -g expo`
3. `cd mobile_app_expo && npm install`
4. Start API first (see `../api_server_node/README.md`) then: `npm run start`

## Notes
- API base is `http://localhost:4000` (change in `src/App.js` if running on device: use your LAN IP).
- UPI payment uses intent link to `prince190992-1@okicici`. Customers pick their UPI app (GPay/PhonePe/Paytm) after intent opens.
- Delivery fee uses distance entered by user for now; can be replaced with Google Maps distance later.
