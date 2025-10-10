import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.get("/", (req, res) => {
  res.send("ChordPro Viewer backend is running ✅");
});

// ===== Configuration =====
const BASE_DIR = path.join(__dirname, "songs"); // Directory of ChordPro files
if (!fs.existsSync(BASE_DIR))  
{
  fs.mkdirSync(BASE_DIR, { recursive: true });
  console.log("Created ${BASE_DIR} directory");
}
// ===== Serve static web files =====
app.use(express.static(path.join(__dirname, "public")));

// ===== Directory listing API =====
app.get("/files", (req, res) => {
  console.log("GET /files request received");
  const relPath = req.query.path || "";
  const fullPath = path.join(BASE_DIR, relPath);
  console.log('Resolved path: ${fullPath}');

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    return res.status(400).json({ error: "Not a directory" });
  }

  const items = fs.readdirSync(fullPath).map((name) => {
    const stat = fs.statSync(path.join(fullPath, name));
    return {
      name,
      is_dir: stat.isDirectory(),
      path: path.join(relPath, name).replace(/\\/g, "/"),
    };
  });

  res.json(items);
});

// ===== File retrieval API =====
app.get("/file", (req, res) => {
  console.log("GET /file request received");
  const relPath = req.query.path;
  if (!relPath) return res.status(400).json({ error: "Missing path" });

  const fullPath = path.join(BASE_DIR, relPath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return res.status(404).json({ error: "File not found" });
  }

  res.setHeader("Content-Type", "text/plain");
  fs.createReadStream(fullPath).pipe(res);
});

// ===== Start server =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🎵 Serving files from: ${BASE_DIR}`);
});
