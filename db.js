import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Initialize database with default collections
const initialData = {
  classes: [],
  users: [],
  students: [],
  logs: []
};

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load environment variables from .env file manually if exists
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  } catch (err) {
    console.error('[Database] .env file read error:', err.message);
  }
}

const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_URL;
const GOOGLE_SHEETS_TOKEN = process.env.GOOGLE_SHEETS_TOKEN || 'LGS_TRACKER_SHEETS_SECRET_TOKEN_2026';

let dbCache = { ...initialData };
let lastWriteTime = 0;

// Helper to write to local backup file
function writeLocalBackup(data) {
  try {
    const tempPath = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
  } catch (err) {
    console.error('[Database] Failed to write local backup:', err.message);
  }
}

// Fetch all data from Google Sheets (returns null on failure)
async function fetchFromGoogleSheets() {
  if (!GOOGLE_SHEETS_URL) return null;
  try {
    const url = `${GOOGLE_SHEETS_URL}?token=${encodeURIComponent(GOOGLE_SHEETS_TOKEN)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.error) {
      throw new Error(data.error);
    }
    return data;
  } catch (err) {
    console.error('[Database] Google Sheets fetch error:', err.message);
    return null;
  }
}

// Post data to Google Sheets (returns boolean for success)
async function postToGoogleSheets(payload) {
  if (!GOOGLE_SHEETS_URL) return false;
  try {
    const url = `${GOOGLE_SHEETS_URL}?token=${encodeURIComponent(GOOGLE_SHEETS_TOKEN)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result && result.error) {
      throw new Error(result.error);
    }
    return true;
  } catch (err) {
    console.error('[Database] Google Sheets post error:', err.message);
    return false;
  }
}

// Initialize database
async function initDb() {
  console.log('[Database] Initializing database module...');

  if (GOOGLE_SHEETS_URL) {
    console.log('[Database] Google Sheets URL configured. Fetching database from Google Sheets...');
    const sheetsData = await fetchFromGoogleSheets();

    if (sheetsData) {
      // Check if Google Sheets is empty (e.g. no students and classes)
      const isEmptySheets = (!sheetsData.classes || sheetsData.classes.length === 0) &&
                            (!sheetsData.students || sheetsData.students.length === 0);

      // If sheets is empty, and we have a local backup file with data, upload it to sheets (migration)
      if (isEmptySheets && fs.existsSync(DB_FILE)) {
        try {
          const localContent = fs.readFileSync(DB_FILE, 'utf-8');
          const localDb = JSON.parse(localContent);
          if (localDb.classes && localDb.classes.length > 0) {
            console.log('[Database] Empty Google Sheets detected. Migrating local database to Google Sheets...');
            const success = await postToGoogleSheets({ action: 'bulkUpload', db: localDb });
            if (success) {
              dbCache = localDb;
              console.log('[Database] Migration successful! Data uploaded to Google Sheets.');
              return;
            }
          }
        } catch (err) {
          console.error('[Database] Local database migration failed:', err.message);
        }
      }

      // Normal path: use sheets data
      dbCache = {
        classes: sheetsData.classes || [],
        users: sheetsData.users || [],
        students: sheetsData.students || [],
        logs: sheetsData.logs || []
      };
      writeLocalBackup(dbCache);
      console.log('[Database] Successfully synchronized with Google Sheets.');
    } else {
      console.warn('[Database] Google Sheets connection failed. Falling back to local JSON database backup.');
      loadLocalDb();
    }
  } else {
    console.log('[Database] Google Sheets URL is not configured. Using local JSON database.');
    loadLocalDb();
  }
}

// Helper to load database from local JSON file
function loadLocalDb() {
  if (!fs.existsSync(DB_FILE)) {
    dbCache = { ...initialData };
    writeLocalBackup(dbCache);
    seedDefaultAdmin();
  } else {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(content);
    } catch (error) {
      console.error('[Database] Local database parse error, recreating empty structure:', error.message);
      dbCache = { ...initialData };
      writeLocalBackup(dbCache);
    }
  }
}

// Seed admin if no users exist
function seedDefaultAdmin() {
  if (!dbCache.users || dbCache.users.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('admin123', salt);
    
    dbCache.users = [{
      id: 'admin-1',
      username: 'admin',
      password: hashedPassword,
      name: 'Sistem Yöneticisi',
      branch: 'Tüm Branşlar',
      role: 'admin',
      classIds: []
    }];
    
    writeLocalBackup(dbCache);
    if (GOOGLE_SHEETS_URL) {
      postToGoogleSheets({ action: 'saveCollection', name: 'users', data: dbCache.users });
    }
    console.log('[Database] Default admin seeded: admin / admin123');
  }
}

// Read database (returns full db structure)
export function readDb() {
  return dbCache;
}

// Read specific collection
export function getCollection(name) {
  return dbCache[name] || [];
}

// Save specific collection
export function saveCollection(name, data) {
  dbCache[name] = data;
  writeLocalBackup(dbCache);
  
  if (GOOGLE_SHEETS_URL) {
    lastWriteTime = Date.now();
    console.log(`[Database] Collection "${name}" updated. Syncing to Google Sheets in background...`);
    // Run in background (do not await)
    postToGoogleSheets({
      action: 'saveCollection',
      name: name,
      data: data
    }).then(success => {
      if (success) {
        console.log(`[Database] Background sync to Google Sheets succeeded for "${name}".`);
      } else {
        console.error(`[Database] Background sync to Google Sheets FAILED for "${name}".`);
      }
    });
  }
}

// Background sync from Google Sheets (Runs every 15 seconds to pull remote changes)
if (GOOGLE_SHEETS_URL) {
  setInterval(async () => {
    // Only fetch remote changes if we haven't written anything locally in the last 10 seconds
    if (Date.now() - lastWriteTime > 10000) {
      const sheetsData = await fetchFromGoogleSheets();
      if (sheetsData) {
        dbCache = {
          classes: sheetsData.classes || [],
          users: sheetsData.users || [],
          students: sheetsData.students || [],
          logs: sheetsData.logs || []
        };
        writeLocalBackup(dbCache);
        console.log('[Database] Background sync: Successfully pulled latest remote changes.');
      }
    }
  }, 15000);
}

// Run initial check and seeding (Top-level await to block server startup until ready)
await initDb();
seedDefaultAdmin();
