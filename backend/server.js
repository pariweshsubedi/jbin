import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { nanoid } from 'nanoid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbOperations } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust first proxy (needed for correct rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Server configuration
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Security configuration
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY;
const RECAPTCHA_MIN_SCORE = parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5;
const CSP_EXTRA_SCRIPT_SRC = process.env.CSP_EXTRA_SCRIPT_SRC?.split(',').filter(Boolean) || [];
const CSP_EXTRA_STYLE_SRC = process.env.CSP_EXTRA_STYLE_SRC?.split(',').filter(Boolean) || [];
const CSP_EXTRA_WORKER_SRC = process.env.CSP_EXTRA_WORKER_SRC?.split(',').filter(Boolean) || [];
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',').filter(Boolean) || null; // null = allow all

// Analytics configuration (public - served to frontend)
const UMAMI_URL = process.env.UMAMI_URL;
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100;
const CREATE_LIMIT_WINDOW_MS = parseInt(process.env.CREATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000; // 1 hour
const CREATE_LIMIT_MAX = parseInt(process.env.CREATE_LIMIT_MAX) || 30;

// Blob configuration
const JSON_SIZE_LIMIT = process.env.JSON_SIZE_LIMIT || '10mb';
const BLOB_ID_LENGTH = parseInt(process.env.BLOB_ID_LENGTH) || 10;

// Validate nanoid format (alphanumeric + _-)
const isValidId = (id) => new RegExp(`^[A-Za-z0-9_-]{${BLOB_ID_LENGTH}}$`).test(id);

async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) return { success: true };

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });
    const data = await response.json();
    return {
      success: data.success && data.score >= RECAPTCHA_MIN_SCORE,
      score: data.score,
    };
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error.message);
    return { success: false };
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com", ...CSP_EXTRA_SCRIPT_SRC],
      frameSrc: ["https://www.google.com"],
      connectSrc: ["'self'", ...CSP_EXTRA_SCRIPT_SRC],
      styleSrc: ["'self'", "'unsafe-inline'", ...CSP_EXTRA_STYLE_SRC],
      workerSrc: ["'self'", "blob:", ...CSP_EXTRA_WORKER_SRC],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors(CORS_ORIGINS ? { origin: CORS_ORIGINS } : {}));
app.use(express.json({ limit: JSON_SIZE_LIMIT }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const createLimiter = rateLimit({
  windowMs: CREATE_LIMIT_WINDOW_MS,
  max: CREATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many pastes created, please try again later' },
});

app.use('/api/', apiLimiter);

// Ensure data directory exists (for SQLite database file)
await fs.mkdir(DATA_DIR, { recursive: true });

// Serve frontend static files if they exist (for combined deployment)
const FRONTEND_DIR = path.join(__dirname, 'public');
try {
  await fs.access(FRONTEND_DIR);
  app.use(express.static(FRONTEND_DIR));
  console.log('Serving frontend from', FRONTEND_DIR);
} catch {
  console.log('No frontend files found - API only mode');
}

// Create a new JSON blob
app.post('/api/blobs', createLimiter, async (req, res) => {
  try {
    const { json, recaptchaToken } = req.body;

    // Verify reCAPTCHA if configured
    if (RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return res.status(400).json({ error: 'reCAPTCHA verification required' });
      }
      const verification = await verifyRecaptcha(recaptchaToken);
      if (!verification.success) {
        return res.status(403).json({ error: 'reCAPTCHA verification failed' });
      }
    }

    if (!json) {
      return res.status(400).json({ error: 'JSON content is required' });
    }

    // Validate JSON
    try {
      JSON.parse(JSON.stringify(json));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }

    // Generate unique ID
    const id = nanoid(BLOB_ID_LENGTH);

    // Save to database
    dbOperations.createBlob(id, json);

    res.status(201).json({
      id,
      url: `${req.protocol}://${req.get('host')}/api/blobs/${id}`
    });
  } catch (error) {
    console.error('Error creating blob:', error);
    res.status(500).json({ error: 'Failed to create blob' });
  }
});

// Retrieve a JSON blob by ID
app.get('/api/blobs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid blob ID format' });
    }

    // Get from database
    const blob = dbOperations.getBlob(id);

    if (!blob) {
      return res.status(404).json({ error: 'Blob not found' });
    }

    res.json(blob);
  } catch (error) {
    console.error('Error retrieving blob:', error);
    res.status(500).json({ error: 'Failed to retrieve blob' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public configuration endpoint (for frontend runtime config)
app.get('/api/config', (req, res) => {
  res.json({
    analytics: {
      umami: UMAMI_URL && UMAMI_WEBSITE_ID ? {
        url: UMAMI_URL,
        websiteId: UMAMI_WEBSITE_ID,
      } : null,
    },
    recaptcha: RECAPTCHA_SITE_KEY ? {
      siteKey: RECAPTCHA_SITE_KEY,
    } : null,
  });
});

// Serve frontend for all non-API routes (SPA routing)
// This must be the last route, after all API routes
app.use(async (req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Try to serve index.html for frontend routing
  try {
    const indexPath = path.join(FRONTEND_DIR, 'index.html');
    await fs.access(indexPath);
    res.sendFile(indexPath);
  } catch {
    // No frontend, return 404
    res.status(404).json({ error: 'Not found' });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  dbOperations.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  dbOperations.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
