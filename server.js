const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8080;
const ROOT_DIR = __dirname;
const CONFIG_FILE = path.join(ROOT_DIR, 'config.json');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password';

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Practical security + cache headers for this scroll-video landing page.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );

  // HTML/API/config should update immediately. Static assets can still be cache-busted in URLs.
  if (
    req.path === '/' ||
    req.path.endsWith('.html') ||
    req.path === '/api/config' ||
    req.path.endsWith('.json')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  next();
});

function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, encoded] = authHeader.split(' ');

  if (scheme !== 'Basic' || !encoded) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Authentication required');
  }

  let user = '';
  let pass = '';
  try {
    [user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
  } catch (error) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Authentication required');
  }

  if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return next();

  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
  return res.status(401).send('Authentication required');
}

// Protect admin pages before static serving.
app.get('/admin', basicAuth, (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'admin.html'));
});
app.get('/admin.html', basicAuth, (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'admin.html'));
});

app.use(express.static(ROOT_DIR, {
  etag: true,
  maxAge: '1h',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }
}));

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, ROOT_DIR);
  },
  filename(req, file, cb) {
    const pageId = req.query.page || 'default';
    if (pageId === 'default') return cb(null, 'mp_.mp4');

    const cleanPageId = String(pageId).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `video_${cleanPageId}.mp4`);
  }
});

function fileFilter(req, file, cb) {
  const isMp4 = file.mimetype === 'video/mp4' || file.originalname.toLowerCase().endsWith('.mp4');
  if (!isMp4) return cb(new Error('Only MP4 video files are allowed!'), false);
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

app.get('/api/config', (req, res) => {
  fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read config file' });

    try {
      res.json(JSON.parse(data));
    } catch (parseErr) {
      res.status(500).json({ error: 'Config file format is invalid' });
    }
  });
});

app.post('/api/config', basicAuth, (req, res) => {
  const newConfig = req.body;
  if (!newConfig || typeof newConfig !== 'object' || !newConfig.pages) {
    return res.status(400).json({ error: 'Invalid configuration payload' });
  }

  fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ error: 'Failed to write config file' });
    res.json({ success: true, message: 'Settings saved successfully' });
  });
});

app.post('/api/upload-video', basicAuth, (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No video file received' });

    res.json({
      success: true,
      message: 'Video uploaded and replaced successfully',
      filename: req.file.filename
    });
  });
});

app.listen(PORT, () => {
  console.log('=================================================');
  console.log(`  Server running on port ${PORT}`);
  console.log(`  Landing Page:    http://localhost:${PORT}/`);
  console.log(`  Admin Dashboard: http://localhost:${PORT}/admin`);
  if (ADMIN_PASSWORD === 'change-this-password') {
    console.log('  WARNING: set ADMIN_USER and ADMIN_PASSWORD before public deployment.');
  }
  console.log('=================================================');
});
