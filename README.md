# Hostel Project

This repository currently contains three related pieces:

- `server.js` + `index.html` + `script.js` + `style.css`
  A legacy RoomSathi app for Nagpur that serves a static frontend from the same Express server.
- `room-finder-backend/`
  A cleaner standalone backend API for rooms. This is now the default backend for the React app.
- `stay-serene-ui/`
  A React + TanStack Start frontend. It fetches rooms from the standalone backend and falls back to local sample data if the API is unavailable.

## Recommended local setup

1. Start MongoDB locally.
2. Start the standalone backend:
   `cd room-finder-backend`
   `npm start`
3. Start the React frontend:
   `cd stay-serene-ui`
   `npm run dev`
4. Optional: start the legacy app:
   `cd ..`
   `npm start`

## Default ports

- Legacy app: `3000`
- Standalone backend: `3001`
- React frontend: Vite default port

## Environment variables

- Legacy backend:
  - `PORT`
  - `MONGODB_URI`
- Standalone backend:
  - `PORT`
  - `MONGODB_URI`
- React frontend:
  - `VITE_API_BASE_URL`

## Useful checks

- Root backend syntax:
  `npm run check`
- Root MongoDB check:
  `npm run test:db`
- Standalone backend syntax:
  `cd room-finder-backend && npm run check`
- React app lint + build:
  `cd stay-serene-ui && npm run check`
