# Development Guide

## Running the Application

There are two ways to run the application:

### Option 1: Development Mode (Recommended for Development)

Run both the backend and frontend dev servers simultaneously:

```bash
npm run dev:full
```

This will:
- Start the Express backend on `http://localhost:3000`
- Start the Vite React dev server on `http://localhost:5173`
- The Vite server will proxy API calls to the backend

**Access the app at: http://localhost:5173**

### Option 2: Production Mode

Build the React app and serve it from the Express server:

```bash
# Build the React app
npm run build

# Start the server
npm start
```

**Access the app at: http://localhost:3000**

## Why the 404 Error Happened

The error occurred because:

1. **The Vite dev server (port 5173)** was trying to access `/auth/login` as a route
2. **The Vite proxy configuration** had a `bypass` that prevented proxying HTML requests
3. **The backend only accepts POST requests** to `/auth/login`, not GET requests

## What Was Fixed

1. ✅ **Removed the proxy bypass** - Now all `/auth/*` and `/profile/*` requests are properly proxied
2. ✅ **Added JSON API support** - Auth routes now support both form POSTs and JSON API calls
3. ✅ **Added session check endpoint** - `GET /auth/session` to check authentication status
4. ✅ **Added build scripts** - Easy commands to build and run in different modes
5. ✅ **Improved server.js** - Better handling of development vs production modes

## Available Scripts

- `npm run dev` - Start backend server only (port 3000)
- `npm run dev:front` - Start frontend dev server only (port 5173)
- `npm run dev:full` - Start both servers concurrently
- `npm run build` - Build React app for production
- `npm start` - Start backend in production mode
