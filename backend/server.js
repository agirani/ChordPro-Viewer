// server.js
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8080;

// Base directory for ChordPro files
const BASE_DIR = path.join(__dirname, "songs");

// Ensure BASE_DIR exists
try {
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
    console.log("Created BASE_DIR:", BASE_DIR);
  }
} catch (err) {
  console.error("Failed to create BASE_DIR:", err);
  process.exit(1);
}

// Enable CORS for your GitHub Pages frontend
app.use(cors({ origin: "https://agirani.github.io" })); // restrict to your frontend
// For testing from any origin, you can use:
// app.use(cors());

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("ChordPro Viewer Backend is running ✅");
});

// ===== Directory listing API =====
app.get("/files", (req, res) => {
  const relPath = req.query.path || "";
  const fullPath = path.resolve(BASE_DIR, relPath);
  console.log(`Resolved path: ${fullPath}`);

  // Prevent directory traversal
  if (!fullPath.startsWith(BASE_DIR)) {
    console.warn("Attempted access outside BASE_DIR:", fullPath);
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    const items = fs.readdirSync(fullPath).map((name) => {
      const stat = fs.statSync(path.join(fullPath, name));
      return {
        name,
        is_dir: stat.isDirectory(),
        path: path.join(relPath, name).replace(/\\/g, "/"),
      };
    });
    console.log(`Returning ${items.length} items for ${relPath}`);
    res.json(items);
  } catch (err) {
    console.error("Error reading directory:", err);
    res.status(500).json({ error: "Failed to read directory" });
  }
});

// ===== File download API =====
app.get("/file/:name", (req, res) => {
  const fileName = req.params.name;
  const filePath = path.resolve(BASE_DIR, fileName);

  if (!filePath.startsWith(BASE_DIR) || !fs.existsSync(filePath)) {
    console.warn("File not found or invalid:", filePath);
    return res.status(404).json({ error: "File not found" });
  }

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res.status(500).json({ error: "Failed to download file" });
    } else {
      console.log("File sent:", fileName);
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`ChordPro Viewer Backend running on port ${PORT}`);
  console.log(`BASE_DIR: ${BASE_DIR}`);
});
