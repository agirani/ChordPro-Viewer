import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const USERS_FILE = path.join(__dirname, 'users.json');
const CHORDPRO_DIR = path.join(__dirname, 'chordpro_files');

// In-memory users cache
let users = {};

// -----------------------------
// User Management Functions
// -----------------------------

async function loadUsers() {
  try {
    if (fsSync.existsSync(USERS_FILE)) {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error loading users:', error);
    return {};
  }
}

async function saveUsers(usersData) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

// -----------------------------
// Login/Auth Endpoints
// -----------------------------

app.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    const trimmedUsername = username?.trim();
    
    // Validate username
    if (!trimmedUsername || trimmedUsername.length < 2 || trimmedUsername.length > 30) {
      return res.status(400).json({
        success: false,
        error: 'Username must be between 2 and 30 characters'
      });
    }
    
    // Check for invalid characters
    const validUsername = /^[a-zA-Z0-9_-]+$/.test(trimmedUsername);
    if (!validUsername) {
      return res.status(400).json({
        success: false,
        error: 'Username can only contain letters, numbers, hyphens, and underscores'
      });
    }
    
    // Store/update user
    const now = new Date().toISOString();
    users[trimmedUsername] = {
      last_login: now,
      created: users[trimmedUsername]?.created || now
    };
    
    // Save to JSON file
    const saved = await saveUsers(users);
    if (saved) {
      return res.json({
        success: true,
        username: trimmedUsername,
        message: 'Login successful'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to save user data'
      });
    }
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/verify', async (req, res) => {
  try {
    const { username } = req.body;
    const trimmedUsername = username?.trim();
    
    if (trimmedUsername && users[trimmedUsername]) {
      // Update last login time
      users[trimmedUsername].last_login = new Date().toISOString();
      await saveUsers(users);
      
      return res.json({
        valid: true,
        username: trimmedUsername
      });
    } else {
      return res.json({
        valid: false
      });
    }
    
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({
      valid: false,
      error: error.message
    });
  }
});

app.get('/users', (req, res) => {
  try {
    const userList = Object.entries(users).map(([username, info]) => ({
      username,
      last_login: info.last_login,
      created: info.created
    }));
    
    // Sort by last login (most recent first)
    userList.sort((a, b) => {
      return new Date(b.last_login) - new Date(a.last_login);
    });
    
    return res.json({
      users: userList,
      count: userList.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

// -----------------------------
// File Management Endpoints
// -----------------------------

app.get('/files', async (req, res) => {
  try {
    // Create directory if it doesn't exist
    if (!fsSync.existsSync(CHORDPRO_DIR)) {
      await fs.mkdir(CHORDPRO_DIR, { recursive: true });
      return res.json([]);
    }
    
    const items = await fs.readdir(CHORDPRO_DIR);
    const files = [];
    
    for (const item of items) {
      const itemPath = path.join(CHORDPRO_DIR, item);
      const stats = await fs.stat(itemPath);
      files.push({
        name: item,
        path: item,
        is_dir: stats.isDirectory()
      });
    }
    
    return res.json(files);
  } catch (error) {
    console.error('List files error:', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

app.get('/file', async (req, res) => {
  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({
        error: 'No file path provided'
      });
    }
    
    // Security: prevent directory traversal
    const safePath = path.basename(filePath);
    const fullPath = path.join(CHORDPRO_DIR, safePath);
    
    // Check if file exists
    if (!fsSync.existsSync(fullPath)) {
      return res.status(404).json({
        error: 'File not found'
      });
    }
    
    const content = await fs.readFile(fullPath, 'utf8');
    
    return res.type('text/plain').send(content);
    
  } catch (error) {
    console.error('Get file error:', error);
    return res.status(500).json({
      error: error.message
    });
  }
});

// -----------------------------
// Health Check
// -----------------------------

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'ChordPro Viewer API',
    users_count: Object.keys(users).length,
    timestamp: new Date().toISOString()
  });
});

// -----------------------------
// Initialize and Start Server
// -----------------------------

async function initializeServer() {
  try {
    // Create chordpro_files directory if it doesn't exist
    if (!fsSync.existsSync(CHORDPRO_DIR)) {
      await fs.mkdir(CHORDPRO_DIR, { recursive: true });
      console.log(`Created directory: ${CHORDPRO_DIR}`);
    }
    
    // Load existing users
    users = await loadUsers();
    console.log(`Loaded ${Object.keys(users).length} users from ${USERS_FILE}`);
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`ChordPro Viewer API running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();