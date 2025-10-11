import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8080;

// ES module: __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for ChordPro files
const BASE_DIR = path.join(__dirname, "songs");
if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });

// app.use(cors({ origin: "https://agirani.github.io" }));
app.use(cors({
  origin: ["https://agirani.github.io", "http://localhost:8080", "null"], // allow GitHub Pages + local
}));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => res.send("ChordPro Viewer Backend is running ✅"));

app.get("/files", (req, res) => {
  const relPath = req.query.path || "";
  const fullPath = path.resolve(BASE_DIR, relPath);
  if (!fullPath.startsWith(BASE_DIR)) return res.status(400).json({ error: "Invalid path" });

  try {
    const items = fs.readdirSync(fullPath).map((name) => {
      const stat = fs.statSync(path.join(fullPath, name));
      return { name, is_dir: stat.isDirectory(), path: path.join(relPath, name).replace(/\\/g, "/") };
    });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read directory" });
  }
});

//app.get("/file/:name", (req, res) => {
//  const fileName = req.params.name;
//  const filePath = path.resolve(BASE_DIR, fileName);
//  if (!filePath.startsWith(BASE_DIR) || !fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
//  res.download(filePath, fileName);
//});

app.get("/file", (req, res) => {
  const relPath = req.query.path || "";
  const filePath = path.resolve(BASE_DIR, relPath);

  if (!filePath.startsWith(BASE_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  console.log("Serving file:", filePath);
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`BASE_DIR: ${BASE_DIR}`);
});
