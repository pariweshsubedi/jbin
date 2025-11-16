# JBin

A simple web application for pasting, formatting, and sharing JSON data with others via shareable links.

## Features

- JSON editor with syntax validation
- Format/Minify JSON instantly
- Generate shareable links
- Copy & Download options

## Quick Start

### Local Development

**Backend:**
```bash
cd backend
npm install
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`

### Deploy to CapRover

```bash
npm run deploy
```

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Storage**: SQLite

## API Endpoints

- `POST /api/blobs` - Create a JSON blob
- `GET /api/blobs/:id` - Retrieve a JSON blob
- `GET /api/health` - Health check

## License

MIT
