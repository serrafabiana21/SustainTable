# supplier-restaurant-layer

Monorepo MVP for a supplier/restaurant product verification flow.

## Requirements
- Node.js 18+
- npm

## Setup
```bash
npm install
```

## Run
```bash
npm run dev
```

This starts:
- API server on http://localhost:4000
- Client on http://localhost:5173

## Demo Users
- supplier1@example.com / password (role SUPPLIER)
- restaurant1@example.com / password (role RESTAURANT)

## Project Structure
- `server/` Express + SQLite API
- `client/` Vite + React + Tailwind UI
