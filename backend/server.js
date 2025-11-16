import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbOperations } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists (for SQLite database file)
await fs.mkdir(DATA_DIR, { recursive: true });

// Create a new JSON blob
app.post('/api/blobs', async (req, res) => {
  try {
    const { json } = req.body;

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
    const id = nanoid(10);

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
