# ResiSure Mobile (Expo)

Role-aware React Native app that talks to the same ResiSure API as the web app.

## Features

- Login / register (student or landlord, with terms consent)
- Student: browse with filters, save favorites, book, mock pay, cancel unpaid, confirm/dispute, notifications, profile, transactions
- Landlord: create/edit listings, photos, accept/reject requests, verification upload, released funds, notifications, profile
- Admin: stats, listing verification, disputes, landlords, audit log
- Payments use the development mock provider — not live MTN MoMo or Airtel Money

## Setup

```bash
cd apps/mobile
npm install
```

Set the API URL for your device:

```bash
# Windows PowerShell example
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:5000"   # Android emulator
# or your PC LAN IP for a physical phone
$env:EXPO_PUBLIC_API_URL="http://192.168.1.10:5000"
```

Start Expo:

```bash
npm start
```

Ensure the API is running (`npm run dev` in `apps/api`) and `CORS_ALLOW_ALL=true` in `apps/api/.env`.
###TODO
1. Make the photos be moving as viewer is going through website
2. Mobile view has two browse options
3. Still not able to see uplaoded docs
4. 