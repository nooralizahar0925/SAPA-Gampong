# Gampong Blang Digital - Admin Dashboard

React + Vite + TypeScript dashboard for the village office workflow.

## Available now
- Login page
- Token storage
- Protected route guard
- Queue placeholder page

## Local run
```bash
cd dashboard
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`

The dashboard talks to the backend API at `http://localhost:8080/api` unless `VITE_API_BASE_URL` is set.

Production domain:
```bash
VITE_API_BASE_URL=https://gampongblangdigital.com/api
```
