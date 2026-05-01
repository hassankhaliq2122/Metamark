# MetaMark

A high-end SaaS visual feedback tool for collaborating on web designs.

## Structure

- `/frontend`: React + Vite app
- `/backend`: Node.js + Express API

## Setup

1. Clone the repository
2. Run `npm run install:all` from the root
3. Create `.env` files in both `frontend/` and `backend/` (see `.env.example`)
4. Run `npm run dev` to start both servers

## Deployment

The app is set up for easy deployment on platforms like **Render**, **Railway**, or **Heroku**.

### Single-Server Deployment (Recommended)

1.  Set your environment variables in the hosting provider's dashboard:
    *   `MONGODB_URI`
    *   `GEMINI_API_KEY`
    *   `NODE_ENV=production`
2.  Set the **Build Command**: `npm run build`
3.  Set the **Start Command**: `npm start`

The backend is configured to serve the frontend static files automatically when `NODE_ENV=production`.

### Manual Build

To build manually for production:
```bash
npm run build
```
The output will be in `frontend/dist` and `backend/dist`.
