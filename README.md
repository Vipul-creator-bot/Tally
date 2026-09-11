# Khurana Kitchenware — Tally Integration Middleware

Node.js REST API sitting between the website and TallyPrime.

## ⚠️ Before deploying — read this first

This server must be able to reach a running TallyPrime instance over
HTTP (`TALLY_URL` in `.env`). Tally is NOT a background service — it
has to be open, with the correct company loaded, on whatever machine
`TALLY_URL` points to, for the entire time this API is expected to work.

If Tally is running on a developer's laptop and this server is deployed
elsewhere, "localhost" will NOT reach it — a VPN/tunnel between the two
is required, or Tally needs to run somewhere network-reachable from
this server.

## Setup

```bash
npm install
cp .env.example .env
```
Edit `.env` — at minimum set `TALLY_URL`, `TALLY_COMPANY`, and `API_KEY`
(generate a real random key, don't leave the placeholder).

```bash
npm start
```

## Authentication

Every `/api/v1/*` endpoint requires a header: