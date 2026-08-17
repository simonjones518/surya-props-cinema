# Surya Cine Special Props — Hostinger API

Node/Express + MySQL backend that serves exactly the endpoints the frontend calls.

## Deploy on Hostinger

1. Upload the `backend/` folder to your Hostinger Node.js app directory.
2. Create `.env` from `.env.example` and fill in real values (never commit it).
3. `npm install`
4. `npm run migrate` — creates tables and seeds categories.
5. `npm start` (Hostinger's Node app manager runs `npm start` for you).

## Point the frontend at it

Set `VITE_API_BASE_URL` to your API origin, e.g. `https://api.your-domain.com`.
While it is empty the app keeps using built-in mock data.
Add that same origin's frontend URL to `CORS_ORIGIN` in `.env`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | DB connectivity check |
| GET | `/api/categories` | Prop departments |
| GET | `/api/props` | Full inventory |
| GET | `/api/clients` | Production houses |
| GET | `/api/bookings` | Rental pipeline with items |
| GET | `/api/admin/kpi` | Dashboard metrics |
| POST | `/api/bookings` | Create booking (auto-creates client) |
| PATCH | `/api/bookings/:id/status` | Status transition + prop sync |
| POST | `/api/bookings/:id/refund-deposit` | Mark deposit refunded |
| POST | `/api/props` | Add prop to stock |

## Security

DB credentials live only in `.env` on the server. Rotate the MySQL password —
it was shared in chat. Restrict remote MySQL access in hPanel to your app
server's IP, and put the admin write endpoints behind your own auth/proxy
before exposing them publicly.