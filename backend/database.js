import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file location (configurable via env var)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'jbin.db');

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// Initialize database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create blobs table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS blobs (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`;

db.exec(createTableQuery);

// Create index on created_at for potential future queries
db.exec('CREATE INDEX IF NOT EXISTS idx_created_at ON blobs(created_at)');

// Prepared statements for better performance
const insertBlob = db.prepare(`
  INSERT INTO blobs (id, json, created_at)
  VALUES (?, ?, ?)
`);

const getBlobById = db.prepare(`
  SELECT id, json, created_at
  FROM blobs
  WHERE id = ?
`);

const deleteBlob = db.prepare(`
  DELETE FROM blobs
  WHERE id = ?
`);

const getAllBlobs = db.prepare(`
  SELECT id, created_at
  FROM blobs
  ORDER BY created_at DESC
`);

// Database operations
export const dbOperations = {
  /**
   * Create a new blob
   * @param {string} id - Unique identifier
   * @param {object} json - JSON data to store
   * @returns {object} The created blob
   */
  createBlob(id, json) {
    const createdAt = Date.now();
    const jsonString = JSON.stringify(json);

    insertBlob.run(id, jsonString, createdAt);

    return {
      id,
      json,
      createdAt: new Date(createdAt).toISOString()
    };
  },

  /**
   * Get a blob by ID
   * @param {string} id - Blob identifier
   * @returns {object|null} The blob or null if not found
   */
  getBlob(id) {
    const row = getBlobById.get(id);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      json: JSON.parse(row.json),
      createdAt: new Date(row.created_at).toISOString()
    };
  },

  /**
   * Delete a blob by ID
   * @param {string} id - Blob identifier
   * @returns {boolean} True if deleted, false if not found
   */
  deleteBlob(id) {
    const result = deleteBlob.run(id);
    return result.changes > 0;
  },

  /**
   * Get all blobs (metadata only)
   * @returns {array} Array of blob metadata
   */
  getAllBlobs() {
    const rows = getAllBlobs.all();
    return rows.map(row => ({
      id: row.id,
      createdAt: new Date(row.created_at).toISOString()
    }));
  },

  /**
   * Close database connection
   */
  close() {
    db.close();
  }
};

export default db;
