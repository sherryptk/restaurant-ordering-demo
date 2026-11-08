# Restaurant Ordering Platform (demo)

A full online-ordering system for a multi-branch restaurant: a bilingual (English/Arabic) customer site for delivery and pickup, and an admin dashboard for running the kitchen, branches, staff and cash.

I built it for a café in Alexandria, Egypt. This repository is a cleaned-up copy for my portfolio: the restaurant's name, branding, photos, menu and payment details have been replaced with a fictional **Demo Café** and sample data.

## What it does

**For customers**
- Menu with categories, item options (required / multi-select, with price changes), combo deals, offers and favorites
- Delivery or pickup, with branch selection, opening hours and "currently closed" handling
- Delivery addresses on Google Maps, checked against each branch's delivery-zone polygons for fees and minimums
- Checkout with cash, card through Paymob or Kashier, or InstaPay bank transfer with proof-of-payment upload
- Live order status over WebSockets, plus email confirmations and updates
- Google sign-in or guest checkout; English and Arabic with full right-to-left layout

**For the restaurant**
- Live order board with new-order alerts (WebSockets + Telegram notifications) and printable kitchen tickets
- Menu, branch, combo and promo-code management, with per-branch availability and pricing
- Roles for admins, operators and drivers, including a driver portal
- Cash drawer with denomination counts, a ledger, monthly sales summaries, and employee timesheets

## Stack

| | |
| --- | --- |
| **Backend** (`backend/`) | Ruby on Rails 7.1 API, PostgreSQL, Redis, Sidekiq, Action Cable, Devise + JWT, OmniAuth (Google), Active Storage (S3-compatible) |
| **Frontend** (`frontend/`) | React 19, Vite, Material UI, Redux Toolkit, react-i18next, Google Maps |
| **Integrations** | Paymob, Kashier, Resend (email), Telegram Bot API |

Payment providers sit behind a small adapter interface (`backend/app/services/payments/`), so the restaurant can switch gateways from the admin settings without code changes.

## Running it locally

**Backend** — needs Ruby 3.3, PostgreSQL and Redis.

```bash
cd backend
bundle install
EDITOR=true bin/rails credentials:edit   # creates a fresh master key and secret_key_base
bin/rails db:setup                       # creates the database, loads the schema and the Demo Café seed data
bin/rails server                         # API on http://localhost:3000
bundle exec sidekiq                      # background jobs (emails, notifications), in another terminal
```

Demo admin login: `admin@example.com` / `password123`.

**Frontend** — needs Node 20+.

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:3000 npm run dev   # http://localhost:5173
```

Optional environment variables enable the integrations: `VITE_GOOGLE_MAPS_API_KEY` (frontend); `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`, and the `CLOUDFLARE_R2_*` storage keys (backend). Payment gateway keys are entered per restaurant in the admin settings.

## License

MIT
